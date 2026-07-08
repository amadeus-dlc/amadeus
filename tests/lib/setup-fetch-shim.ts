// Preload script for the install E2E test (tests/e2e/setup-install.test.ts).
//
// ports/http.ts is a frozen U1 file with no test-injection hook and a fixed
// host allowlist (api.github.com/codeload.github.com), and the E2E test
// spawns the *real built binary* as its own process — so the only way to
// keep that scenario network-independent (cicd-pipeline.md) without editing
// the frozen port is to rewrite outgoing fetch() calls before they leave the
// process, via `bun --preload` sharing the same runtime as the CLI. Loaded
// only when AMADEUS_SETUP_TEST_FAKE_GITHUB_PORT is set by the test harness.

const port = process.env.AMADEUS_SETUP_TEST_FAKE_GITHUB_PORT;
if (!port) {
  throw new Error("setup-fetch-shim.ts requires AMADEUS_SETUP_TEST_FAKE_GITHUB_PORT to be set");
}

const REDIRECT_HOSTS = new Set(["api.github.com", "codeload.github.com"]);
const originalFetch = globalThis.fetch;

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof URL ? input : new URL(typeof input === "string" ? input : input.url);
  if (REDIRECT_HOSTS.has(url.host)) {
    const rewritten = new URL(`http://127.0.0.1:${port}${url.pathname}${url.search}`);
    return originalFetch(rewritten, init);
  }
  return originalFetch(input as never, init);
}) as typeof fetch;
