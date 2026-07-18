上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md, scan-notes.md

本ユニット U3 のユーザー価値は「是正計画を materialize する — 何を・どの順で直すかを seam 化可能性で優先度付けし、カバレッジ経路と整合させる」(unit-of-work-story-map.md の U3 段)。

# 業務ルール — U3 移設選定台帳 + #683 層別カバレッジ整合計画

本書は U3 が定める **母集団抽出ルール**(C4)、**remediation 分類ルール**(C4)、**優先度ルール**(C4)、**signal 内訳の計上ルール**(C4)、**#683 tier キー整合ルール**(C5)を記す。数値はすべて RE 実測(scan-notes.md)からの転記であり、独自判定・ハードコードを持たない(unit-of-work.md:9「ハードコードは検証劇場 Forbidden」、検証劇場 Forbidden org.md/team.md P2)。size 判定は既存 `classifyTestSize`(`tests/lib/test-size.ts:49`)に閉じ、本ユニットは size 判定を一切再実装しない(ADR-04、components.md C4)。本 intent は業務ルールの設計まで(実移設・CI 配線・強制ゲート化 Out)。

実測 ref: measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`(tests/ 全域再帰 442ファイル、E-TPR-NR1、measurement-ref-in-artifacts。RE diff-base は `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)。#1157 未接触。

## R1: 母集団抽出ルール(unit ∧ 非 small = 163)

選定台帳の **母集団** は U1 SizeLedger のうち次の条件を満たす行とする(components.md C4「unit tier ∧ 非 small の行(163件)」、component-methods.md C4「unit ∧ 非 small = 163件 を抽出」):

- 条件: `tier === "unit"` **かつ** `measured !== "small"`
- tier 導出は既存前提 = ディレクトリ第1階層(`scripts/metrics-snapshot.ts:100`、verbatim: `const tier = relative(join(env.repoRoot, "tests"), file).split(/[\\/]/)[0];`)。新アノテーション契約を足さない(components.md C4、E-TPR-AD Q3=A)
- **母数 = 163件**(RE 実測転記、scan-notes.md:34「unit 211件中 163件が非 small(medium 162+large 1)」)。内訳 medium 162 + large 1

この母数はハードコードでなく U1 台帳(= `classifyTestSize` 決定的スイープ出力)からの機械抽出結果である(独自判定なし、unit-of-work.md:140、numbers-from-command-output-only)。

## R2: remediation 分類ルール(signal 主体で2区分)

各母集団行の是正方向を、その行の `signals`(`classifyTestSize` 出力)の **主体** で分類する(components.md C4「優先度付けの設計(2区分)」、unit-of-work.md:121-125):

| 判定条件(signal 主体) | remediation | 是正方向 | 根拠ノルム |
| --- | --- | --- | --- |
| filesystem 主体(`readFileSync` 等の fixture I/O) | `seam-to-small` | **size を正す**(in-process seam 化で small 化) | 既存 seam-export 系ノルム(team.md seam-export-handler-amend / measure-before-blindspot-branch) |
| spawn 主体(CLI/hook を子プロセス起動して検証) | `retier-to-integration` | **tier を正す**(integration へ移設) | tier×size 規約(C2、U2)適合 |

- (i) filesystem 主体は size の誤り(FS fixture I/O が medium シグナルを発火、scan-notes.md:16「filesystem → medium: node:fs・readFileSync…」)であり、関数直接呼び出しへ置換して size を正す(seam-to-small、最優先)。
- (ii) spawn 主体は size ではなく tier の誤り(子プロセス起動は本質的 medium、scan-notes.md:16「spawn → medium: child_process・spawnSync…」)であり、integration へ移すことで tier×size 規約に適合する(retier-to-integration、次点)。
- **分類は signal 主体の決定的判定**であり独自 size 判定を持たない(component-methods.md C4「filesystem signal 主体 -> seam-to-small / spawn signal 主体 -> retier-to-integration」、ADR-04)。

## R3: signal 内訳の計上ルール(重複計上・単純合算不可)

