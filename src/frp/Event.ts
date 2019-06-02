import { Dynamic } from "./Dynamic";

export type Subscriber<T> = (val: T) => void;

export interface Event<T> {
  subscribe: (fn: Subscriber<T>) => void;
  unsubscribe: (fn: Subscriber<T>) => void;
}

// Emits at every animation frame with the time delta since the last event.
export const fromAnimationFrame = (): Event<number> => {
  const [event, emit] = mkEvent<number>();
  const onFrame = (lastTimestamp: number) => (timestamp: number) => {
    emit(timestamp - lastTimestamp);
    requestAnimationFrame(onFrame(timestamp));
  };
  // On the first animation frame only the current timestamp is available,
  // making it impossible to calculate the delta, so the first animation frame
  // has to be handled specially.
  requestAnimationFrame(timestamp => requestAnimationFrame(onFrame(timestamp)));
  return event;
};

export const mkEvent = <T>(): [Event<T>, (val: T) => void] => {
  const subs: Array<Subscriber<T>> = [];
  const event: Event<T> = {
    subscribe: sub => subs.push(sub),
    unsubscribe: sub => {
      const index = subs.indexOf(sub);
      if (index !== -1) subs.splice(subs.indexOf(sub), 1);
    },
  };
  const emit = (val: T) => subs.forEach(sub => sub(val));
  return [event, emit];
};

// Type of `event` (`K`) copy+pasted from the type of `addEventListener` on
// `HTMLElement`, which appears to be the same type used across all elements.
export function fromDOMEvent<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  eventType: K,
): Event<HTMLElementEventMap[K]>;
export function fromDOMEvent<K extends keyof DocumentEventMap>(
  target: Document,
  eventType: K,
): Event<DocumentEventMap[K]>;
export function fromDOMEvent<
  K extends keyof (DocumentEventMap | HTMLElementEventMap)
>(
  target: Document | HTMLElement,
  eventType: K,
): Event<DocumentEventMap[K]> | Event<HTMLElementEventMap[K]> {
  const isDocument = (val: Document | HTMLElement): val is Document =>
    "body" in target;
  let mkEventOutput;
  if (isDocument(target)) {
    mkEventOutput = mkEvent<DocumentEventMap[K]>();
  } else {
    mkEventOutput = mkEvent<HTMLElementEventMap[K]>();
  }
  const [event, emit] = mkEventOutput;
  target.addEventListener(eventType, emit);
  return event;
}

export const mapEvt = <A, B>(transform: (val: A) => B) => (
  source: Event<A>,
) => {
  const [event, emit] = mkEvent<B>();
  source.subscribe(val => emit(transform(val)));
  return event;
};

export const merge = <T>(...sources: Array<Event<T>>) => {
  const [event, emit] = mkEvent<T>();
  sources.forEach(source => source.subscribe(emit));
  return event;
};

export function filter<T, Narrowed extends T>(
  predicate: (val: T) => val is Narrowed,
): (source: Event<T>) => Event<Narrowed>;
export function filter<T>(
  predicate: (val: T) => boolean,
): (source: Event<T>) => Event<T>;
export function filter<T>(
  predicate: (val: T) => boolean,
): (source: Event<T>) => Event<T> {
  return source => {
    const [event, emit] = mkEvent<T>();
    source.subscribe(val => {
      if (predicate(val)) emit(val);
    });
    return event;
  };
}

export const attach = <A, B>(
  dyn: Dynamic<A>,
  source: Event<B>,
): Event<[A, B]> => {
  const [event, emit] = mkEvent<[A, B]>();
  source.subscribe(val => emit([dyn.value, val]));
  return event;
};

export const never = <T>(): Event<T> => mkEvent<T>()[0];

// WARNING: untested!
export const mapEvtMaybe = <T, R>(transform: (val: T) => R | null) => (
  source: Event<T>,
): Event<R> => {
  const [event, emit] = mkEvent<R>();
  source.subscribe(val => {
    const mapped = transform(val);
    if (mapped !== null) emit(mapped);
  });
  return event;
};
export const takeWhile = <T>(
  predicate: (val: T) => boolean,
  inclusive?: boolean,
) => (source: Event<T>): Event<T> => {
  const [event, emit] = mkEvent<T>();
  const sub = (val: T) => {
    if (!predicate(val)) {
      source.unsubscribe(sub);
    }
    if (predicate(val) || inclusive) emit(val);
  };
  source.subscribe(sub);
  return event;
};
