# 性能要件 — U3 host-projection-all

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 適用範囲と性能モデル

U3 の投影処理は `technology-stack.md` が「ビルド時単発実行」と実測した既存 `scripts/package.ts` 系に編入される(technology-stack.md の「後続実装は canonical のみを編集して6 harness と self-install を再生成する」実測どおり)。常駐 service ではなくビルド時ツールであるため、レイテンシ SLO・スループット・並行性の service 指標は適用しない(N/A の根拠は下記「非該当カテゴリ」)。性能上の唯一の関心事は、`business-logic-model.md` フロー 1(全面投影)とフロー 2(`--check` 編入)が既存ビルド/ドリフト検査の実行時間に加える**追加時間**である。

`requirements.md` NFR-2 は起動レイテンシ非退行を求めるが、これはフックからの自動 compose(U4)を対象とする。U3 のビルド時投影は起動経路に乗らないため、NFR-2 の直接対象ではなく、CI ビルド時間への影響として計測する。

## PERF-U3-1: ビルド時間への追加(投影)

`business-logic-model.md` フロー 1 の全面投影が `bun scripts/package.ts` 全体の実行時間に加える増分を計測する。`business-rules.md` BR-U3-4 の 0-plugin build は既存 baseline と byte-identical であり、0-plugin 時は全セクション no-op(ProjectionResult{noop-zero-plugin})のため追加時間は測定ノイズ内に収まることを期待する。

- 合否: 0-plugin build の `bun scripts/package.ts` 実行時間が現行 baseline から体感退行しない(byte-identical 出力=追加処理 0 の裏付け)。数値予算は build-and-test で実測固定(未実測の推定値を受け入れ基準にしない — technology-stack.md の `bun run typecheck` が exit 127 で未判定だった前例に倣い、確定していない数値を基準化しない)
- 合否: N-plugin build の追加時間は build-and-test の実測で固定する。既存の `plugin-discovery-overhead-gate` の既習様式(相対比 `DISCOVERY_OVERHEAD_RATIO_LIMIT = 0.2` と絶対フロア `DISCOVERY_OVERHEAD_NOISE_FLOOR_MS = 10` の **AND 判定** — tests/lib/plugin-discovery-overhead-gate.ts:15,43,67)を引用可能な既存パターンとし、新規のしきい値機構を発明しない

## PERF-U3-2: `--check` の追加時間(ドリフト検出)

`business-logic-model.md` フロー 2 の `checkPluginProjections()` は既存 `dist:check` 経路へ合流する(`requirements.md` FR-2 の `--check` 合否と対応)。hash 比較は投影ファイル数に線形で、`business-rules.md` BR-U3-5 の write⇔check 対称性により投影と同じ hash 判定を共有するため、追加コストは投影済みファイルの stat + hash に限定される。

- 合否: `--check` の追加時間は投影ファイル数に対して線形(サブ線形の探索構造を要求しない — 少数プラグイン前提 `requirements.md` A-3 のため最適化不要)。絶対値予算は build-and-test で実測固定

## 非該当カテゴリ(N/A + 根拠)

- レイテンシ SLO / スループット / 同時接続数: N/A。U3 はビルド時単発ツールで常駐 service ではない(technology-stack.md「HTTP・DB はない」実測)。決定的な file 境界(投影 outDir)と単発実行契約へ置換される
- キャッシュ / 水平スケーリング: N/A。少数プラグイン(`requirements.md` A-3)・単発実行のため常駐キャッシュ層を機械適用しない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:53:20Z
- **Iteration:** 1
- **Scope decision:** none

全引用 file:line 照合で破綻なし。outDir 拒否・byte-identical・対称性・部分失敗 loud を BR と 1:1 反映。N/A は実測根拠付き。findings 0。

### Findings

- None
