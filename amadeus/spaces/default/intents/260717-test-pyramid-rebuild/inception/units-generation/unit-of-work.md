上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md

# ユニット定義 — test-pyramid-rebuild(#684)

本 intent は **設計・計画・台帳の materialize まで**(FR-7、requirements.md:40-43)。実テスト移設・run-tests.sh 実装変更・新分類器実装・比率/実行時間のハードコード・tier-aware ドリフトゲートの CI 実装配線は **すべて別 intent(Out)**。各ユニットで実装スコープ境界を明記する。#1157 未接触。

application-design の C1〜C5 を **3ユニット** へ分割する。境界基準は「独立してテスト可能・成果物として検証可能な単位」であり、size の唯一真実源(`classifyTestSize`、`tests/lib/test-size.ts:49`、ADR-04)を根とするデータ依存の一方向性(C1 → C3/C4/C5、component-dependency.md)を保つ。

すべての数値は RE 実測からの転記。tier 開放後の台帳スイープの measurement ref は `3917a283a953165866170d235d3dc25ad2fd3643`(tests/ 全域再帰 442ファイル。E-TPR-NR1 裁定。RE diff-base は `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)。ハードコードは検証劇場 Forbidden(org.md/team.md P2)。

## ユニット一覧(規模の正当化つき)

| ユニット | 対応コンポーネント | 対応 FR | 依存 | 規模見積り |
| --- | --- | --- | --- | --- |
| **U1 サイズ分類台帳** | C1 SizeLedger | FR-1 | なし(根) | 約560〜600行(442行台帳 materialize ≈460行 + `buildLedgerRow`/`buildSizeLedger` 純関数 ≈80〜120行 + 消費契約 ≈20行 = 560〜600) |
| **U2 層責務仕様+tier ゲート設計+予算ガイドライン** | C2 + C3 | FR-2 / FR-3 / FR-5 | U1 | 約240行(層責務規約 ≈60行 + tier-aware ゲート判定 IF 設計 ≈80行 + 比率目標文書 ≈40行 + 実行時間予算+tier別実測 ≈60行 = 240、いずれも点推定) |
| **U3 移設選定台帳+#683 整合計画** | C4 + C5 | FR-4 / FR-6 | U1 | 約280〜320行(163行選定台帳 ≈200行 + #683 tier キー整合計画 ≈80〜120行) |

U2・U3 はいずれも U1(台帳=データ源)に依存する。U1 が根であり、U2 と U3 は U1 に対して並行可能(相互依存なし、component-dependency.md の循環依存なし)。

## U1: サイズ分類台帳(SizeLedger)の materialize

### 目的

全テスト(`tests/` 全域再帰 = 442ファイル、既存 `test_pyramid` コレクタ `scripts/metrics-snapshot.ts:34-40` walk / `:99` と同型の無制限再帰列挙)を `classifyTestSize` で決定的に分類した **計測導出台帳** を正式 record 成果物として materialize する(C1、FR-1、AC-1a)。RE が既に決定的スイープを実施し scratch(`tpr-ledger.json`、scan-notes.md:57)へ 442 行を保持済み。本ユニットはこれを正式成果物へ昇格させる構築作業である。

### 成果物

- tier×size マトリクス(下表の実測値、tier は開いた集合で harness/lib 等の補助 tier を含む)と、全 442 行の台帳(各行 `file` / `tier` / `measured` / `declared` / `signals`)
- 出力形式は既存 `test_pyramid` コレクタの `${tier}_${size}` キー(`scripts/metrics-snapshot.ts:102`)と exact 一致(全域再帰で母集団が一致)
- 実測 ref(measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`)を台帳へ必須併記(measurement-ref-in-artifacts)

### tier×size マトリクス(RE 実測、tests/ 全域再帰、measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`)

