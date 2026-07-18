# Performance Requirements — fix-1170-retreat-guard(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要件(強制メカニズム由来の数値のみ — constants-from-code)

| # | 要件 | 数値の導出元 | 検証 |
|---|---|---|---|
| P-1 | set-status のロック取得待ちは既存 withAuditLock のリトライ上限に従う(50回×100ms = 最大約5秒で loud throw) | amadeus-lib.ts:4275 `acquireAuditLock(projectDir, 50, 100, ...)` — 新パラメータを導入しない | integration テストで競合時の完走(throw または成功)を実測 |
| P-2 | ロック内処理は read+parse+比較+write のみ(新規 I/O・spawn を追加しない)— hook 発火頻度(TaskUpdate ごと)での実用十分性は既存 engine RMW と同構造であることから導出 | business-logic-model の中核ロジック(readStateFile 1回+parseCheckboxes 1回) | diff 検分(ロック内に新規 I/O なし) |

新規の応答時間 SLO は設けない(サービスではない単発 CLI — 数値目標の捏造をしない。observability-setup:c3 の timeout≠SLO 原則)。

## 前提(technology-stack 由来)

technology-stack.md の Bun 直接実行前提(hooks/tools を bun で直実行)に従い、数値はプロセス起動オーバーヘッドを含む実測でなく既存機構の定数から導出する。
