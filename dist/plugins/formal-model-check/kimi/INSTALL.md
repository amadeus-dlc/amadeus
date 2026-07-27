# Install: formal-model-check

Copy this bundle's `plugins/formal-model-check/` into `.kimi-code/.amadeus-plugin-src/formal-model-check/` under your project root (the harness directory `compose` scans, and the one the engine reads plugin stages back from).

Auto-compose is wired from `hooks/auto-compose.snippet` on session start. To compose manually:

    bun .kimi-code/tools/amadeus-plugin.ts compose
