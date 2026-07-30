import type { FindingMutationPermit } from "./amadeus-finding-types.ts";
import type { GitHubRepository } from "./amadeus-github-types.ts";

export type FindingPermitBinding = Readonly<{
  repository: GitHubRepository;
  marker: string;
}>;

const mintedPermits = new WeakSet<object>();

export function createFindingMutationPermit(
  binding: FindingPermitBinding,
): FindingMutationPermit {
  const repository = Object.freeze({ ...binding.repository });
  const permit = Object.freeze({
    repository,
    marker: binding.marker,
  });
  mintedPermits.add(permit);
  return permit as unknown as FindingMutationPermit;
}

export function validateFindingMutationPermit(
  permit: FindingMutationPermit,
  expected: FindingPermitBinding,
): boolean {
  if (!mintedPermits.has(permit as unknown as object)) return false;
  const bound = permit as unknown as FindingPermitBinding;
  return (
    bound.repository.canonical === expected.repository.canonical &&
    bound.marker === expected.marker
  );
}
