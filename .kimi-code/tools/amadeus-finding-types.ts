import type {
  CreateGitHubIssueInput,
  GitHubGatewayOutcome,
  GitHubRepository,
  RemoteGitHubIssue,
} from "./amadeus-github-types.ts";

export type FindingKind = "defect" | "concern";

declare const findingMutationPermitBrand: unique symbol;

export type FindingMutationPermit = Readonly<{
  [findingMutationPermitBrand]: true;
  repository: GitHubRepository;
  marker: string;
}>;

export interface FindingGitHubGateway {
  readiness(repository: GitHubRepository): Promise<GitHubGatewayOutcome<void>>;
  findIssuesByMarker(
    repository: GitHubRepository,
    marker: string,
  ): Promise<GitHubGatewayOutcome<readonly RemoteGitHubIssue[]>>;
  createFindingIssue(
    permit: FindingMutationPermit,
    input: CreateGitHubIssueInput,
  ): Promise<GitHubGatewayOutcome<RemoteGitHubIssue>>;
}
