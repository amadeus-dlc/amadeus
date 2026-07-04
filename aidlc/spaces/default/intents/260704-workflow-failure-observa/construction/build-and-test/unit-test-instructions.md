# Unit Test Instructions

## 入力成果物

この手順は、各 Unit の `code-generation-plan` と `code-summary` から、Requirement と helper 単位の deterministic eval を抽出する。

Test Strategy は `Comprehensive` である。

## Unit Test Inventory

| Unit | Command | 主な確認対象 |
|---|---|---|
| U001 | `npm run test:it:failure-evidence-foundation` | `ERROR_LOGGED`、hook drops、OpenTelemetry test sink、stdout JSON 非干渉 |
| U002 | `npm run test:it:subagent-status-audit` | `SubagentStop` outcome、`tool_input.status` 除外、old row normalization |
| U003 | `npm run test:it:workflow-warning-traceability` | workflow warning、Requirement evidence map、PR readiness checklist |

## Run Commands

単体相当の評価は次で実行する。

```bash
npm run test:it:failure-evidence-foundation
npm run test:it:subagent-status-audit
npm run test:it:workflow-warning-traceability
```

まとめて実行する場合は次を使う。

```bash
npm run test:it:failure-evidence-foundation && npm run test:it:subagent-status-audit && npm run test:it:workflow-warning-traceability
```

## Expected Coverage

R001、R002、R003 は U001 の評価で確認する。

R004 は U002 の評価で確認する。

R005、R006、R009 は U003 の評価で確認する。

R007 と R008 は U001、U002、U003 の連結で確認する。

## Test Data Management

各 eval は一時 workspace を作り、実行後に削除する。

そのため、target workspace の `aidlc/` 成果物や `.aidlc-hooks-health/` には fixture の副作用を残さない。
