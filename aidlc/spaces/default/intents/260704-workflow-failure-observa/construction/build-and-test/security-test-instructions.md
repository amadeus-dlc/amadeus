# Security Test Instructions

## 入力成果物

この手順は、各 Unit の `code-generation-plan` と `code-summary`、および NFR security requirements を入力として扱う。

U001 は secret redaction、stdout JSON 非干渉、OpenTelemetry no-send を扱う。

U002 は trustworthy status source、message text 非推測、audit field の additive 追加を扱う。

U003 は read-only evidence、missing evidence 非 pass、scope boundary を扱う。

## Security Test Inventory

| Command | 確認対象 |
|---|---|
| `bun audit` | 依存脆弱性 |
| `npm run test:it:failure-evidence-foundation` | secret redaction、OpenTelemetry test sink、no-send 境界 |
| `npm run test:it:subagent-status-audit` | `tool_input.status` 非採用、message secret redaction |
| `npm run test:it:workflow-warning-traceability` | missing evidence 非 pass、parity failure の failed 表示 |

## Run Commands

```bash
bun audit
npm run test:it:failure-evidence-foundation
npm run test:it:subagent-status-audit
npm run test:it:workflow-warning-traceability
```

## Expected Security Gates

`bun audit` は既知脆弱性なしで完了することを期待する。

標準出力に secret、token、full stack trace を出さない。

Subagent outcome は `SubagentStop` payload の top-level field だけを信頼する。

Doctor warning は workflow state を変更しない。

`dev-scripts/data/parity-map.json` は人間の明示承認なしに変更しない。

## Manual Review Points

`@opentelemetry/api` は実行時依存として追加されている。

SDK、collector、exporter は追加されていない。

そのため、外部送信の実装有無は package diff と U001 eval の両方で確認する。
