# External Dependency Map — archived intent lifecycle

`requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices`を確認した。`stories`と`mockups`はSKIP。本変更は既存repository内のTypeScript tools、filesystem、audit、test、packagingで完結する。

## Gated external items

外部API、外部データ提供、availability window、外部チームhandoff、第三者承認、調達、credential発行はない。したがってowner、lead time、blocked Bolt、technical workaroundを要する外部項目は0件である。

## Human control points

PRレビューとマージ承認は外部依存ではなくチームの不可逆操作ゲートとして扱う。各BoltのPRは人間が承認し、AIはマージ判断を代行しない。承認待ちはスケジュール見積りへ架空のlead timeを置かず、明示的な待機状態として扱う。

## Repository dependencies

Bolt 1は既存registry/packaging、Bolt 2は既存workspace lock/audit/HUMAN_TURN reader、Bolt 3は既存selector/orchestrator/state CLIを再利用する。新規network、database、CI job、deployment targetは導入しない。
