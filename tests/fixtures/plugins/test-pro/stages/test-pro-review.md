# Test Pro Review

The `test-pro` reference plugin's one added stage. It exists to prove the plugin
lifecycle end to end — authoring source, six-harness projection, host
composition, doctor, and drop — not to add real workflow behaviour.

Read this stage under {{HARNESS_DIR}} and its rules under {{HARNESS_DIR}}/rules/
after the plugin is composed into a host tree. The `{{HARNESS_DIR}}` token is
rewritten to each harness's own directory when the source is projected, so the
composed copy carries the concrete path for its face.
