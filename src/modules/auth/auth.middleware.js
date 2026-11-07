/**
 * Authentication & Authorization (RBAC) Middlewares
 */
const { verifyToken } = require('../../core/security');
const { getDatabase } = require('../../core/database');

function authenticate(req, res, next) {
  const authHeader = req.headers ? (req.headers['authorization'] || req.headers['Authorization']) : null;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.error('Access denied. Authentication token required.', 401);
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = verifyToken(token);
    const db = getDatabase();
    const user = db.prepare('SELECT id, email, name, role, is_active FROM users WHERE id = ?').get(payload.id);

    if (!user) {
      return res.error('User not found or deleted', 401);
    }

    if (!user.is_active) {
      return res.error('User account is deactivated', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    return res.error(`Authentication failed: ${err.message}`, 401);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.error('Authentication required', 401);
    }

    // 'admin' role automatically has superuser privilege across all endpoints
    if (req.user.role === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.error(
        `Forbidden: Role '${req.user.role}' does not have sufficient permission for this resource. Required: [${allowedRoles.join(', ')}]`,
        403
      );
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};

