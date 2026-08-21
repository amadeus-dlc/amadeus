# conformance-fixture plugin (test fixture)

A synthetic, complete-shaped plugin used only as a fixture by the plugin
lifecycle and conformance tests. It is deliberately **not** under the
repository's `plugins/` root: it ships with nothing, and no workspace ever
installs it outside a temporary directory created by a test.

It carries one of every element the host's composition machinery projects, so a
conformance journey can install it, auto-compose it, reach its stage through the
compiled stage graph, run its declared advisory evaluator, and drop it again:

- `plugin.json` — manifest with one stage, one sensor, one tool and one advisory
- `stages/conformance-fixture.md` — a no-op construction stage with empty `scopes:`
- `sensors/amadeus-conformance-fixture.md` — a manifest that matches nothing
- `tools/conformance-fixture-tool.ts` — the advisory evaluator (hold until a
  verdict is recorded, no-hold afterwards)

The directory nesting is intentional: the parent directory is the *plugins root*
handed to the projector's discovery, and this directory is the plugin, so the
plugin identity (its directory name) matches the manifest `name`.
