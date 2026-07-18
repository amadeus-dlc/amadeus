上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md, team-practices.md

# コンポーネント設計 — test-pyramid-rebuild(#684)

本ステージは **設計(仕様・境界・ADR)まで** であり、実テスト移設・run-tests.sh 実装変更・新分類器実装・比率/時間のハードコード・tier-aware ドリフトゲートの実装は **すべて別 intent**(FR-7、requirements.md:40-43)。ここでいう「コンポーネント」は本 intent が成果物化する **設計上の境界単位**(台帳・仕様・ゲート設計・計画)であり、新規ランタイムサービスの導入ではない(services.md の N/A 根拠を参照)。

設計スタイルは functional-domain-modeling-ts(class-free、type+コンパニオンオブジェクト、ブランド型+スマートコンストラクタ、判別ユニオン Result)を前提とする(project.md「Code Style」DECIDED 2026-07-08)。既存 `tests/lib/test-size.ts`(observed `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)がこのスタイルの現物(`TestSize` 判別ユニオン、`classifyTestSize` 純関数、`WallClockDrift` スマートコンストラクタ)であり、本設計はその境界を崩さず追加する。

## C1: サイズ分類台帳(SizeLedger)

### 責務

全テスト(`tests/` 全域再帰 = 442ファイル、既存 `test_pyramid` コレクタ `scripts/metrics-snapshot.ts:34-40` walk / `:99` と同型の無制限再帰列挙。measurement ref HEAD `3917a283a953165866170d235d3dc25ad2fd3643` 実測)を `classifyTestSize`(`tests/lib/test-size.ts:49`)で決定的に分類した **計測導出台帳** の生成を設計する。台帳は tier×size マトリクス(tier は開いた集合 — 既知4 named tier {unit|integration|e2e|smoke} + harness/lib 等の補助 tier)と全行(file / measured / declared / signals)を持つ(FR-1、AC-1a)。

台帳の数値は `classifyTestSize` の実行出力からの転記のみ。ハードコードは検証劇場 Forbidden(org.md/team.md P2)。実測 ref(HEAD SHA)を必ず併記する(measurement-ref-in-artifacts)。

### 唯一の真実源

**size の唯一の真実源は `classifyTestSize`**(型 `TestSize` `:23`、`SIGNAL_PATTERNS` `:35-40`)。台帳はこの決定的関数のスイープ出力を機械転記した派生物であり、独自の size 判定ロジックを持たない。分類台帳が「文書のふりをしたフィールド」(construction.md「Code Completeness」)にならないよう、消費者を持つデータ構造として定義する。

### 公開インターフェース(境界)

- **入力**: テストファイル群のソーステキスト(`tests/**/*.test.ts`)+ tier(ディレクトリ第1階層、A-2)
- **出力**: `SizeLedger`(tier×size 集計 + 全行台帳)。形式は既存 `test_pyramid` コレクタの `${tier}_${size}` キー(`scripts/metrics-snapshot.ts:97-104`)と整合させる
- 生成は **決定的スイープ**(`classifyTestSize` 純関数の全数直呼び)。LLM fan-out ではない(team.md deterministic-function-direct-sweep、RE scan-notes:7)

### 消費者(3系統 + 整合面)

| 消費者 | 用途 | 参照 |
| --- | --- | --- |
| `test_pyramid` コレクタ | `${tier}_${size}` メトリクス集計の入力 | `scripts/metrics-snapshot.ts:97-104` |
| 移設 intent(別 intent) | 移設対象選定台帳(C4)の母集団 | FR-4 |
| #683 層別カバレッジ整合 | 層別カバレッジ測定経路の共有(C5) | FR-6 |

**配置=独立モジュール(tests/lib 配下)**: E-TPR-AD Q1=B(4/4)。コレクタ/移設 intent/#683 が本モジュールを共通利用する。**留保(e4)**: 本モジュールは `buildLedgerRow`/`buildSizeLedger` の最小構成に留め、**既存コレクタは自前の size 分類を持たず本モジュールを消費する一方向依存**とする(分類経路の二重化禁止 — コレクタ現行 `:101` の `classifyTestSize` 直呼びは本モジュール経由へ寄せ、分類の真実源を一本化)。この再利用関係を reuse inventory に明記する。

### 実装スコープ境界

台帳 **生成の設計**(スイープの決定的再生成方式・出力形式・消費契約)までが本 intent。生成スクリプトの実装・台帳ファイルの永続化は units-generation で検討し、実装は別 intent(FR-1 は「成果物化=設計台帳」、実生成スクリプト化は将来条件 requirements.md:47)。ただし RE が既に 442 行スイープを実施し scratch(`tpr-ledger.json`)へ保持済み(scan-notes:57)であり、マトリクス実測値(下表)は確定している。

### 現状マトリクス(RE 実測、tests/ 全域再帰、measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`)

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

