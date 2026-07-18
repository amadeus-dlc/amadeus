上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md, team-practices.md

# コンポーネントメソッド設計 — test-pyramid-rebuild(#684)

各コンポーネントの公開インターフェースを **高レベルのメソッドシグネチャ**(入出力型・エラー方針)として示す。詳細ビジネスルール(regex パターンの意味論・境界値の正確な扱い等)は functional-design 送り。スタイルは functional-domain-modeling-ts(class-free、type+コンパニオン、判別ユニオン Result)。**実装は本 intent Out**(FR-7)— 以下は設計上の IF 契約であり実コードではない。

型注釈は既存 `tests/lib/test-size.ts`(observed `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)の型(`TestSize`、`SizeClassification`)を再利用し、新規に発明しない。

## C1: SizeLedger の公開 IF

### 既存の再利用(唯一真実源の seam)

台帳生成は既存の純関数 `classifyTestSize` を **直呼び**(in-process seam)する。新しい size 判定関数は作らない(ADR-04)。

```
// 既存(test-size.ts:49) — size の唯一真実源。再利用のみ、変更しない
classifyTestSize(source: string): SizeClassification
  // SizeClassification = { size: TestSize; signals: readonly string[] }  (:42-45)
```

### 新規(台帳生成の seam、設計 IF)

```
// 1ファイル分の台帳行を組み立てる純関数(seam = 純関数直呼び)
type LedgerRow = {
  readonly file: string          // repo 相対パス
  readonly tier: Tier            // 開いた集合: 4 named tier {unit|integration|e2e|smoke} + harness/lib 等の補助 tier
  readonly measured: TestSize    // classifyTestSize(source).size からの転記のみ
  readonly declared: TestSize | null  // parseSizeAnnotation(source).declared(既存 :279)
  readonly signals: readonly string[] // classifyTestSize(source).signals
}

buildLedgerRow(input: { file: string; tier: Tier; source: string }): LedgerRow
  // 入力: ファイルパス + tier + ソーステキスト
  // 出力: LedgerRow(measured/declared/signals はすべて既存純関数出力の転記)
  // エラー方針: 純関数。ソース読取は呼び出し側が所有(test-size.ts の pure 設計を踏襲 :81-82)

// 全行を集計して tier×size マトリクスと全行を持つ台帳へ
type SizeLedger = {
  readonly observedRef: string   // measurement-ref: HEAD SHA を必須で保持
  readonly rows: readonly LedgerRow[]
  readonly matrix: Readonly<Record<`${Tier}_${TestSize}`, number>>  // test_pyramid コレクタ互換キー(Tier 開放によりキーは string 空間 — harness/lib 行も可視化)
}

buildSizeLedger(rows: readonly LedgerRow[], observedRef: string): SizeLedger
  // First-Class Collection: マトリクス集計を台帳型の中に閉じる
  //   (既存 buildTestSizeReport :175-183 と同型 — summary math を型内に持つ)
  // 出力は決定的(file 昇順ソート、既存 :176 と同型)
```

- **入出力型**: 入力 = ソーステキスト+tier、出力 = `SizeLedger`。すべての size 値は `classifyTestSize` の転記(numbers-from-command-output-only)
- **エラー方針**: 生成は決定的スイープ。部分失敗は該当ファイルのみ(将来条件クラッシュ耐性 requirements.md:48)。ファイル読取失敗は該当行を欠落として記録し全体を止めない設計(FS 境界のエラーハンドリング construction.md)
- **マトリクスキー**: `${tier}_${size}`(既存 `test_pyramid` コレクタ `scripts/metrics-snapshot.ts:102` の集計キーと exact 一致)

## C2: LayerResponsibilitySpec の公開 IF

```
// tier は tests/ 直下サブディレクトリ由来の開いた集合(判別ユニオンの網羅前提は撤回、E-TPR-NR1)
type NamedTier = "unit" | "integration" | "e2e" | "smoke"   // size ピラミッド規約の対象(4 named tier)
type Tier = NamedTier | (string & {})   // + harness/lib 等の補助 tier(開いた型 — 既知リテラルの補完を残しつつ任意文字列を許容)

// tier が許容する size 上限を返す(規約の唯一定義点。入力ドメインは NamedTier に限定)
allowedMaxSize(tier: NamedTier): TestSize
  // unit -> "small" / integration -> "medium" / e2e -> "large"
  // smoke -> "medium"(integration 相当、E-TPR-AD Q2=B。large は tier 是正対象)
  // 入力: NamedTier / 出力: TestSize(上限)
  // エラー方針: NamedTier は閉じた判別ユニオンで網羅(exhaustive)。harness/lib 等の補助 tier は規約対象外で allowedMaxSize の入力ドメイン外(E-TPR-NR1)
```

- **入出力型**: 入力 = `NamedTier`、出力 = `TestSize`(許容上限)。台帳側の `Tier` は開いた集合で、規約対象は `NamedTier` に限定
- **エラー方針**: `NamedTier`(規約対象の4 tier)を閉じた判別ユニオンにし網羅チェックで size 上限を持たせる。`Tier` 全体は開いた型で harness/lib 等の補助 tier を許容し、size ピラミッド規約の対象外とする(parse-don't-validate — 網羅は規約対象の NamedTier に対してのみ成立)
- smoke の戻り値 = `"medium"`(integration 相当、E-TPR-AD Q2=B 確定。留保 e1: large は tier 是正対象、青天井にしない)

## C3: TierAwareDriftGate の公開 IF(設計のみ、実装 Out)

```
// tier 上限超過を判別ユニオンで表現(既存 WallClockDrift :106-108 と同型)
type TierSizeViolation =
  | { readonly kind: "none" }
  | { readonly kind: "over-limit"; readonly tier: NamedTier; readonly allowed: TestSize; readonly measured: TestSize }

// スマートコンストラクタ: measured が allowed を上限超過するときだけ over-limit を構成
//   (既存 detectWallClockDrift :113-121 と同型の序数比較 SIZE_ORDER :28)
detectTierSizeViolation(tier: NamedTier, measured: TestSize): TierSizeViolation
  // 入力: NamedTier(規約対象の4 tier)+ measured(C1 由来)/ 出力: TierSizeViolation
  // SIZE_ORDER[measured] > SIZE_ORDER[allowedMaxSize(tier)] のときのみ over-limit
  // harness/lib 等の補助 tier は規約対象外のため gate 入力に含めない(常に "none" 相当、E-TPR-NR1)
  // 「上限超過でないのに violation」を表現不能にする(不変条件を型で運ぶ)

// 台帳全体の tier-aware ドリフト集計(設計 IF)
type TierDriftReport = {
  readonly violations: readonly Extract<TierSizeViolation, { kind: "over-limit" }>[]
  readonly summary: { readonly total: number; readonly violationCount: number }
}
buildTierDriftReport(ledger: SizeLedger): TierDriftReport
  // 台帳の行のうち NamedTier(規約対象4 tier)の行のみを gate 対象にし、harness/lib 等の補助 tier 行は集計から除外(E-TPR-NR1)
```

- **入出力型**: 入力 = `{ tier, measured }`(または `SizeLedger`)、出力 = `TierSizeViolation` / `TierDriftReport`
- **エラー方針**: fail-closed(`coverage-project-gate.ts` の 5値 FailReason architecture.md:82 に倣う)。判定不能・入力欠落は fail。ただし **CI ジョブ配線・落ちる実証・exit code 契約は移設 intent**(本 intent は判定 IF の設計のみ、FR-3 AC-3b)
- **既存ゲートとの関係**: `detectWallClockDrift`(declared-vs-measured)には触らない。`detectTierSizeViolation` は別関数として追加(非破壊、ADR-05)

## C4: MigrationSelectionLedger の公開 IF

```
type Remediation = "seam-to-small" | "retier-to-integration"

type MigrationCandidate = {
  readonly file: string
  readonly measured: TestSize
  readonly signals: readonly string[]      // FS / spawn / network / timer(重複しうる)
  readonly remediation: Remediation
  readonly priority: number                // seam 化可能性が高いほど上位
}

// unit tier の非 small 行から選定台帳を組み立てる(計画 — 実移設 Out)
buildMigrationLedger(ledger: SizeLedger): readonly MigrationCandidate[]
  // 入力: C1 台帳(unit ∧ 非 small = 163件 を抽出)
  // 出力: 優先度付き選定台帳
  //   remediation 判定: filesystem signal 主体 -> seam-to-small(最優先)
  //                     spawn signal 主体      -> retier-to-integration
  // エラー方針: 純関数。signal 内訳は重複計上のため単純合算不可(FS 153/spawn 99/net 1/timer 1)
```

- **入出力型**: 入力 = `SizeLedger`(unit 非 small 163件)、出力 = `MigrationCandidate[]`
- **エラー方針**: 純関数。母数 = ファイル数 163、signal 内訳 = 出現数(重複計上、単純合算不可)を IF コメントで明示
- 本 intent は選定台帳=計画まで。実移設ロジックは Out

## C5: CoverageIntegrationPlan の公開 IF

```
// 層別カバレッジ経路の tier キー整合を記述する計画データ(実装 Out)
type CoverageTierBinding = {
  readonly tier: Tier
  readonly ledgerKey: `${Tier}_${TestSize}`   // C1 台帳側キー
  readonly coveragePath: string               // 既存 lcov 経路側の tier 識別
}
buildCoverageIntegrationPlan(ledger: SizeLedger): readonly CoverageTierBinding[]
```

- **入出力型**: 入力 = C1 台帳 + 既存 coverage 経路、出力 = tier 別バインディング計画
- **エラー方針**: 計画データ生成のみ。CI 配線・強制ゲートは #683 スコープ(Out)

## メソッド設計の共通規律

- すべての size 値は `classifyTestSize` の計測出力の転記(独自判定関数なし、ADR-04)
- 判別ユニオン + スマートコンストラクタで不変条件を型に運ぶ(既存 `WallClockDrift` `:101-121` の踏襲)
- 純関数を基本とし、FS 読取・duration 計測などの副作用は呼び出し側が所有(既存 `test-size.ts:81-82,193-198` の pure 設計方針を踏襲)
- 詳細ビジネスルール(remediation 判定閾値の正確な定義、smoke 上限値、tier 導出方式)は functional-design と選挙(questions)へ委ねる
