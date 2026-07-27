# Install: formal-model-check

Copy this bundle's `plugins/formal-model-check/` into `.opencode/.amadeus-plugin-src/formal-model-check/` under your project root (the harness directory `compose` scans, and the one the engine reads plugin stages back from).

This harness has no auto-compose session hook. Run compose after install and after every plugin change:

    bun .opencode/tools/amadeus-plugin.ts compose
