/**
 * Lightweight, Modular HTTP Router & Middleware Engine
 * Zero dependencies - built on native Node.js HTTP
 */
const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

class Router {
  constructor(options = {}) {
    this.prefix = options.prefix || '';
    this.routes = [];
    this.middlewares = [];
    this.subRouters = [];
    this.staticDir = options.staticDir || null;
  }

  use(...args) {
    if (typeof args[0] === 'string' && (args[1] instanceof Router || typeof args[1] === 'function')) {
      const mountPath = args[0].replace(/\/+$/, '');
      const handler = args[1];
      if (handler instanceof Router) {
        this.subRouters.push({ prefix: mountPath, router: handler });
      } else {
        this.middlewares.push({ prefix: mountPath, fn: handler });
      }
    } else if (typeof args[0] === 'function') {
      this.middlewares.push({ prefix: '', fn: args[0] });
    }
    return this;
  }

  addRoute(method, routePath, ...handlers) {
    const flatHandlers = handlers.flat();
    const handler = flatHandlers.pop();
    const routeMiddlewares = flatHandlers;

    // Convert pattern like /api/patients/:id to regex
    const paramNames = [];
    const regexPattern = routePath
      .replace(/\/+$/, '')
      .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });

    const regex = new RegExp(`^${regexPattern || '/'}/?$`);

    this.routes.push({
      method: method.toUpperCase(),
      path: routePath,
      regex,
      paramNames,
      middlewares: routeMiddlewares,
      handler
    });
    return this;
  }

  get(path, ...handlers) {
    return this.addRoute('GET', path, ...handlers);
  }

  post(path, ...handlers) {
    return this.addRoute('POST', path, ...handlers);
  }

  put(path, ...handlers) {
    return this.addRoute('PUT', path, ...handlers);
  }

  patch(path, ...handlers) {
    return this.addRoute('PATCH', path, ...handlers);
  }

  delete(path, ...handlers) {
    return this.addRoute('DELETE', path, ...handlers);
  }

  async handle(req, res) {
    // Enhance Response with helper methods
    res.json = (data, statusCode = 200) => {
      res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end(JSON.stringify(data));
    };

    res.error = (message, statusCode = 400, details = null) => {
      res.json(
        {
          success: false,
          error: message,
          details
        },
        statusCode
      );
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }

    const host = req.headers ? (req.headers.host || 'localhost') : 'localhost';
    const parsedUrl = new URL(req.url, `http://${host}`);
    req.path = parsedUrl.pathname;
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    req.params = {};

    // Parse JSON body if present
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        req.body = await parseJsonBody(req);
      } catch (err) {
        return res.error('Invalid JSON in request body', 400);
      }
    } else {
      req.body = {};
    }

    // Execute Global Middlewares
    for (const mw of this.middlewares) {
      if (!mw.prefix || req.path.startsWith(mw.prefix)) {
        let middlewareError = null;
        let nextCalled = false;
        await new Promise((resolve, reject) => {
          mw.fn(req, res, (err) => {
            if (err) middlewareError = err;
            nextCalled = true;
            resolve();
          });
        });
        if (middlewareError) {
          logger.error('Middleware error:', middlewareError);
          return res.error(middlewareError.message || 'Internal Server Error', 500);
        }
        if (!nextCalled || res.writableEnded) {
          return;
        }
      }
    }

    // Check SubRouters
    for (const { prefix, router } of this.subRouters) {
      if (req.path.startsWith(prefix)) {
        const subPath = req.path.slice(prefix.length) || '/';
        const originalPath = req.path;
        req.path = subPath;

        const matched = await router.matchAndExecute(req, res);
        req.path = originalPath;
        if (matched) return;
      }
    }

    // Check direct routes
    const matched = await this.matchAndExecute(req, res);
    if (matched) return;

    // Check static files if configured
    if (this.staticDir && req.method === 'GET') {
      const handled = serveStatic(req, res, this.staticDir);
      if (handled) return;
    }

    // 404 handler
    if (req.path.startsWith('/api/')) {
      res.error(`Route ${req.method} ${req.path} not found`, 404);
    } else if (this.staticDir) {
      // SPA Fallback: serve index.html for non-API client routes
      const indexPath = path.join(this.staticDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
      res.error('Page not found', 404);
    } else {
      res.error('Not found', 404);
    }
  }

  async matchAndExecute(req, res) {
    for (const route of this.routes) {
      if (route.method !== req.method) continue;

      const match = req.path.match(route.regex);
      if (match) {
        req.params = {};
        route.paramNames.forEach((name, i) => {
          req.params[name] = decodeURIComponent(match[i + 1]);
        });

        // Run Route Middlewares
        for (const mw of route.middlewares) {
          let nextCalled = false;
          let mwErr = null;
          await new Promise((resolve) => {
            mw(req, res, (err) => {
              if (err) mwErr = err;
              nextCalled = true;
              resolve();
            });
          });
          if (mwErr) {
            res.error(mwErr.message || 'Unauthorized', mwErr.status || 403);
            return true;
          }
          if (!nextCalled || res.writableEnded) {
            return true;
          }
        }

        try {
          await route.handler(req, res);
        } catch (err) {
          logger.error(`Error in route ${req.method} ${req.path}:`, err);
          if (!res.writableEnded) {
            res.error(err.message || 'Internal Server Error', err.status || 500);
          }
        }
        return true;
      }
    }
    return false;
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // 5MB limit
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Request entity too large'));
      }
    });

    req.on('end', () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

function serveStatic(req, res, staticDir) {
  let safePath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const filePath = path.join(staticDir, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  return false;
}

module.exports = Router;
