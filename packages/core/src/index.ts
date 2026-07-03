/**
 * `@scrimmage/core` — the framework-agnostic domain model, services and storage
 * interfaces that power Scrimmage. This package knows nothing about Discord or
 * any specific database.
 */
export * from './domain/index.js';
export * from './storage/index.js';
export * from './services/index.js';
export * from './errors/index.js';

export { systemClock, uuid, resolveRuntime } from './runtime.js';
export type { Clock, IdGenerator, ServiceRuntime } from './runtime.js';

export { TypedEventBus, noopEventBus } from './events.js';
export type {
  EventBus,
  EventBusOptions,
  EventName,
  EventListener,
  ScrimmageEvents,
} from './events.js';