比率(size 観点、442 母数): small 約13.6%(60/442)/ medium 約85.7%(379/442)/ large 約0.68%(3/442)。medium 偏重のアイスクリームコーン型(scan-notes:35)。

## C2: 層責務仕様(LayerResponsibilitySpec)

### 責務

各 tier(runner ディレクトリ層)の **責務の規約** を定義する。size(動的振る舞い)と scope/tier(配置)は独立軸(`test-size.ts:5-7` の設計コメント: t_wada gihyo / Google SWE ch.14)である前提の上で、tier が許容する size の上限を規約化する(FR-3、AC-3a)。tier×size 規約は **4 named tier(unit/integration/e2e/smoke)のみに課す**。台帳が全域再帰で拾う **harness/lib 等の補助 tier は規約対象外**(size ピラミッドの層序を持たない補助分類として台帳に可視化のみ)。

- **unit = small のみ**(純関数・ドメイン型の in-memory 単一スレッド検証)
- **integration = medium まで**(ツール・フック・FS 境界の単一マシン検証)
- **e2e = large まで**(ハーネス駆動・ネットワーク含む)

### smoke tier の扱い(AC-3c)

smoke tier(現状 14件すべて medium)は **integration 相当として medium まで許容** する規約に含める(E-TPR-AD Q2=B、2026-07-17 blind 3票一致)。`allowedMaxSize("smoke") = "medium"`。留保(e1): 上限は medium までと明示し、large は tier 是正対象とする(青天井にしない)。RE 実測では smoke は 0 small / 14 medium / 0 large — 現状すべて規約内。

### 公開インターフェース(境界)

- **入力**: tier 名(`unit|integration|e2e|smoke`)
- **出力**: 当該 tier が許容する `TestSize` 上限(`allowedMaxSize`)
- 判定は `SIZE_ORDER`(`test-size.ts:28`、small<medium<large)の序数比較で行う設計(既存 `detectWallClockDrift` `:113-121` と同型の序数比較)

### 所有

この規約は **設計文書としての規約** であり、強制する機構(ゲート)は C3 が別途設計する。規約自体は「size は classifyTestSize が真実源」という C1 の唯一真実源の上に成り立つ(規約は measured size を tier 上限と突き合わせるだけで、独自 size 判定を持たない)。

## C3: tier-aware ドリフトゲート(設計のみ — 実装 Out)

### 責務

tier に対し measured size が **tier 上限を超過** したら赤にする tier-aware ドリフトゲートの **設計を記す**(FR-3、AC-3b)。**実装は移設 intent**(OQ-2、requirements.md:55)。

### 既存 size ドリフトゲートの非破壊温存(C-4 / ADR-05)

既存の size ドリフトゲート(`declared < measured` で CI 赤、`tests/unit/t-test-size-drift.test.ts`、`test-size.ts:16-21` のアノテーション契約)は **非破壊で温存** する。tier-aware ゲートは既存ゲートの置換ではなく **別観点の追加**:

- **既存(declared-vs-measured)**: ファイルの `// size:` 宣言が measured を下回る「宣言詐称」を検出(縦の整合)。RE 実測で現状ドリフト 0件(scan-notes:46)
- **新設(tier-vs-measured、設計のみ)**: tier が許す上限を measured が超える「配置違反」を検出(横の整合)

両者は直交する観点であり、後方互換シムでも二重実装でもない(要求にない互換レイヤーは Forbidden org.md/team.md P5)。既存ゲートに触らず観点を足す「非破壊追加」であることを ADR-05 に根拠付けて明記する。

### 公開インターフェース(設計レベル)

- **入力**: 各ファイルの `{ tier, measuredSize }`(measured は C1 = `classifyTestSize` 由来)
- **出力**: 判別ユニオン `TierSizeViolation`(`{ kind: "none" } | { kind: "over-limit"; tier; allowed; measured }`)。既存 `WallClockDrift`(`:106-108`)と同型のスマートコンストラクタで「上限超過でないのに violation」を表現不能にする
- **エラー方針**: fail-closed(判定不能・入力欠落は fail 扱い、`coverage-project-gate.ts` の 5値 FailReason 正準テンプレート architecture.md:82 に倣う)。ただし本 intent は設計のみで CI ジョブ配線・落ちる実証は移設 intent(FR-7)

