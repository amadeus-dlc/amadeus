上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md, scan-notes.md

本ユニット U3 のユーザー価値は「是正計画を materialize する — 何を・どの順で直すかを seam 化可能性で優先度付けし、カバレッジ経路と整合させる」(unit-of-work-story-map.md の U3 段)。

# ドメインエンティティ — U3 移設選定台帳 + #683 層別カバレッジ整合計画

本書は U3 が扱うドメイン型を functional-domain-modeling-ts スタイル(class-free、type + コンパニオンオブジェクト、ブランド型 + スマートコンストラクタ、判別ユニオン Result — project.md「Code Style」DECIDED 2026-07-08)で定義する。**既存 `tests/lib/test-size.ts`(observed `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)の型・U1 の台帳型を再利用し、新規に発明しない**(component-methods.md:7「型注釈は既存 test-size.ts の型を再利用し、新規に発明しない」、components.md C4)。実装は本 intent Out — 以下は設計上の型契約。現行 HEAD `6c0f5b547889e5d3bdd6e3316e461d16a25a39f9`(`git rev-parse HEAD` 実測)。#1157 未接触。

## 再利用する既存ドメイン型(新規発明しない)

| 型 | 定義 | 再利用の仕方 |
| --- | --- | --- |
| `TestSize` | `tests/lib/test-size.ts:23`(verbatim: `export type TestSize = "small" \| "medium" \| "large";`)判別ユニオン | `MigrationCandidate.measured` の値型。新規 size 型を作らない(ADR-04) |
| `SizeClassification` | `tests/lib/test-size.ts:42-45`(`{ size: TestSize; signals: readonly string[] }`)。`classifyTestSize`(`:49`)の戻り型 | `signals` の源。母集団抽出は `.size`、内訳は `.signals` を消費 |
| `Tier` / `NamedTier`(U1 で定義) | `Tier` = `NamedTier \| (string & {})` の開いた集合、`NamedTier` = `unit \| integration \| e2e \| smoke`(U1 domain-entities.md D2、component-methods.md C1 `LedgerRow.tier`) | 母集団の tier 条件(`unit`)・`CoverageTierBinding.tier` に再利用。`Tier` は harness/lib 等の補助 tier を含む開いた型(既存前提=ディレクトリ第1階層、A-2 の型付け) |
| `SizeLedger` | U1 domain-entities.md(component-methods.md C1 `{ observedRef, rows, matrix }`) | C4/C5 の入力(母集団抽出元・整合計画元)。`buildMigrationLedger` / `buildCoverageIntegrationPlan` が消費 |

`Tier` は既存コード上は文字列(`scripts/metrics-snapshot.ts:100` の split 結果)であり、U1 の台帳型でも **開いた集合** として持つ(U1 domain-entities.md、components.md C1)。tests/ 全域再帰に整合し harness/lib 等の補助 tier を含む(E-TPR-NR1)。U3 の母集団抽出は `unit`(named tier)条件のみを使い、`CoverageTierBinding` は全 tier を対象にしうる。新アノテーション契約を足さない(E-TPR-AD Q3=A、components.md C5)。size 判定は `classifyTestSize` に閉じ、U3 は独自 size 型・判定を発明しない(unit-of-work.md:140、ADR-04)。

## D1: MigrationCandidate(選定台帳の要素)

C4 の中核ドメイン型。unit 非 small 163件(R1、business-rules.md)の各行を優先度付き選定候補として表す(component-methods.md C4、components.md C4):

```
type MigrationCandidate = {
  readonly file: string                    // repo 相対パス(U1 LedgerRow.file 由来)
  readonly measured: TestSize              // classifyTestSize 由来の measured(C1、転記のみ)
  readonly signals: readonly string[]      // classifyTestSize 由来の signals(FS/spawn/network/timer、重複しうる)
  readonly remediation: Remediation        // D2(seam-to-small | retier-to-integration)
  readonly priority: number                // seam 化可能性が高いほど上位(R4)
}
```

- 全フィールドは U1 台帳(= `classifyTestSize` 出力)の転記または決定的導出であり、独自 size 判定を持たない(ADR-04、unit-of-work.md:140)。`measured` / `signals` は転記、`remediation` / `priority` は R2/R4 の決定的分類。
- **各フィールドの実消費者**(装飾フィールド禁止、construction.md「文書のふりをしたフィールド禁止」):

| フィールド | 実消費者 | 用途 |
| --- | --- | --- |
| `file` | 移設 intent(別 intent)の是正対象 | どのファイルを直すかを移設実装へ渡す |
| `measured` | 移設 intent / business-logic-model.md 適用結果 | 現 size(seam 化 or retier の判定材料、R2) |
| `signals` | R2 remediation 分類 / business-rules.md R3 内訳 | 主体 signal で是正方向を決める入力(FS/spawn 判定) |
| `remediation` | 移設 intent の是正方式選択 | `seam-to-small` = 関数直呼び化 / `retier-to-integration` = integration 移設 |
| `priority` | 移設 intent の着手順(R4) | seam 化容易性順の実行計画 |

`remediation` / `priority` は本 intent 内でも business-logic-model.md「選定フロー」で母集団分類・順序付けに使い、移設 intent(FR-4)が着手方式・着手順として消費する。装飾ではなく消費者を持つ(unit-of-work.md:49 相当の消費契約規律)。

## D2: Remediation(判別ユニオン)

remediation 方向を閉じた判別ユニオンで表す(component-methods.md C4、components.md C4「優先度付けの設計(2区分)」):

```
type Remediation = "seam-to-small" | "retier-to-integration"
```

- `seam-to-small`: filesystem 主体の行を in-process seam 化して **size を正す**(R2、最優先)。
- `retier-to-integration`: spawn 主体の行を integration へ移して **tier を正す**(R2、次点)。
- **閉じた判別ユニオン**で網羅チェックを可能にし、未知 remediation を型で表現不能にする(parse-don't-validate、component-methods.md C4)。RE 実測の signal 種別(FS/spawn/network/timer、scan-notes.md:40)から本 intent の母集団(unit 非 small)で意味を持つ2区分に閉じる。network/timer は出現数各1で FS/spawn 主体判定に吸収される(business-rules.md R3、母集団のほぼ全数が FS/spawn 起因)。
- **実消費者**: 移設 intent が是正方式(seam 化 or retier)の分岐に使う。本 intent は分類まで(実移設 Out、FR-4 AC-4b)。

## D3: CoverageTierBinding(#683 整合計画の要素)

C5 の中核ドメイン型。C1 台帳の tier キーと既存 coverage lcov 経路の tier 識別を突き合わせる整合計画データ(component-methods.md C5、components.md C5、FR-6 AC-6a):

```
type CoverageTierBinding = {
  readonly tier: Tier                        // 対象 tier(D2/U1 Tier 再利用)
  readonly ledgerKey: `${Tier}_${TestSize}`  // C1 台帳側キー(scripts/metrics-snapshot.ts:102 と同形)
  readonly coveragePath: string              // #683 が層別 lcov を出力する計画上の tier キー付きパス(tier からの純命名規約で導出、既存経路の読取はしない)
}
```

- `ledgerKey` は既存 `test_pyramid` コレクタの `${tier}_${size}` キー(`scripts/metrics-snapshot.ts:102`、verbatim: `values[`${tier}_${size}`] = (values[`${tier}_${size}`] ?? 0) + 1;`)と同形式(component-methods.md C5、components.md C5)。
- `coveragePath` は **tier からの純命名規約で導出する計画上のパス**(例: `${tier}` を層別 lcov 出力先へ写す規約)であり、**既存 coverage 経路のデータを読み取らない**(公開 IF `buildCoverageIntegrationPlan(ledger: SizeLedger)` は `ledger` のみを引数に取る純関数 — component-methods.md:134、副作用なし)。現状 coverage は tier 非分離の単一 `lcov.info`(`tests/run-tests.ts:619-635` の `combineCoverageReports`、business-rules.md R5)であり **既存の per-tier パスは存在しない**ため、`coveragePath` は #683 が層別 lcov を導入する際に出力すべき tier キー整合先を**計画値として記述する**(既存値の読取ではない。実 lcov 生成の配線は #683 スコープ、component-inventory.md:150,153)。
- **各フィールドの実消費者**(装飾フィールド禁止):

| フィールド | 実消費者 | 用途 |
| --- | --- | --- |
| `tier` | #683 カバレッジ担当(別スコープ) | 層別カバレッジをどの tier で束ねるか |
| `ledgerKey` | C1 台帳との突き合わせ | 台帳側 `${tier}_${size}` と整合 |
| `coveragePath` | #683 の層別 lcov 配線計画 | coverage 経路側でその tier をどう識別するか |

- 本 intent は tier キー整合の **計画データ**まで。CI 配線・層別 lcov 生成・強制ゲート化は #683 スコープ(Out、components.md C5、unit-of-work.md:152)。

## コンパニオン(組み立て純関数、設計 IF — 実装 Out)

型のコンパニオンは母集団抽出・整合計画の純関数(component-methods.md C4/C5、実装は Out):

- `buildMigrationLedger(ledger: SizeLedger): readonly MigrationCandidate[]`(component-methods.md C4)— U1 台帳から unit ∧ 非 small = 163件を抽出し優先度付き選定台帳を組む。純関数、独自 size 判定なし。
- `buildCoverageIntegrationPlan(ledger: SizeLedger): readonly CoverageTierBinding[]`(component-methods.md C5)— tier ごとに1バインディングを計画。計画データ生成のみ。

いずれも純関数で、FS 読取・CI 配線などの副作用は持たない(既存 `test-size.ts:81-82` の pure 設計方針を踏襲、component-methods.md「純関数を基本とし副作用は呼び出し側が所有」)。**実コード実装は本 intent Out**(FR-4/FR-6、services.md S3)。

## 実装スコープ境界(Out 明記)

- 上記型・コンパニオン純関数の **実コード実装・実移設・#683 CI 配線・強制ゲート化は別 intent/#683 スコープ**(FR-4 AC-4b requirements.md:27、FR-6 AC-6a requirements.md:38、unit-of-work.md:149-152)。本書は型契約の設計まで。
- 既存 `TestSize` / `SizeClassification` / `Tier` / `SizeLedger` は **再利用のみ**(変更しない、ADR-04)。新規 size 型・判定を発明しない(unit-of-work.md:140)。
- 数値(163・FS153/spawn99/net1/timer1)はすべて RE 実測転記(scan-notes.md:34-35)であり、型定義に埋め込まず business-rules.md の実測転記表で扱う(検証劇場 Forbidden P2)。adapter/登録スロット(移設ロジック・層別 lcov 配線)の先行着地はしない(N3、unit-of-work.md:156)。規模記述は行数見積り(#1158 N1/N2)。
