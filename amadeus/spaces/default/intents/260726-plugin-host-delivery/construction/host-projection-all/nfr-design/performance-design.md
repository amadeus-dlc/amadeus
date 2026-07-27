# 性能設計 — U3 host-projection-all

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## PERF-U3-1 への設計: 0-plugin no-op 分岐(構造的ゼロコスト)

`performance-requirements.md` PERF-U3-1(0-plugin build の非退行)は、計測でなく**構造**で担保する。`business-logic-model.md` フロー 1 の「0-plugin 時は全セクション no-op(ProjectionResult{noop-zero-plugin})」を、`scripts/package.ts` 編入セクションの**最初の分岐**として設計する:

```
projectionSection(specs, plugins):
  if plugins.length === 0:
    return ProjectionResult{ kind: "noop-zero-plugin" }   // fs 書込ゼロ・hash 計算ゼロで即 return
  // 以降のみ per-harness 投影ループ
```

- この分岐は `discoverPluginSources` の結果配列長のみで判定し、投影・トークン置換・outDir 検査のいずれにも到達しない。byte-identical(`reliability-requirements.md` REL-U3-1)は「追加処理 0」の帰結として同時に成立する — 性能と信頼性の両合否を単一分岐が担う
- 検証設計: no-op 経路の到達を `ProjectionResult.kind` の assert で固定する(到達カウンタの新設はしない — 戻り値判別 union が既にその役割を果たす)

## PERF-U3-1 への設計: N-plugin 追加時間の実測ゲート様式

数値予算は build-and-test の実測で固定する(PERF-U3-1 の「未実測の推定値を受け入れ基準にしない」)。ゲート様式は新規発明せず、`performance-requirements.md` が引用可能既存パターンと指定する `tests/lib/plugin-discovery-overhead-gate.ts` の**相対比 AND 絶対フロア判定**(`DISCOVERY_OVERHEAD_RATIO_LIMIT = 0.2` / `DISCOVERY_OVERHEAD_NOISE_FLOOR_MS = 10` の AND)を同型適用する。しきい値定数は実測後に同ファイル様式の named constant として固定する。

## PERF-U3-2 への設計: --check の線形コスト設計

`performance-requirements.md` PERF-U3-2 のとおり、`checkPluginProjections()` のコストは「投影済みファイルの stat + hash」に限定する:

- hash 判定関数は write 側と共有する(`reliability-requirements.md` REL-U3-2 の write⇔check 対称 — 後述 reliability-design.md の単一 `computeProjectionHash`)。check 専用の別アルゴリズムを持たないことで、追加実装コスト・乖離リスク・二重計算を同時に排除する
- 走査は `dist/plugins/` 配下の 1 パス列挙(orphan 検出)+正本リストの 1 ループ(stale 検出)で、ファイル数に線形(`scalability-requirements.md` SCALE-U3-2 と整合)。索引・キャッシュは導入しない(少数プラグイン前提 A-3)

## 非該当カテゴリ

N/A — `performance-requirements.md` 非該当カテゴリ(レイテンシ SLO / スループット / 並行性)の N/A を参照継承(ビルド時単発実行)。

## セキュリティ検査の性能影響

`security-requirements.md` SEC-U3-1 の outDir 拒否集合検査は plan 段の lstat 数回/面で完結し、面数に線形(投影本体より軽量)。性能予算へ独立項目を立てない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:21:13Z
- **Iteration:** 1
- **Scope decision:** none

write⇔check hash 共有・OutDirRefusal 2 層・0-plugin no-op が要件と file:line 整合。Minor 2(security-design ヘッダーの tech-stack-decisions 欠落、REL-U3-1 の U3/U7 順序前提)は指摘直後に是正済み。

### Findings

- [Minor] security-design ヘッダー 6 点化 — 是正済み
- [Minor] REL-U3-1 に U3 先行の順序前提 1 文 — 是正済み
