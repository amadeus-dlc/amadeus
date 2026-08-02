# Install: formal-model-check

Copy this bundle's `plugins/formal-model-check/` into `.opencode/.amadeus-plugin-src/formal-model-check/` under your project root (the harness directory `compose` scans, and the one the engine reads plugin stages back from).

Or stage and compose in one operation with `bun .opencode/tools/amadeus-plugin.ts install <path>`, where `<path>` is this bundle's `plugins/formal-model-check/` folder.

Auto-compose is wired through the host's JavaScript plugin session event. To compose manually:

    bun .opencode/tools/amadeus-plugin.ts compose
