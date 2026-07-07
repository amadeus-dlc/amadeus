# Security Design — U7 CI And Package Gates

> Stage: construction / nfr-design  
> Unit: U7 CI And Package Gates

## Security Boundary

U7はmerge前のsupply-chain gateである。`security-requirements.md` の通り、dependency/advisory gating、secret scan gating、allowlist governance、package metadata/content validationを実行するが、npm token設定、publish、GitHub Release作成は一切行わない。

## Dependency Gate

Scanner adapterはtool-specific outputを `.amadeus-ci/setup/dependency-findings.json` のnormalized schemaへ変換する。`security-gate.ts audit` はschemaを検証し、invalid schemaはexit 2でCI failureにする。

Blocking condition:

- `severity` が `high` または `critical`;
- and `reachable:true` または `surface:"installer-runtime"` / `surface:"publish-tooling"`;
- `surface:"unknown"` のHigh/Criticalは証拠がない限りblocking扱い。

Valid allowlistだけが `passed-with-exception` を許可する。Allowlist entryは `advisoryId`、`packageName`、`affectedRange`、`reason`、`owner`、`expiresAt` を必須にし、expired/malformed/mismatch はfailureである。

## Secret Gate

Scanner adapterは `.amadeus-ci/setup/secret-findings.json` を書く。`verified:true` が1件でもあればfailure。Reports include fingerprint、path、line、ruleIdのみで、secret valueは出力しない。Malformed schemaもexit 2でfailureにする。

## Package Security

Package metadata gate validates `name`、`bin`、`license`、`repository`、`files`、root dev-only boundary。Package dry-run gate validates tarball contents and rejects memory/audit/local state、unnecessary repo source、unexpected files。U7はnpm publish tokenを使わず、dry-run evidenceだけをartifactに残す。

## Path Conditions

Installer-related paths include `packages/setup/**`、installer tests、installer docs、release workflow、package metadata、installer-owned CI configuration。Non-installer PRではpackage-specific U7 gatesをskipしてよいが、global secret scanなど既存global gatesは弱めない。

## Reporting Controls

CI summary and artifacts must not leak secret values or environment dumps. `passed-with-exception` is visibly distinct from `passed` and includes advisory、owner、expiry、reason。Reports are bounded and stored under `.amadeus-ci/setup/`.

## Upstream Coverage

- `performance-requirements.md`: security evaluation stays bounded by normalized findings counts.
- `security-requirements.md`: dependency/secret/allowlist/package controls、no token/no publish boundary を直接設計した。
- `scalability-requirements.md`: 1,000 dependency findings、1,000 secret findings、2,000 package entriesをlinearに扱う。
- `reliability-requirements.md`: missing/malformed scanner output、passed-with-exception visibility、stable diagnostics を含めた。
- `tech-stack-decisions.md`: normalized schemas、allowlist path、GitHub Actions/Bun scripts に従う。
- `business-logic-model.md`: Dependency And Allowlist Workflow、Secret Scan Workflow、Package gates に沿う。
