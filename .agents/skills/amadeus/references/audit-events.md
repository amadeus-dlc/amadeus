# Audit Events

record の `audit/audit.md` に追記するイベントの契約である。
イベント名と entry 形式は v2 の audit format（[aidlc-v2/audit-format.md](aidlc-v2/audit-format.md)）に従う。
audit は追記専用であり、記録済みの entry を書き換えない。

## Entry 形式

```
## [Event Heading]
**Timestamp**: [ISO 8601 timestamp]
**Event**: [イベント名]
**Stage**: [stage slug。文脈依存で省略可]
**Details**: [イベント固有の内容]

---
```

Timestamp は entry ごとに `date -u +"%Y-%m-%dT%H:%M:%SZ"` で新しく取る。
人間の判断は要約せず、そのまま記録する。

## Amadeus が使うイベント

| イベント | 記録する場面 | 記録者 |
|---|---|---|
| `WORKFLOW_STARTED` | Birth 承認後、Initialization の開始時 | `amadeus` 入口 |
| `WORKFLOW_COMPLETED` | Construction phase PR の merge 確認後 | `amadeus` 入口 |
| `PHASE_VERIFIED` | phase PR の merge 確認後（Details に PR の URL） | `amadeus` 入口 |
| `PHASE_SKIPPED` | 実行対象ステージのない phase の通過時 | `amadeus` 入口 |
| `STAGE_STARTED` | ステージの checkbox を `[-]` にしたとき | `amadeus` 入口 |
| `STAGE_AWAITING_APPROVAL` | ステージの checkbox を `[?]` にしてゲートを提示したとき | ステージ内部 skill |
| `STAGE_REVISING` | 差し戻しで checkbox を `[R]` にしたとき | ステージ内部 skill |
| `STAGE_COMPLETED` | ステージ完了で checkbox を `[x]` にしたとき（Details に承認方法。PR 確定なら PR の URL） | ステージ内部 skill（autonomy による補完は `amadeus` 入口） |
| `STAGE_SKIPPED` | Condition 偽または scope 外で checkbox を `[S]` にしたとき | `amadeus` 入口とステージ内部 skill |
| `WORKSPACE_SCAFFOLDED` | 0.1 の scaffold 作成時 | `amadeus` 入口 |
| `WORKSPACE_SCANNED` | 0.2 の判定完了時 | `amadeus` 入口 |
| `WORKSPACE_INITIALISED` | 0.3 の `amadeus-state.md` 生成時 | `amadeus` 入口 |
| `GATE_APPROVED` | 人間がゲートで承認したとき（User Input をそのまま記録） | ステージ内部 skill |
| `GATE_REJECTED` | 人間がゲートで差し戻したとき（Feedback をそのまま記録） | ステージ内部 skill |
| `DECISION_RECORDED` | 構造化された質問を提示する直前（提示した選択肢を記録） | grilling を使う skill |
| `QUESTION_ANSWERED` | 質問に人間が回答したとき | grilling を使う skill |
| `BOLT_STARTED` | Bolt の開始時（Bolt 名、walking skeleton かどうか） | `amadeus` 入口 |
| `BOLT_COMPLETED` | Bolt PR の merge 確認後（Details に PR の URL） | `amadeus` 入口 |
| `BOLT_FAILED` | Bolt が失敗または中断したとき | `amadeus` 入口 |
| `AUTONOMY_MODE_SET` | ladder 提案への回答を記録したとき | `amadeus` 入口 |
| `WORKFLOW_PARKED` | Intent を中断して後続セッションへ引き継ぐとき | `amadeus` 入口 |
| `WORKFLOW_UNPARKED` | 中断した Intent を再開したとき | `amadeus` 入口 |

上の表にないイベント名を発明しない。
ステージ完了は常に `STAGE_COMPLETED` を使い、ステージ固有の完了イベント名を作らない。
