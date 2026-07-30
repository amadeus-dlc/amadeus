import type {
  CreateMirrorIssueInput,
  GatewayOutcome,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";

export type FindingKind = "defect" | "concern";

declare const findingMutationPermitBrand: unique symbol;

export type FindingMutationPermit = Readonly<{
  [findingMutationPermitBrand]: true;
  repository: RepositoryIdentity;
  marker: string;
}>;

export interface FindingGitHubGateway {
  readiness(repository: RepositoryIdentity): Promise<GatewayOutcome<void>>;
  findIssuesByMarker(
    repository: RepositoryIdentity,
    marker: string,
  ): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>>;
  createFindingIssue(
    permit: FindingMutationPermit,
    input: CreateMirrorIssueInput,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>>;
}