### tier の表現(設計論点)

tier は「ディレクトリ第1階層」で導出する既存前提(A-2、`test_pyramid` コレクタ `scripts/metrics-snapshot.ts:100` の `split(/[\\/]/)[0]`)を踏襲する(E-TPR-AD Q3=A、4/4)。新アノテーション契約は足さない(不要機構回避)。

## C4: 移設対象選定台帳(MigrationSelectionLedger)

### 責務

unit tier の非 small **163件**(medium 162 + large 1、scan-notes:39)を **seam 化可能性で優先度付け** した選定台帳を成果物化する(FR-4、AC-4a)。**移設の実装は本 intent Out**(AC-4b、別 intent)。

### signal 内訳(重複計上 — 単純合算不可)

RE 実測(scan-notes:40、observed `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`):

- filesystem: **153**
- spawn: **99**
- network: **1**
- timer: **1**

**注意: これらは重複計上であり単純合算(153+99+1+1=254 ≠ 163)は不可**。1ファイルが FS と spawn を同時検出しうる(`classifyTestSize` は複数 signal を配列で返す `:53-61`)。母数は非 small ファイル数 163、内訳は signal 別出現数(ファイル数ではない)。

### 優先度付けの設計(2区分)

| 区分 | 対象 | 是正方向 | 優先度 |
| --- | --- | --- | --- |
| (i) FS fixture I/O | `readFileSync` 等の fixture I/O を関数直接呼び出し(in-process seam)へ置換可能な分 | **size を正す**(small 化) | 最優先(既存 seam-export ノルム適用先) |
| (ii) spawn の本質的 medium | CLI/hook を子プロセス起動して検証する本質的 medium | **tier を正す**(size でなく配置)→ integration へ移設候補 | 次点 |

(i) は既存 seam-export 系ノルム(team.md seam-export-handler-amend / measure-before-blindspot-branch)の適用対象。(ii) は size ではなく tier の誤りであり、integration へ移すことで tier×size 規約(C2)に適合する。

### 公開インターフェース(境界)

- **入力**: C1 台帳のうち unit tier ∧ 非 small の行(163件)
- **出力**: `MigrationCandidate[]`(`{ file, measuredSize, signals, remediation: "seam-to-small" | "retier-to-integration", priority }`)
- 本 intent は **選定台帳=計画** まで。実移設(テスト書き換え・移動)は Out(FR-7)

## C5: #683 層別カバレッジ整合計画(CoverageIntegrationPlan)

### 責務

#683(Codecov ゲート)との **層別カバレッジ測定経路の共有** を計画に含める(FR-6、AC-6a、Issue 実装スコープ4)。

### 設計内容(計画レベル)

- tier(層)別のカバレッジ測定を、C1 台帳の tier 分類と同じ tier 導出(ディレクトリ第1階層)で共有する経路を計画する
- 既存 coverage 経路(`ci.yml` の `coverage` ジョブ、`tests/run-tests.ts` の lcov 生成 component-inventory.md:150,153)と C1 台帳の tier キーを整合させる
- 実装(層別カバレッジの CI 配線)は #683 側スコープ。本 intent は **整合計画** のみ

### 公開インターフェース(境界)

- **入力**: C1 台帳の tier 分類 + 既存 coverage lcov 経路
- **出力**: 層別カバレッジ測定経路の共有計画(どの tier キーで両者を突き合わせるか)
- 本 intent は計画まで。強制ゲート化・CI 配線は Out

## コンポーネント境界サマリ

| コンポーネント | 種別 | 本 intent の成果 | 実装スコープ |
| --- | --- | --- | --- |
| C1 SizeLedger | 台帳生成の設計 | 生成方式・形式・消費契約 | 生成スクリプト実装=別 intent |
| C2 LayerResponsibilitySpec | 規約仕様 | tier×size 上限規約 | — (規約=文書) |
| C3 TierAwareDriftGate | ゲート設計 | 判定 IF・非破壊温存根拠 | 実装=移設 intent |
| C4 MigrationSelectionLedger | 選定計画 | seam 化優先の選定台帳 | 実移設=別 intent |
| C5 CoverageIntegrationPlan | 整合計画 | 層別カバレッジ共有経路 | CI 配線=#683 |

すべての size 値は C1 = `classifyTestSize` の決定的計測に由来し、独自 size 判定を持つコンポーネントは存在しない(唯一真実源、ADR-04)。
