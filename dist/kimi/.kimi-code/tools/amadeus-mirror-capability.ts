// amadeus-mirror-capability.ts — G2 Mirror mutation capability.
//
// This module owns the ONLY runtime authority that lets a caller mutate a
// GitHub mirror issue. It holds a module-private WeakSet of every permit the
// factory has minted; the validator (used by the Gateway before spawning any
// mutation process) admits a permit only when it is a WeakSet member AND its
// bound operation / repository / issue number match the call about to run.
//
// The C0 `MirrorMutationPermit` type carries a phantom `unique symbol` brand
// declared (and never exported) in amadeus-mirror-types.ts, so no module can
// build a permit value by object literal without an `as` cast. The cast is a
// compile-time hole; the WeakSet closes it at runtime — a forged object, a
// `type assertion`, or a plain JavaScript caller is simply not a member.
//
// Import direction is fixed by dependency test: only C6 (the guard coordinator,
// Unit 4) imports the factory; only the Gateway (C5) imports the validator.
// Neither is re-exported from any package barrel.

import type {
  MirrorEventIdentity,
  MirrorMutationPermit,
  MirrorOperation,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";

// The full binding C6 fixes when it mints a permit. The event is retained for
// C6 / audit correlation; the Gateway validates only the fields it can
// independently re-derive from its own call (operation, repository, issue
// number), since it has no independent event source.
export type MirrorPermitBinding = Readonly<{
  event: MirrorEventIdentity;
  repository: RepositoryIdentity;
  operation: MirrorOperation;
  issueNumber: number | null;
}>;

// What the Gateway can prove about the call it is about to make.
export type MirrorPermitExpectation = Readonly<{
  operation: MirrorOperation;
  repository: RepositoryIdentity;
  issueNumber: number | null;
}>;

// Membership registry. A WeakSet keyed by the permit object identity: a permit
// cannot be reconstructed, only the exact frozen object the factory returned is
// ever a member. It is garbage-collected with the permit, so nothing persists.
const mintedPermits = new WeakSet<object>();

// C6-only factory. Binds the fields into a frozen object, registers it, and
// hands back the branded type. Single-operation use; never persisted or reused.
export function createMirrorMutationPermit(
  binding: MirrorPermitBinding,
): MirrorMutationPermit {
  const permit = Object.freeze({
    event: binding.event,
    repository: binding.repository,
    operation: binding.operation,
    issueNumber: binding.issueNumber,
  });
  mintedPermits.add(permit);
  // The phantom brand exists only in the type system; the WeakSet is the
  // runtime proof. This cast is the single sanctioned construction site.
  return permit as unknown as MirrorMutationPermit;
}

// Gateway-only validator. Rejects (returns false) a non-member permit and any
// permit whose bound operation, repository canonical, or issue number does not
// match the call the Gateway is about to spawn. `create` requires an absent
// issue number; `edit` / `close` require an exact positive match.
export function validateMirrorMutationPermit(
  permit: MirrorMutationPermit,
  expected: MirrorPermitExpectation,
): boolean {
  // A forged object / literal / type assertion is not in the registry.
  if (!mintedPermits.has(permit as unknown as object)) return false;

  const bound = permit as unknown as MirrorPermitBinding;
  if (bound.operation !== expected.operation) return false;
  if (bound.repository.canonical !== expected.repository.canonical) return false;

  if (expected.operation === "create") {
    return bound.issueNumber === null && expected.issueNumber === null;
  }
  return (
    typeof bound.issueNumber === "number" &&
    bound.issueNumber === expected.issueNumber
  );
}
