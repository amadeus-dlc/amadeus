# Unit of Work — 260719-mirror-productization

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## ユニット一覧(4 units、規模は components.md の数値見積りから機械転記)

| Unit | 対応 | 内容 | 見積り規模 | 対応 FR |
|---|---|---|---|---|
| U1-mirror-tool | C1 | scripts/amadeus-mirror.ts → core/tools 移設(挙動不変)+status verb(exit 0/1/2、乖離3クラス)+t232 パス更新+status テスト+dist/self-install 再生成 | 移設373行+status 約80-120行 | FR-1/FR-2 |
| U2-mirror-skill | C2 | /amadeus-mirror SKILL 正本(session skills 様式、{{HARNESS_DIR}} 置換、ADR-5 運用注記込み)+manifest skills 投影追加 | 約40-60行 | FR-3 |
| U3-mirror-config | C3 | amadeus-mirror-config.ts(JSON 3面・下位優先・fail-closed、初キー auto-mirror)+unit テスト | 約120-180行 | FR-4 |
| U4-engine-boundary | C4 | amadeus-orchestrate.ts の phase 境界分岐(3境界、ask/print、auto×未作成=ask 降格)+integration テスト(4象限)+consumer grep 棚卸し | 約60-100行 | FR-5/FR-6 |

## ユニット外の先行タスク(コードなし — delivery-planning で追跡)

- **T-norm(C5)**: gh optional ノルム改定の norm PR(ADR-7 の改定文言)。**Bolt 1(U1+U2)マージの前提として先行**(FR-7 受け入れ基準 (c) の順序制約)。leader 執行(norm-changes-via-pr)

## 各ユニットの受け入れ境界

- U1: FR-1/FR-2 受け入れ基準の全項目(dist:check/promote:self:check green、scripts 版 0件、t232 green、乖離3クラス fixture+落ちる実証)+ADR-5 の **usage 出力面**の運用注記(CLI ヘルプ/エラー文言に「create/close は conductor から実行(機械強制なし)」— 強制装い文言禁止・ノルム参照)
- U2: FR-3 受け入れ基準 (a)(b)(c)+ADR-5 留保3件の注記様式(機械強制なし明記・強制装い文言禁止・ノルム参照)
- U3: FR-4 受け入れ基準(3層優先解決・default off・invalid loud 拒否の unit テスト)
- U4: FR-5/FR-6 受け入れ基準(発火3境界の全数 integration テスト、4象限、stdout/stderr 契約維持)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:12:59Z
- **Iteration:** 2
- **Scope decision:** none

i1 Major1(story-map 必須2要素欠落)+Minor1(U1 境界の usage 出力面)是正、i2 で4要素充足と整合維持を確認し READY

### Findings

- story-map へ Cross-cutting/実装順序/Coverage verification 3節追加(是正済み)
- U1 受け入れ境界へ ADR-5 usage 出力面を追記(是正済み)
