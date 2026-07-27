# Install: formal-model-check

Copy this bundle's `plugins/formal-model-check/` into `.opencode/plugins/formal-model-check/`.

This harness has no auto-compose session hook. Run compose after install and after every plugin change:

    bun .opencode/tools/amadeus-plugin.ts compose
