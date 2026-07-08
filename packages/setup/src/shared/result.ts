// Generic Result<T, E> used across the setup CLI domain layer, following the
// functional-domain-modeling-ts companion-object pattern (canonical reference:
// j5ik2o/event-store-adapter-js `packages/library`).

export type Result<T, E> = { readonly type: "ok"; readonly value: T } | { readonly type: "err"; readonly error: E };

export namespace Result {
  export function ok<T>(value: T): Result<T, never> {
    return Object.freeze({ type: "ok", value });
  }

  export function err<E>(error: E): Result<never, E> {
    return Object.freeze({ type: "err", error });
  }
}

Object.freeze(Result);
