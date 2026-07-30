// Compatibility surface for Intent Mirror callers.

export * from "./amadeus-github-gateway.ts";
export {
  createMirrorGitHubGatewayAdapter as createMirrorGitHubGateway,
  parseGitHubRepository as parseRepositoryIdentity,
} from "./amadeus-github-gateway.ts";