| tier | small | medium | large | 計 |
| --- | --- | --- | --- | --- |
| unit | 48 | 162 | 1 | 211 |
| integration | 9 | 138 | 0 | 147 |
| e2e | 3 | 63 | 2 | 68 |
| smoke | 0 | 14 | 0 | 14 |
| harness | 0 | 1 | 0 | 1 |
| lib | 0 | 1 | 0 | 1 |
| **計** | **60** | **379** | **3** | **442** |

tier は閉じた4層列挙ではなく tests/ 直下サブディレクトリ由来の**開いた集合**(既知4 named tier + harness/lib 等の補助 tier)。**harness/lib は台帳に可視だが tier×size 規約の対象外**(補助 tier)。

比率(size 観点、442 母数): small 約13.6%(60/442)/ medium 約85.7%(379/442)/ large 約0.68%(3/442)。medium 偏重のアイスクリームコーン型。size 宣言(`// size:`)あり 53件 / なし 389件(442 − 53、harness/lib は無宣言 — grep 実測)、declared<measured ドリフト 0件(scan-notes.md:45-46)。

### 受け入れ基準

- AC-1a: 442 行全数が `classifyTestSize` のスイープ出力から材料化され、tier×size マトリクスが上表と一致する。ハードコードなし(検証劇場 Forbidden)
- AC-1b: 全 size 値が `classifyTestSize` 実行出力の転記であること、実測 ref(HEAD SHA)を明記していること(numbers-from-command-output-only / measurement-ref-in-artifacts)
- 台帳は「文書のふりをしたフィールド」でなく、消費者(下記 reuse inventory の3系統)を持つ派生物であること(construction.md「Code Completeness」)

### 既存インフラ再利用棚卸し(reuse inventory)

| 再利用対象 | 参照 | 再利用の仕方 | 新規機構の要否 |
| --- | --- | --- | --- |
| `classifyTestSize`(純関数、size 唯一真実源) | `tests/lib/test-size.ts:49` | 全数直呼び(in-process seam)。台帳は計測出力の転記のみで独自 size 判定を持たない(ADR-04) | 新規分類器は作らない(FR-7 Out) |
| `parseSizeAnnotation`(既存) | `tests/lib/test-size.ts:279` | 各行の `declared` 抽出に再利用 | 不要 |
| `test_pyramid` コレクタ | `scripts/metrics-snapshot.ts:97-104` | `${tier}_${size}` キー形式を台帳の出力契約として踏襲 | 不要 |
| tier 導出(ディレクトリ第1階層) | `scripts/metrics-snapshot.ts:100`(`split(/[\\/]/)[0]`) | 既存前提(A-2)を踏襲。新アノテーション契約を足さない(E-TPR-AD Q3=A) | 不要 |

**Q1 e4 留保の明記(分類経路の二重化禁止)**: 本ユニットの新規面は `buildLedgerRow` / `buildSizeLedger` の最小構成に留める(component-methods.md:22-49)。**既存 `test_pyramid` コレクタは自前の size 分類を持たず、本モジュール(= `classifyTestSize` の唯一真実源)を消費する一方向依存** とする。コレクタ現行 `scripts/metrics-snapshot.ts:101` の `classifyTestSize` 直呼びは本モジュール経由へ寄せ、分類の真実源を一本化する(E-TPR-AD Q1=B、components.md:35)。size 判定経路を二重化しない。

### 規模の正当化

既存の決定的関数(`classifyTestSize`)と既存キー形式・tier 導出を全面再利用するため、新規ロジックは台帳組み立ての薄い純関数(`buildLedgerRow` / `buildSizeLedger`)のみ。RE が既にスイープ結果を保持済みで実測値は確定しており、materialize の主コストは成果物としての整形と消費契約の明文化に閉じる。推定規模 **約560〜600行**(台帳 materialize ≈460行 + `buildLedgerRow`/`buildSizeLedger` 純関数 ≈80〜120行 + 消費契約 ≈20行 = 560〜600)。既存決定的関数の全面再利用により新規ロジックは薄い純関数のみで、実測値は RE 確定済み。

