# Install: formal-model-check

Copy this bundle's `plugins/formal-model-check/` into `.cursor/.amadeus-plugin-src/formal-model-check/` under your project root (the harness directory `compose` scans, and the one the engine reads plugin stages back from).

Or stage and compose in one operation with `bun .cursor/tools/amadeus-plugin.ts install <path>`, where `<path>` is this bundle's `plugins/formal-model-check/` folder.

Auto-compose is wired from `hooks/auto-compose.snippet` on session start. To compose manually:

    bun .cursor/tools/amadeus-plugin.ts compose
