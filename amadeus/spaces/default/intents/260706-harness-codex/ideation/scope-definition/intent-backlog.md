# Intent Backlog — 260706-harness-codex（Issue #552）

上流入力: [scope-document.md](scope-document.md)、[intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)（C-1 の Phase 分割が後続候補の根拠）。

## 本 Intent のバックログ（proto-Units）

| ID | 項目 | 優先 | 備考 |
|---|---|---|---|
| P1-1 | 上流 dist/codex の fresh clone 取得と openai.yaml 全件照合（純正性検証 #541） | Must | 基準 commit b67798c3。A-1（全 skill 同内容 guard）の検証を兼ねる |
| P1-2 | 上流 38 skill → amadeus skill の写像表作成（parity-map skillNameMapping 準拠） | Must | 上流対応のない独自 skill は対象外（scope Q1 = A） |
| P1-3 | source `skills/amadeus-*/agents/openai.yaml` の追加（rename 契約適用 + provenance ヘッダ） | Must | 設計確定 Q6 = B |
| P1-4 | `harness/codex/` 新設（README = 契約 + Phase 2 正準化予定、provenance 記録） | Must | scope Q2 = A（2 文書のみ） |
| P1-5 | promote-skill による昇格（対象 skill 全件） | Must | 既存経路。`npm run test:it:promote-skill` |
| P1-6 | 検証（validator / test:all / parity:check / openai.yaml が検査対象外であることの確認） | Must | engineer5 提案の受け入れ条件を含む |

## 後続 Intent 候補（スコープアウト。起案は人間と leader）

| 項目 | 根拠 |
|---|---|
| Phase 2: core/ 一本化 + build.ts 化 + 粒度制約の CI 検証置き換え + manifest 統合（#543） | 設計確定 Q1/Q2/Q4/Q5。#526 と同じ単独実行枠。移設 3 点セット（原子的 commit + nameMappings 拡張 + 検出器追従 = engineer1 の #553 前例）を要求に含める |
| amadeus 独自 skill への openai.yaml 付与検討 | scope Q1 = A の判断残り（Codex ハーネス対応の実働時に） |
| Codex ハーネスの実行対応（emit.ts / hooks adapter 相当） | 上流 harness/codex の残り構成要素 |
