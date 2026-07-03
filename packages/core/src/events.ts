import type { Team, TeamMember } from './domain/team.js';
import type { Scrimmage } from './domain/scrimmage.js';

/**
 * The domain events emitted by the services, keyed by event name. Payloads are
 * plain domain objects — never front-end (Discord) types — so any consumer can
 * react to what happens without coupling to a particular front-end.
 */
export interface ScrimmageEvents {
  'team.created': { team: Team };
  'team.renamed': { team: Team; previousName: string };
  'team.deleted': { team: Team };
  'team.captainTransferred': { team: Team; previousCaptainId: string };
  'team.logoChanged': { team: Team };
  'team.memberAdded': { team: Team; member: TeamMember };
  'team.memberRemoved': { team: Team; userId: string };
  'team.memberRoleChanged': { team: Team; member: TeamMember };
  'scrimmage.proposed': { scrimmage: Scrimmage };
  'scrimmage.confirmed': { scrimmage: Scrimmage };
  'scrimmage.cancelled': { scrimmage: Scrimmage };
  'scrimmage.played': { scrimmage: Scrimmage };
  'scrimmage.reminderDue': { scrimmage: Scrimmage };
}

export type EventName = keyof ScrimmageEvents;

export type EventListener<E extends EventName> = (
  payload: ScrimmageEvents[E],
) => void | Promise<void>;

/** Minimal typed publish/subscribe contract the services depend on. */
export interface EventBus {
  /** Subscribe to an event; returns a function that unsubscribes. */
  on<E extends EventName>(event: E, listener: EventListener<E>): () => void;
  /** Publish an event to all current listeners. */
  emit<E extends EventName>(event: E, payload: ScrimmageEvents[E]): void;
}

export interface EventBusOptions {
  /** Called when a listener throws or rejects, so one bad listener can't break others. */
  onError?: (error: unknown, event: EventName) => void;
}

type AnyListener = (payload: unknown) => void | Promise<void>;

/** In-memory typed event bus. Listener errors are isolated and routed to `onError`. */
export class TypedEventBus implements EventBus {
  private readonly listeners = new Map<EventName, Set<AnyListener>>();

  constructor(private readonly options: EventBusOptions = {}) {}

  on<E extends EventName>(event: E, listener: EventListener<E>): () => void {
    const set = this.listeners.get(event) ?? new Set<AnyListener>();
    set.add(listener as AnyListener);
    this.listeners.set(event, set);
    return () => {
      set.delete(listener as AnyListener);
    };
  }

  emit<E extends EventName>(event: E, payload: ScrimmageEvents[E]): void {
    const set = this.listeners.get(event);
    if (!set) {
      return;
    }
    for (const listener of set) {
      try {
        const result = listener(payload);
        if (result instanceof Promise) {
          result.catch((error: unknown) => this.options.onError?.(error, event));
        }
      } catch (error) {
        this.options.onError?.(error, event);
      }
    }
  }
}

/** A bus that ignores everything — the default when no consumer is listening. */
export const noopEventBus: EventBus = {
  on: () => () => {},
  emit: () => {},
};