母集団 163件の signal 内訳(RE 実測、scan-notes.md:40、measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`):

| signal | 出現数 | 種別(scan-notes.md:14-17) |
| --- | --- | --- |
| filesystem | **153** | medium シグナル |
| spawn | **99** | medium シグナル |
| network | **1** | large シグナル |
| timer | **1** | medium シグナル |

- **重複計上・単純合算不可**: `153 + 99 + 1 + 1 = 254 ≠ 163`。1ファイルが FS と spawn を同時検出しうるため、signal 出現数の総和は母集団ファイル数と一致しない(unit-of-work.md:126-128、component-methods.md C4「signal 内訳は重複計上のため単純合算不可」)。機序: `classifyTestSize` は検出した全 signal を配列で `push` する(`tests/lib/test-size.ts:55-60`、verbatim ループ: `if (re.test(code)) { signals.push(name); … }`)。
- **母数 = ファイル数 163、signal 内訳 = 出現数(ファイル数ではない)**。選定台帳はファイル単位で priority を持ち、signal 出現数を件数と混同しない(unit-of-work.md:128、requirements.md:26)。
- これらの数値は RE 実測の転記であり、U3 で独自に再判定しない(数値 RE 実測転記、独自判定なし、検証劇場 Forbidden P2)。

## R4: 優先度ルール(seam 化容易性)

priority は **seam 化可能性(是正の効果対費用)** の順序とする(components.md C4「seam 化可能性が高いほど上位」、component-methods.md C4「priority: number // seam 化可能性が高いほど上位」):

- `seam-to-small`(size を直接正せる、in-process seam 化で small 化)= **上位**。既存 seam-export 系ノルムの適用先で、費用対効果が高い(unit-of-work.md:123)。
- `retier-to-integration`(配置移動、tier を正す)= **次点**(unit-of-work.md:124)。
- priority は移設 intent(別 intent)の **着手順**を渡す計画値であり、本 intent は実移設を行わない(FR-4 AC-4b、requirements.md:27)。priority は「文書のふりをしたフィールド」ではなく移設 intent が消費する(construction.md「Code Completeness」、domain-entities.md D1 の消費者表)。

## R5: #683 tier キー整合ルール(ディレクトリ第1階層で両経路を揃える)

#683(Codecov)層別カバレッジ経路と C1 台帳の tier キーを **ディレクトリ第1階層**で揃える(components.md C5、FR-6 AC-6a、requirements.md:38、A-2):

- **共通前提 = ディレクトリ第1階層**: C1 台帳側は `${tier}_${size}` キーの tier 部分(`scripts/metrics-snapshot.ts:102`)、既存 coverage 経路側も同じ第1階層(`split(/[\\/]/)[0]`)で tier を導出する(components.md C5「同じ tier 導出(ディレクトリ第1階層)」)。
- **既存 coverage 経路の現状 = tier 非分離**: 既存 lcov 生成(`ci.yml` の `coverage` ジョブ、`tests/run-tests.ts`、component-inventory.md:150,153)は per-file lcov を単一 `lcov.info` へ結合しており(`combineCoverageReports`、`tests/run-tests.ts:619-635`、verbatim: `const combined = join(coverageRoot, "lcov.info");`)、tier キーを持たない。整合計画はこの現状を出発点とし、#683 の層別測定を第1階層 tier で束ねる `CoverageTierBinding` を計画する(domain-entities.md D3)。
- **CI 配線・強制ゲート化は #683 スコープ(Out)**: 本ルールは tier キーをどう揃えるかの整合計画までで、層別 lcov 生成の CI 実装は #683 側(components.md C5「実装(層別カバレッジの CI 配線)は #683 側スコープ」、unit-of-work.md:152)。強制ゲートは作らない(services.md S3「強制ゲートは作らない(ガイドライン整合)」)。

## 実装スコープ境界(Out 明記)

- **実移設(テストの書き換え・移動・retier)は本 intent Out**(FR-4 AC-4b、requirements.md:27、unit-of-work.md:151)。R1〜R4 は選定・分類・優先度の設計ルールまで。
- **#683 層別カバレッジの CI 配線・層別 lcov 生成・強制ゲート化は #683 スコープ(Out)**(R5、FR-6 AC-6a、unit-of-work.md:152)。
- size 判定は `classifyTestSize` に閉じ、選定台帳は独自 size 判定を持たない(ADR-04、unit-of-work.md:140)。数値はすべて RE 実測転記(scan-notes.md)であり独自判定・ハードコードを持たない(検証劇場 Forbidden P2)。
- 後方互換レイヤー・フォールバック分岐・移行シム・二重実装を追加しない(Forbidden org.md/team.md P5、inception.md)。adapter/登録スロットの先行着地はしない(N3、unit-of-work.md:156)。規模記述は行数見積り(#1158 N1/N2、unit-of-work.md:17「約280〜320行(163行選定台帳 ≈200行 + #683 tier キー整合計画 ≈80〜120行)」)。
