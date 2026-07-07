# @amadeus-dlc/setup

`@amadeus-dlc/setup` is the Bun-first package shell for the Amadeus DLC installer.

U1 exposes the `amadeus-setup` command, parser, help output, runtime wrapper, and package metadata checks. Version resolution, archive fetch, target detection, operation planning, file apply, and manifest writes are intentionally deferred to later implementation units.

```sh
bunx @amadeus-dlc/setup --help
```

Supported user-visible commands in this slice:

- `install`
- `upgrade`

`init` is intentionally rejected because installer setup uses `install` in this release.
