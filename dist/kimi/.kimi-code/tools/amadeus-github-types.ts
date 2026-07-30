export type GitHubRepository = Readonly<{
  owner: string;
  name: string;
  canonical: `${string}/${string}`;
}>;

export type GitHubMutationEffect =
  | "not-started"
  | "no-effect-confirmed"
  | "outcome-unknown";

export type GitHubFailureClass =
  | "not-installed"
  | "unauthenticated"
  | "permission"
  | "rate-limit"
  | "network"
  | "api"
  | "command"
  | "invalid-response";

export type GitHubGatewayOutcome<T> =
  | Readonly<{ kind: "ok"; value: T }>
  | Readonly<{
      kind: "failure";
      classification: GitHubFailureClass;
      summary: string;
      retryable: boolean;
      effect: GitHubMutationEffect;
    }>;

export type CreateGitHubIssueInput = Readonly<{
  title: string;
  body: string;
  labels: readonly string[];
}>;

export type RemoteGitHubIssue = Readonly<{
  repository: GitHubRepository;
  number: number;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED";
}>;
