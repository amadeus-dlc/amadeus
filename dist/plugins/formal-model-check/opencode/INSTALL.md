# Install: formal-model-check

Copy this bundle's `plugins/formal-model-check/` into `.amadeus-plugin-src/formal-model-check/` at your project root (the directory you run `compose` from).

This harness has no auto-compose session hook. Run compose after install and after every plugin change:

    bun .opencode/tools/amadeus-plugin.ts compose
