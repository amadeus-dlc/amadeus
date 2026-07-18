上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, unit-of-work.md, requirements.md, decisions.md, technology-stack.md

本 NFR は既存技術スタック(codekb `technology-stack.md`: TypeScript/ESM・Bun ランタイム・Biome・bun test)を前提とし、新規ランタイム依存を追加しない(project.md Forbidden: Bun-only 前提維持)。

# 性能要件 — U1 サイズ分類台帳(SizeLedger)

本書は U1(台帳生成)の**非機能特性(性能)**を規定する。対象は「442 テストファイル(tests/ 全域再帰)を `classifyTestSize` で決定的にスイープして台帳を材料化する」という U1 固有の作業に限る(business-logic-model.md:5,15)。テストスイート全体のランタイム SLO・比率目標・実行時間予算は本ユニット Out(unit-of-work.md:66-69、実行時間予算は U2/FR-5 の担当 requirements.md:29-34)。本 intent は**設計・台帳 materialize まで**であり、生成スクリプトの実コード・CI 恒常生成配線は Out(FR-1 将来条件 requirements.md:47、business-logic-model.md:53)。

実測 ref: 台帳の measurement ref は `3917a283a953165866170d235d3dc25ad2fd3643`(tests/ 全域再帰 442ファイル、E-TPR-NR1、scan-notes、business-rules.md:7、measurement-ref-in-artifacts。RE diff-base は `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)。

## PERF-1: 強制メカニズム = 既存の決定的純関数スイープ(新規 SLO を発明しない)

性能特性は**新規に発明せず、既に本番稼働している同型スイープから導出する**。台帳生成の中核処理(ファイル列挙 → `classifyTestSize(source)` の全数適用 → `${tier}_${size}` 集計)は、既存 `test_pyramid` コレクタが `scripts/metrics-snapshot.ts:97-104`(verbatim 実測)で**既に**実施している処理と同型である:

```
for (const file of env.listFiles(join(env.repoRoot, "tests")).filter((path) => path.endsWith(".test.ts"))) {
  const tier = relative(join(env.repoRoot, "tests"), file).split(/[\\/]/)[0];
  const size = classifyTestSize(env.readFile(file)).size;
  values[`${tier}_${size}`] = (values[`${tier}_${size}`] ?? 0) + 1;
}
```

- **強制メカニズム**: 分類は `classifyTestSize`(`tests/lib/test-size.ts:49`、verbatim: `export function classifyTestSize(source: string): SizeClassification`)の regex 純関数の全数直接適用であり、LLM fan-out ではない(business-logic-model.md:49、team.md deterministic-function-direct-sweep)。判定ブレ・トークンコストを持ち込まない。台帳の性能はこの純関数の計算量に支配される。
- **計算量**: ファイル数 N(N=442、`find tests -name '*.test.ts' | wc -l` 実測 442 — 既存コレクタと同型の全域再帰列挙)に対し O(N)。各ファイルは1回だけ読み取り・1回だけ分類(`buildLedgerRow` は純関数で FS を触らない、domain-entities.md:64-66、`test-size.ts:81-82` の PURE 設計踏襲)。scalability の追随根拠は scalability-requirements.md を参照。
- **数値目標の扱い**: U1 台帳生成に対する独立した実行時間 SLO(閾値・秒数)は**発明しない**。既存コレクタ `metrics-snapshot.ts` は当該スイープに文書化された時間予算を持たず(`scripts/metrics-snapshot.ts:97-104` に時間閾値の定義なし — 実測確認)、強制メカニズム側に導出元となる named constant が存在しないため、根拠のない要約帯(例「◯秒以内」)を置くことは constants-from-code / 検証劇場 Forbidden(org.md/team.md P2)に反する。よって独立 SLO は **N/A(反証可能根拠: 強制機構に導出元数値が不在)** とする。

## PERF-2: 性能特性の定性要件(SLO ではなく特性の明記)

数値 SLO を発明しない代わりに、台帳が満たすべき**定性的な性能特性**を強制メカニズムから導出して固定する。これらは実装 intent(生成スクリプト化、FR-1 Out)が満たすべき設計制約であり、本 intent では特性の宣言までとする。

- **NFP-1(単一パス・単一計測)**: 各ファイルはソース読取1回・`classifyTestSize` 呼び出し1回・`parseSizeAnnotation` 呼び出し1回に限る。同一ソースを複数回スキャンしない(business-logic-model.md:17-20 のロジックフローが各段を1回で通す設計)。size 判定経路は二重化しない(business-rules.md:44-46、classifyTestSize 単一真実源に一本化)。
- **NFP-2(集計の線形性)**: `buildSizeLedger` の tier×size マトリクス集計は行配列に対し O(N) の単純カウント(既存 `test-size.ts:175-183` `buildTestSizeReport` の summary math と同型、business-logic-model.md:22)。二重ループ・ソート以外の超線形処理を持たない(出力の file 昇順ソートは O(N log N) で決定性のためのみ、business-logic-model.md:22,47)。
- **NFP-3(既存機構の再利用による限界コスト0)**: 新規の計測機構・キャッシュ層・並列実行ワーカを導入しない。性能は既存 `classifyTestSize` と既存コレクタ形式の再利用に閉じ、新規性能インフラの追加はない(unit-of-work.md:52-58 reuse inventory、project.md Bun-only 前提維持)。tech-stack-decisions.md 参照。

**実装スコープ境界(Out 明記)**: 生成スクリプトの実行時間実測・ベンチマーク・CI 配線は本 intent Out(別 intent、business-logic-model.md:53、requirements.md:47)。本書は性能特性の設計・宣言までである。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architect-agent
**Date:** 2026-07-17T16:04:02Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | 解消（前回 Major） | `scalability-requirements.md:9,15-18`; `tech-stack-decisions.md:15` | 前回の「4 named tier に閉じた列挙が既存コレクタの `tests/` 全域再帰と不一致」という指摘は解消済み。母集団を 442 件の全域再帰へ揃え、`Tier` を開いた集合、`NamedTier` を規約対象4種、harness/lib を可視化のみの補助 tier とする契約が、上流 `domain-entities.md:20-30` および現行コレクタと整合した。 | 追加修正なし。 |
| 2 | Minor | `scalability-requirements.md:18` | 補助 tier の規約対象外を裏付ける参照が `domain-entities.md:26-27` を指すが、該当説明は実際には `domain-entities.md:28-29`。本文の契約自体は正しく、実装判断を曖昧にしないため blocking ではない。 | 次回の文書整備時に参照行を `:28-29` へ更新する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| audit shard の直近手動 sensor fire（`required-sections`） | PASS 5/5（fire id: `a1de3e94`, `213ff48f`, `caec87e8`, `491b237c`, `d0d1e1ae`） | U1 NFR 5成果物の必須節をすべて確認。 |
| audit shard の直近手動 sensor fire（`upstream-coverage`） | PASS 5/5（fire id: `d4569aaf`, `fbca43e1`, `568db403`, `872d802c`, `beea454b`） | 5成果物すべてで必須上流参照を確認。 |
| 現行 `test_pyramid` collector の独立実行 | PASS: 442 件、unit 48/162/1、integration 9/138/0、e2e 3/63/2、smoke 0/14/0、harness 0/1/0、lib 0/1/0 | 文書の tier×size マトリクスと完全一致。measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` から現 HEAD まで `tests/` と `scripts/metrics-snapshot.ts` に差分なし。 |
| `find tests -type f -name '*.test.ts'` + tier 別集計 | PASS: 総数 442、tier 件数 211/147/68/14/1/1 | 4 named subdir 限定ではなく `tests/` 全域再帰で harness/lib を含むことを確認。 |
| 現物契約照合（`scripts/metrics-snapshot.ts:34-40,97-104`; `tests/lib/test-size.ts:23-61`; 上流設計） | PASS | 再帰列挙、ディレクトリ第1階層 tier、`classifyTestSize` 単一真実源、開いた `Tier` / 閉じた `NamedTier` の分離が一貫。実装 Out と #1157 着手禁止も維持。 |

### Summary

前回 Major は E-TPR-NR1 の修正と現行コレクタの独立実測により解消した。新規 blocking finding はなく、行番号参照の Minor 1件のみのため READY と判定する。
