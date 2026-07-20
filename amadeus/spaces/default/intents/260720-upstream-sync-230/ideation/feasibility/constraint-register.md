# Constraint Register — upstream-sync-230

上流入力(consumes 全数): intent-statement(`../intent-capture/intent-statement.md`)

## 技術的制約

| ID | 制約 | 出典 |
|---|---|---|
| T1 | Bun-only: 配布フレームワークへ runtime dependency を追加しない(文書化なき追加は Forbidden) | memory/project.md Forbidden |
| T2 | 正本は `packages/framework/core/` / `harness/<name>/`。`dist/` 手編集禁止、`bun scripts/package.ts`+`bun run promote:self` で再生成 | memory/project.md Mandated |
| T3 | プラグイン非アクティブ時に core はバイト同一コンパイルを維持(2.3.0 設計の成立条件) | 承認済み計画 D6 |
| T4 | 全6ハーネス(claude/codex/cursor/kiro/kiro-ide/opencode)への波及を各 Bolt で dist:check / promote:self:check により検証 | 計画 Risks 節 |
| T5 | coverage ゲート: push 前ローカル lcov で diff 追加行未カバー 0、spawn 盲点は in-process seam(既存ノルム群) | memory/team.md Corrections |
| T6 | harness 専用ツールは `harness/<name>/tools/` に置く(core/tools は全ハーネスへ漏出) | memory/project.md harness-tools-placement |

## 組織的制約

| ID | 制約 | 出典 |
|---|---|---|
| O1 | ideation 完了で park。inception/construction への進行はユーザーの明示的再開承認が必要 | intent-statement Initiative Trigger(user decision) |
| O2 | PR マージは人間承認後に leader が執行(no-AI-merge) | memory/team.md Forbidden |
| O3 | チームモード規範(選挙・E-OC1 ゲート・delegate/常任グラント・ack プロトコル)適用 | AMADEUS_OPERATING_MODE=team |
| O4 | Bolt 単位 PR・スカッシュマージ・同時アクティブ builder 最大4 | memory/org.md, team.md parallel-bolts |

## 規制的制約

| ID | 制約 | 出典 |
|---|---|---|
| R1 | 規制要件なし(PCI/HIPAA/SOC2/データレジデンシー非該当) | intent-statement のスコープ(開発フレームワーク) |
| R2 | ライセンス: upstream MIT-0 → Amadeus MIT/Apache-2.0 への取り込みは帰属義務なし。upstream コードは検査のみ・実行禁止 | LICENSE 実読+計画 Fixed boundary |
