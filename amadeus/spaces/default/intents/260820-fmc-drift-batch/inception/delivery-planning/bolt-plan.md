# Bolt Plan — 260820-fmc-drift-batch

上流入力: `unit-of-work.md`(4 unit・write scope・生成台帳の扱い)、`unit-of-work-dependency.md`(辺2本 + 並列集合)、`unit-of-work-story-map.md`(Issue 対応)、`requirements.md`(FR-X 配送条件)、`components.md`(C1〜C4)。編成裁定は DP Q1=A(AUTO_DECIDED auto-decision-c29e8065)。

## Bolt 1

- **Units:** `advisory-retirement`
- **Gate**: walking-skeleton(self-feature の Mandated — 単独・ゲート付き実行。full grant 下では quality READY 後に grant が自動裁定しうるが、ceremony は Bolt 1 に維持)
- **狙い**: 削除中心の最小 end-to-end スライスで全統合点(plugin.json 宣言 → コード → stage 契約 → docs → テスト → 生成台帳 regen → CI → PR → squash マージ)を通す
- **対応 Issue**: #3187

## Bolt 2

- **Units:** `revise-model-commit`, `boundary-three-face`
- **実行形**: 並列バッチ(worktree 分離、base = main)。ソース面の write scope は非交差(unit-of-work.md の実測)。生成台帳(coverage-registry)は各 worktree で regen 同梱し、PR の直列着地で再構成
- **対応 Issue**: #2289, #2929

## Bolt 3

- **Units:** `applicability-arms`
- **前提**: Bolt 1(U3 — `tla-authoring.ts` / stage 契約 / docs の共有面)と Bolt 2 の `revise-model-commit`(U1 — leaf モジュール)の**着地後**に着手(依存辺2本の合流)
- **対応 Issue**: #3186

## 配送規律(全 Bolt 共通)

- Bolt ごとに短命ブランチ → PR → squash マージ(org.md)。record checkpoint 同梱可
- 検証は push-first(remote CI 正)。マージは常任承認条件(必須 CI green ∧ converged:true 実測)の範囲で自律実行
- Bolt 実装は worktree 分離(solo-bolt-worktree-required)+ `mise trust` + 依存インストール + `bun run build`
- Bolt 1 出荷後のラダープロンプトは不要 — Intent Autonomy Mode は `full` 宣言済み(grant intent-grant-79f28345…)で、Construction Autonomy Mode は `autonomous` を導出
