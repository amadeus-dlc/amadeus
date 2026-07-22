// arm-s-result.ts — U6 ts-arm: discriminated-union Result for the blind Arm S
// checker (functional-domain-modeling-ts). Owned by Arm S so the core never
// imports the subject model to obtain a Result helper (blind boundary).

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}
