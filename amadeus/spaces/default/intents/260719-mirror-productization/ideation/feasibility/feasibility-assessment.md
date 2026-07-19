# Feasibility Assessment — mirror-productization

> 上流入力(consumes 全数): intent-statement.md

## 判定: **GO**(全5面とも実測済みの既存機構で成立)

| # | 面 | 実測結果(2026-07-19 leader 実測) | 判定 |
|---|---|---|---|
| F-1 | ツール移設(G-2) | scripts/amadeus-mirror.ts(373行)は既に `../packages/framework/core/tools/amadeus-lib` を import(mirror.ts:23)— core/tools への移設で import は兄弟相対に単純化。gh は Bun.spawnSync 呼び出し(:208-209)で不在・未認証は exit 1 の loud-fail 設計済み(ヘッダコメント :6-7 verbatim: 「1 fault (gh missing/unauthenticated, …)」)| ✅ 低リスク |
| F-2 | 全ハーネス投影 | manifest の coreDirs が `{ src: "tools", dst: "tools" }` を含む(claude manifest.ts:31-32 実測。全6ハーネス同構造 — harness-tools-placement ノルムの既決実測)。dist:check / promote:self:check の既存 drift guard に自動で乗る | ✅ 機構既存 |
| F-3 | SKILL 配布 | 既存の session skills(amadeus-session-cost 等)が coreDirs の `skills/<name>` エントリで in-tree 配布される様式を実測(claude manifest.ts:39-40)— /amadeus-mirror も同様式で配布可。ただし read-only 分類ではない(外部書込あり)ため分類表記の設計が必要 | ✅ 様式既存 |
| F-4 | phase 境界 ask(G-4) | phase boundary 機構は amadeus-state.ts:137-154(PHASE_VERIFIED / phase-check ガード)に実在 — engine が境界を決定的に検知する seam は既存。ask/print は既存 directive 語彙(新 kind 不要は G-4 既決)。挿入位置の詳細は design | ✅ seam 実在 |
| F-5 | 3層 config(G-5b/G-6) | amadeus/ ツリーは git 管理(既定)で amadeus/config.yml の追加に .gitignore 変更不要。Space 層は space 資産(amadeus/spaces/<space>/)、Intent 層は amadeus-state.md フィールド(autonomy mode と同型)— いずれも既存の読み書き機構の範囲 | ✅ 低リスク |

## 前提とフラグ

- gh optional 化はノルム改定(G-1)が実装の前提 — 改定は本 intent の成果物として norm PR で行う(実装 intent 側でなく本 ideation 完了時でもよい: scope-definition で確定)
- engine 変更(F-4)は本 intent 最大の変更面 — テスト(t135 等の next 出力消費系)への影響棚卸しが requirements で必要(stdout-directive-stderr-advisory / stderr-addition-consumer-grep 既決ノルムの適用対象)
- 「仮説」ラベル: phase 境界 ask の UX(全 phase でやるか、ideation→inception 境界だけか等の発火粒度)は未検証の仮説 — requirements で確定
