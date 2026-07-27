# Install: formal-model-check

Copy this bundle's `plugins/formal-model-check/` into `.amadeus-plugin-src/formal-model-check/` at your project root (the directory you run `compose` from).

Auto-compose is wired from `hooks/auto-compose.snippet` on session start. To compose manually:

    bun .kimi-code/tools/amadeus-plugin.ts compose