### 実装スコープ境界(Out 明記)

- 台帳生成スクリプトの実装・台帳ファイルの CI 恒常生成配線は **別 intent**(FR-1 は「成果物化=設計台帳」、生成スクリプト化は将来条件 requirements.md:47)
- 本ユニットは台帳の materialize(データ + 消費契約)まで。動的計測(#699、`test-size.ts:72-89`)への拡張は Out

## U2: 層責務仕様 + tier-aware ドリフトゲート設計 + 比率/実行時間予算ガイドライン

### 目的

各 tier の責務規約(C2)と tier-aware ドリフトゲートの判定 IF 設計(C3、実装 Out)、および比率目標(FR-2)・実行時間予算(FR-5)のガイドラインを確立する。size の判定は U1 台帳(= `classifyTestSize`)を突き合わせるだけで、独自 size 判定を持たない。

### 成果物

- **層責務規約(C2)**: tier が許容する size 上限。unit=small のみ / integration=medium まで / e2e=large まで。**smoke=integration 相当で medium まで許容**(E-TPR-AD Q2=B、blind 3票一致。留保 e1: 上限は medium までと明示し large は tier 是正対象、青天井にしない)。規約対象は **4 named tier(unit/integration/e2e/smoke)のみ**で、台帳が全域再帰で拾う **harness/lib 等の補助 tier は規約対象外**(E-TPR-NR1)。判定は `SIZE_ORDER`(`test-size.ts:28`)の序数比較(`allowedMaxSize`、入力ドメインは NamedTier)
- **tier-aware ドリフトゲートの判定 IF 設計(C3、実装 Out)**: tier に対し measured size が上限超過なら violation とする判別ユニオン `TierSizeViolation`(`{ kind: "none" } | { kind: "over-limit"; tier; allowed; measured }`)と序数比較の判定 IF。fail-closed 方針(`coverage-project-gate.ts` の 5値 FailReason に倣う)。**CI ジョブ配線・落ちる実証・exit code 契約は移設 intent(Out)**
- **比率目標ガイドライン(FR-2)**: small ≥ 50% / medium ≤ 45% / large ≤ 5% を named 目標定数として文書化。現状(small 13.6% / medium 85.7% / large 0.68%)からのギャップを明記。**強制ゲート化は Out**(ADR-02)
- **実行時間予算ガイドライン(FR-5)**: 各 tier(unit/integration/e2e/smoke)の実行時間予算(目標)を設計対象として宣言。**目標値は本ユニット内で各 tier の実行時間を実測したうえで選挙確定**(AC-5a、scope-document「実測前提・値は選挙」)。実測前は基準値を断定しない(constants-from-code)。**強制ゲート化は Out**

### 受け入れ基準

- AC-3a: tier×size 上限規約が unit=small / integration=medium / e2e=large / smoke=medium で確定し、`allowedMaxSize` の設計 IF が序数比較で表現されている
- AC-3b: tier-aware ドリフトゲートの判定 IF(`detectTierSizeViolation` / `buildTierDriftReport`)が設計として記され、既存 size ドリフトゲート(declared<measured)への非破壊温存(ADR-05)が明記されている。CI 配線は Out と明記
- AC-3c: smoke tier の扱い(integration 相当 medium まで)が設計で明記されている
- AC-2a/2c: 比率目標(50/45/5)が named 定数で文書化され、強制ゲート化 Out が明記されている
- AC-5a/5b: tier 別実行時間予算が設計対象として宣言され、値は本ユニットの実測 + 選挙で確定する routing が明記されている。実測前に基準値を断定していないこと

### 既存インフラ再利用棚卸し(reuse inventory)

| 再利用対象 | 参照 | 再利用の仕方 | 新規機構の要否 |
| --- | --- | --- | --- |
| `SIZE_ORDER` / `TestSize` 型 | `tests/lib/test-size.ts:28` / `:23` | tier 上限の序数比較・型に再利用。新規発明しない | 不要 |
| `detectWallClockDrift`(序数比較の同型) | `tests/lib/test-size.ts:113-121` | `detectTierSizeViolation` の設計テンプレートとして同型踏襲 | 既存関数は不変(非破壊) |
| `WallClockDrift` スマートコンストラクタ | `tests/lib/test-size.ts:106-108` | `TierSizeViolation` の「不変条件を型で運ぶ」設計手本 | 不要 |
| 既存 size ドリフトゲート | `tests/unit/t-test-size-drift.test.ts` / `test-size.ts:16-21` | **非破壊温存**(触らない)。tier-aware は直交する別観点の追加(ADR-05) | 二重実装・互換シムを足さない(Forbidden P5) |
| `coverage-project-gate.ts` の 5値 FailReason | architecture.md:82 | fail-closed 判定方針のテンプレートに倣う | 不要(方針参照) |
| run-tests.sh の tier 実行 | `tests/run-tests.sh` | tier 別実行時間の実測に既存ランナーを利用 | 不要(実測手段の再利用) |

### 規模の正当化

判定 IF は既存 `detectWallClockDrift` / `WallClockDrift` の同型で設計コストが低く、規約は文書、比率目標は RE 実測からの転記。新規コスト集中は「tier 別実行時間の実測」だが、既存 `run-tests.sh` の tier 別実行を再利用するため計測機構の新規開発は不要。推定規模 **約240行**(層責務規約 ≈60行 + tier-aware ゲート判定 IF 設計 ≈80行 + 比率目標文書 ≈40行 + 実行時間予算+tier別実測 ≈60行 = 240、いずれも点推定・設計/文書で実装は Out)。

### 実装スコープ境界(Out 明記)

- tier-aware ドリフトゲートの **実装・CI ジョブ配線・落ちる実証・exit code 契約は移設 intent**(FR-3 AC-3b、OQ-2)
- 比率・実行時間予算の **強制ゲート化は本 intent Out**(移設 intent、ADR-02)。本ユニットはガイドライン目標と判定 IF 設計まで
- 既存 size ドリフトゲートは非破壊温存(改変・置換しない、ADR-05)

## U3: 移設選定台帳 + #683 層別カバレッジ整合計画

### 目的

unit tier の非 small 163件を seam 化可能性で優先度付けした選定台帳(C4、FR-4)と、#683(Codecov)との層別カバレッジ測定経路の tier キー整合計画(C5、FR-6)を成果物化する。**実移設・CI 配線は Out**。

### 成果物

- **移設選定台帳(C4)**: unit tier ∧ 非 small = **163件**(medium 162 + large 1)を優先度付けした `MigrationCandidate[]`(`{ file, measured, signals, remediation, priority }`)。remediation 2区分:
  - (i) FS fixture I/O(`readFileSync` 等)を関数直接呼び出し(in-process seam)へ置換 → **size を正す**(seam-to-small)= 最優先(既存 seam-export 系ノルム適用先)
  - (ii) spawn の本質的 medium(CLI/hook を子プロセス起動して検証)→ **tier を正す**(retier-to-integration)= 次点
- **#683 層別カバレッジ整合計画(C5)**: C1 台帳の tier 分類(ディレクトリ第1階層)と既存 coverage lcov 経路(`ci.yml` の `coverage` ジョブ、`tests/run-tests.ts` の lcov 生成)を突き合わせる tier キー整合計画。`CoverageTierBinding[]`(`{ tier, ledgerKey, coveragePath }`)

### signal 内訳(重複計上 — 単純合算不可)

RE 実測(scan-notes.md:35): filesystem **153** / spawn **99** / network **1** / timer **1**。**これらは重複計上であり単純合算(153+99+1+1=254 ≠ 163)は不可**。1ファイルが FS と spawn を同時検出しうる(`classifyTestSize` は複数 signal を配列で返す)。母数は非 small ファイル数 **163**、内訳は signal 別出現数(ファイル数ではない)。選定台帳はファイル単位で優先度を持ち、signal 出現数を件数と混同しない。

### 受け入れ基準

- AC-4a: 163件の選定台帳が seam 化可能性で優先度付けされ、remediation 2区分(seam-to-small / retier-to-integration)で分類されている。signal 内訳が重複計上・単純合算不可と明記されている
- AC-4b: 実移設(テスト書き換え・移動)が Out と明記されている(選定台帳=計画まで)
- AC-6a: #683 との層別カバレッジ測定経路の tier キー整合計画が含まれ、tier 導出が既存前提(ディレクトリ第1階層)で両経路を揃えている。CI 配線・強制ゲート化が #683 スコープ(Out)と明記されている

### 既存インフラ再利用棚卸し(reuse inventory)

| 再利用対象 | 参照 | 再利用の仕方 | 新規機構の要否 |
| --- | --- | --- | --- |
| U1 SizeLedger(unit 非 small 行) | 本 intent U1 | 選定台帳の母集団(163件抽出)。独自 size 判定を持たず U1 を消費 | 不要 |
| seam-export 系ノルム | team.md seam-export-handler-amend / measure-before-blindspot-branch | (i) FS fixture I/O の in-process seam 化の適用手法として参照 | 不要(既存ノルム適用先) |
| 既存 coverage 経路(lcov) | `ci.yml` の `coverage` ジョブ / `tests/run-tests.ts`(component-inventory.md:150,153) | #683 整合計画で C1 tier キーと突き合わせる対象経路として再利用 | 不要(整合計画のみ、CI 配線 Out) |
| tier 導出(ディレクトリ第1階層) | `scripts/metrics-snapshot.ts:100` | C1 と coverage 経路の tier キーを揃える共通前提 | 不要 |

### 規模の正当化

母集団(163件)と signal 内訳は U1 台帳から機械抽出でき、優先度付けは remediation 2区分の決定的判定。#683 整合は tier キーの突き合わせ計画に閉じ CI 配線を含まない。新規機構は不要で、既存 U1 台帳・既存 coverage 経路・既存ノルムの再利用に依存する。推定規模 **約280〜320行**(163行選定台帳 ≈200行 + #683 tier キー整合計画 ≈80〜120行、CI 配線は含まない)。

### 実装スコープ境界(Out 明記)

- **実移設(テストの書き換え・移動・retier)は本 intent Out**(別 intent、AC-4b)。本ユニットは選定台帳=計画まで
- **#683 層別カバレッジの CI 配線・強制ゲート化は #683 スコープ(Out)**。本ユニットは tier キー整合計画のみ

## 後方互換・二重実装の非追加(全ユニット共通規律)

全ユニットで、要求にない後方互換レイヤー・フォールバック分岐・移行シム・二重実装を追加しない(Forbidden org.md/team.md P5、inception.md)。tier-aware ゲート(C3)は既存 size ドリフトゲートを **非破壊温存** した直交観点の追加であり、置換でも互換シムでもない(ADR-05)。size 判定経路も二重化せず `classifyTestSize` 単一真実源へ一本化する(U1 の Q1 e4 留保)。**N3(adapter・外部契約の先行着地禁止、#1158)充足**: tier-aware ゲート(C3)は設計のみで adapter/登録スロットを着地させない。U1 の生成 seam を実装する将来の実装 intent(FR-1 の Out、:68)では、消費側(コレクタ)配線を**その実装 intent 内で同時に**伴う一方向依存(e4)とし、実装だけ着地して未配線の dormant contract を残す形を禁じる。本 units-generation intent 自体は設計・台帳 materialize までで adapter を着地させない。
