# Reliability Design — U2 plugin-skeleton

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Lifecycle

- compose→doctor→compile→single→drop→doctor→compileを実FS E2Eで検証し、drop後baseline byte一致を要求する。
- apply失敗はjournal rollback、compile失敗は旧graph維持とし、partial graphをpublishしない。

## Errors

- stderrはschema `amadeus.plugin-stage-error.v1`の単一行JSONとし、全codeをexit 1へ写像する。共通必須fieldは`schema`、`code`、`plugin`、`slug`である。
- `SLUG_COLLISION`は`existingPath`と`pluginPath`必須、`READ_FAILED`は`pluginPath`と`reason`必須、`SCHEMA_INVALID`は`pluginPath`と`field`と`reason`必須、`UNKNOWN_SENSOR`は`pluginPath`と`sensorId`必須とし、他code専用fieldを禁止する。
- absolute pathやcontentを出さず、すべてPOSIX relative pathとしてJSON stringifyし、改行をfield内でescapeする。
