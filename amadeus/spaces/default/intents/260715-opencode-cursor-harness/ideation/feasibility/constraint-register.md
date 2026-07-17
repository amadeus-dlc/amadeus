# Constraint Register — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`(Issue #626)/ 上流: `../intent-capture/intent-statement.md` の非目標4項を制約として継承。

## 技術的制約

| ID | 制約 | 出典 | 含意 |
| --- | --- | --- | --- |
| C-T1 | core に harness 固有分岐を直書きしない(harness-neutrality 維持) | Issue #626 非目標 / intent-statement | 差分はすべて `harness/opencode/`・`harness/cursor/` の manifest+emit に閉じ込める |
| C-T2 | 配布は `scripts/package.ts` の manifest 自動発見 seam に載せる(core 編集ゼロ) | package.ts:64-71 実測 | 新規ビルド機構の発明禁止。dist:check / promote:self:check のガード対象に自動編入 |
| C-T3 | `dist/<harness>/` の手編集禁止・正本と生成物のコミット間整合 | project.md Forbidden/Mandated | 正本は `packages/framework/harness/<name>/`。変更後 `bun scripts/package.ts` + `bun run promote:self` |
| C-T4 | Bun-only 前提 — runtime dependency 追加は文書化なしに禁止 | project.md Forbidden | opencode/Cursor 向けアダプタも Bun 直接実行の TS で書く(外部パーサ等の依存追加不可) |
| C-T5 | opencode の受け取り単位: `opencode.json`(JSON/JSONC)+ `.opencode/{agents,commands,skills,plugins}/` + AGENTS.md | 公式 docs 実測(2026-07-16) | agent persona・skills・起動導線の写像先が存在。plugins が hook 相当の候補 |
| C-T6 | Cursor の受け取り単位: `.cursor/rules/*.mdc`(description/globs/alwaysApply)+ AGENTS.md(ネスト合成)+ `.cursor/mcp.json` + headless CLI `agent -p` | 公式 docs 実測(2026-07-16) | 決定的 hook seam は未確認 — audit/state sync の実現形は設計段で確定(機能差は文書化) |
| C-T7 | 既存 harness(claude/codex/kiro/kiro-ide)に回帰を出さない | Issue #626 受け入れ条件 | 既存 CI(typecheck/lint/dist:check/promote:self:check/tests --ci)green の維持が下限 |

## 組織的制約

| ID | 制約 | 出典 | 含意 |
| --- | --- | --- | --- |
| C-O1 | 並行 intent 260709-canonical-settings(e2)と codekb を共有 | leader 割当指示(5) | RE diff-refresh の c3-relabel・record-sync PR の即時性・シャード衝突時は append-only prefix 実測 |
| C-O2 | walking-skeleton 規律適用(greenfield 要素: 新 harness port・新配布ツリー) | leader 割当指示(3) / org.md | Bolt 1 = 最小 e2e スライス(例: opencode の manifest+dist 生成+--version 導線)を単独ゲート |
| C-O3 | 同時アクティブ builder は 1 intent あたり最大4 | team.md parallel-bolts | Construction の fan-out 設計に反映 |
| C-O4 | 全ステージゲートは leader delegate 経路、マージはユーザー承認後 leader 執行 | team.md auto-gate-approval / no-AI-merge | 自律進行はしない |

## 規制的制約

| ID | 制約 | 出典 | 含意 |
| --- | --- | --- | --- |
| C-R1 | 該当なし(OSS 開発ツール配布。PCI/HIPAA/SOC2/データレジデンシー非適用) | feasibility-questions Q2(project.md 既決) | compliance 観点は license 整合の通常注意のみ |

## Compliance 支援観点(amadeus-compliance-agent)

規制フレームワーク非該当を確認した上で、配布物に第三者ハーネス(opencode/Cursor)の名称・商標を含む文書を追加する際は、事実記述(対応状況・制限の記載)に留めることを注意点として登録する — Issue 受け入れ条件の README / harness guide 記載はこの範囲内。

## AWS Platform 支援観点(amadeus-aws-platform-agent)

AWS 利用なし(project.md Deployment 既決)。インフラ面の制約は GitHub Actions の既存 CI ジョブ構成のみで、新規クラウドリソースの提供・変更は本 intent のスコープ外(intent-statement の Initial Scope Signal と整合)。
