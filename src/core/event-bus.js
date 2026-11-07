/**
 * In-memory Event Bus for Inter-Module Communication
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.listeners.has(event)) return;
    const filtered = this.listeners.get(event).filter(h => h !== handler);
    this.listeners.set(event, filtered);
  }

  emit(event, data) {
    const handlers = this.listeners.get(event) || [];
    for (const handler of handlers) {
      try {
        const result = handler(data);
        if (result && typeof result.catch === 'function') {
          result.catch(err => {
            console.error(`[EventBus] Async error handling ${event}:`, err);
          });
        }
      } catch (err) {
        console.error(`[EventBus] Error handling ${event}:`, err);
      }
    }
  }

  clear() {
    this.listeners.clear();
  }
}

const eventBus = new EventBus();
module.exports = eventBus;

