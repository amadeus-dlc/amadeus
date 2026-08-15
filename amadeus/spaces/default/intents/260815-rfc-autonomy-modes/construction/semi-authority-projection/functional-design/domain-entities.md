# Domain Entities — unit semi-authority-projection(U5)

> 上流入力: `component-methods.md`(C5 の 4 シグネチャ / C6 の 2 シグネチャ — 本書はこれを再利用し、必要な箇所だけ精緻化する)、`components.md` C5 / C6、`unit-of-work.md` U5 の owned files、`unit-of-work-story-map.md`(背骨 5「semi が軽くなる」)、`unit-of-work-dependency.md`(統合ポイント「U5 → U6/U7: `allowsOccurrence` の新意味論・投影/実効値関数」)、`requirements.md` FR-5 / FR-6 / FR-10、`services.md` S3、`decisions.md` ADR-2 / ADR-10。

## 1. 拡張する既存型

```ts
// amadeus-intent-autonomy.ts:510-516 — 分類を 1 種だけ増やす
export type ProhibitedEffectClassification =
  | "new-permission" | "irreversible" | "scope-out" | "norm-waiver" | "quality-waiver";  // 不変(FR-15)
export type EffectClassification =
  | "workflow-reversible"
  | "advisory-deferral"                 // 新設(ADR-2 / Q4=A)
  | ProhibitedEffectClassification;
```

- 不変条件: `advisory-deferral` を持つ `DecisionOptionEffect` は `ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS`(`amadeus-advisory-choice.ts:300-303`)経由でしか構築されない。他の構築点(例 `amadeus-intent-autonomy-production.ts:812-820`)は `workflow-reversible` 固定。
- `PROHIBITED_EFFECTS`(`-production.ts:102-108`)の配列内容は不変。`advisory-deferral` はこの配列に**入らない**ことが、禁止 5 種の意味論を保つ条件(ADR-2 の Alternatives Rejected C)。

## 2. 新設する値・定数

### 語彙の注意(同名 2 型の書き分け)

`AutonomyMode` という名前はコードベース内で 2 つの別物を指す。本書では次のとおり書き分ける。

| 本書の呼び方 | 実体 | 定義位置 |
|---|---|---|
| Intent mode | `"none" \| "semi" \| "full"` | `amadeus-intent-autonomy.ts:11`(`export type AutonomyMode`) |
| Construction 投影値 | `"autonomous" \| "gated"` | `amadeus-orchestrate.ts:2035`(module-private `type AutonomyMode`) |
| (第 3 の語彙)`ConstructionAutonomy` | `"autonomous" \| "gated" \| "unset"` | `amadeus-lib.ts:553` — recompose guard が使う |

```ts
// --- pure 層(amadeus-intent-autonomy.ts)---
// kind の全集合は型定義(:14 の InteractionKind)と同じ層に置く。production 層の
// private ALL_INTERACTIONS(-production.ts:76-81)はこれを import して置き換える
// (逆向きは循環 import になる — R-18a)。
export const ALL_INTERACTION_KINDS: readonly InteractionKind[] =
  ["stage-gate", "phase-gate", "walking-skeleton", "question"];

// semi が人間へ残す milestone の唯一の定義。SEMI_ROUTINE_INTERACTIONS はこの補集合
const SEMI_HUMAN_MILESTONES: readonly InteractionKind[] = ["phase-gate", "walking-skeleton"];
export const SEMI_ROUTINE_INTERACTIONS: readonly InteractionKind[] =
  ALL_INTERACTION_KINDS.filter((kind) => !SEMI_HUMAN_MILESTONES.includes(kind));

// WS ゲート種別の Stance 従属(C5 / Q9=A)。解決済みの 2 値のみを受ける純関数
firesWalkingSkeletonGate(stance: SkeletonStance): boolean;

// 投影規則の単一定義(C6)。引数は Intent mode、戻り値は Construction 投影値
projectConstructionAutonomy(mode: IntentAutonomyMode): ConstructionProjection;

// --- production 層(-production.ts)---
// 生の Skeleton Stance と Scope から 2 値へ解決する(SKELETON_ON_SCOPES を再利用)。
// I/O を伴うため pure 層には置かない
skeletonGateFiresFor(stateContent: string): boolean;
// interactionKind は解決済みフラグを受け、walkingSkeleton ∧ skeletonGateFires のときだけ
// "walking-skeleton" を返す(単一決定点 — R-17a)
interactionKind(input: { walkingSkeleton: boolean; phaseBoundary?: boolean; skeletonGateFires: boolean }): InteractionKind;

// --- 乖離検出(C6)---
detectProjectionDivergence(state: string): DivergenceReport | null;  // 全 mode。非 null は loud fail
type ConstructionProjection = "autonomous" | "gated";
type DivergenceReport = {
  readonly declared: IntentAutonomyMode | null;  // Intent Autonomy Mode(未知値・欠落は null)
  readonly recorded: string | null;              // Construction Autonomy Mode の生値(欠落は null)
  readonly expected: ConstructionProjection;
};
```

- `IntentAutonomyMode` は既存 `amadeus-intent-autonomy.ts:11` の `AutonomyMode` を指す別名表記(本書内の可読性のためであり、改名を要求するものではない)。
- `SEMI_ROUTINE_INTERACTIONS` の公開名・型は現行(`amadeus-intent-autonomy.ts:581`)のまま保つ。消費側(`-production.ts:88` の `autoDecidedKinds`、同 :537 の `semiAuthorityScope`)は無改変で新意味論を受け取る。
- `DivergenceReport` は「宣言 / 記録 / 期待」の 3 値を持つ。`recorded` を生の文字列で保持するのは、未知値と欠落を潰さず理由文へ出すため(FR-8 の UI 真実性 — 表示は実効値・原因は復元可能に)。
- 未投影の免除は **pair**(宣言 `none` ∧ `recorded === "unset"`)のときだけ `DivergenceReport` を生成しない(R-25)。`semi`/`full` × `unset` は `DivergenceReport` を生成する(`recorded` に生の `"unset"` を保持し理由文へ出す)。`expected` が 2 値(`autonomous | gated`)なのは期待側が常に宣言から導出されるため — `unset` を expected に持つ状態は存在しない。

## 3. 意味論だけを変える既存型

| 型・関数 | 現在地 | 変更 |
|---|---|---|
| `SemiAuthority.allowsOccurrence` | `amadeus-intent-autonomy.ts:636-640` | 第 3 項を `occurrence.phase !== "phase-boundary"` から milestone kind の否定へ。シグネチャ不変 |
| `SemiAuthority.authorizeEffect` | 同 :644-654 | 許容分類を 2 種へ。戻り型 `SemiEffectAuthorization` は不変 |
| `authorizeDecisionEffect` | 同 :987-996 | 同上。`EffectAuthorization` の失敗理由集合は不変 |
| `readAutonomyMode` | `amadeus-orchestrate.ts:2042-2054` | 投影規則を `projectConstructionAutonomy` に委譲し、乖離を loud fail へ。戻り型(Construction 投影値 `\| null`)は当面不変 |
| `writeAutonomyStateProjection` | `-production.ts:704-723` | :713 の三項式を `projectConstructionAutonomy(mode)` へ置換 |
| `interactionKind` | `-production.ts:189-192` | 入力へ `skeletonGateFires` を追加。`walkingSkeleton && skeletonGateFires` のときだけ `"walking-skeleton"` を返す(**WS stance ゲートの唯一の決定点** — R-17a) |
| `ProductionStageAutonomyInput.walkingSkeleton` / `OccurrenceInput.walkingSkeleton` | `-production.ts:228-235` / `:194-201` | **型・意味とも不変**。供給点(`amadeus-state.ts:3711`、`amadeus-orchestrate.ts:2820-2821`)は「construction の最初の in-scope ステージか」だけを表し続け、stance は下流で掛かる |

## 4. 不変条件

1. semi の許可集合 ∪ `SEMI_HUMAN_MILESTONES` = `ALL_INTERACTION_KINDS`、かつ交わりは空(補集合性)。
2. milestone kind の occurrence は、いかなる `SemiAuthorityScope` の内容でも semi 権限で自動裁定されない(scope 非依存の不変条件 — R-3)。
3. `Intent Autonomy Mode` が読める限り、`Construction Autonomy Mode` は `projectConstructionAutonomy` の像と一致する。一致しない状態でワークフローが進行することはない(loud fail)。
4. `advisory-deferral` を持つ効果は advisories 宣言由来のものだけ(構築点 1 箇所)。
5. `walking-skeleton` kind の occurrence は stance が `on` に解決されたときだけ生成される。この不変条件は 2 つの供給点のどちらから来た occurrence にも成立する(ゲートが共通下流 `interactionKind` にあるため — R-17a)。
6. 本 unit の実装は U5 owned files の内側で完結する。`amadeus-state.ts`(U3 owned)への書込を要求しない(R-17b)。

## 5. 意図的にモデル化しないもの

- **新しい `InteractionKind`**: `§13` と advisory は既存の `question` 種に載っており(`amadeus-advisory-choice.ts:332-338` が `kind: "question"` で occurrence を作る)、swarm の batch 境界は `InteractionKind` ではなく scheduling 投影(`amadeus-orchestrate.ts:3928-3934` の `owedBatchGate` が Construction 投影値のみを見る)で決まる。`component-methods.md` C5 の注記にある「§13, batch-boundary」は種の**新設**を要求しない。
- **semi 用 grant / TTL / 失効状態**: ADR-2 が grant-less を維持(R-5)。
- **`RecommendationOutcome`**: U1 所有。semi の人間ゲートは裁定順序 1 で表現するため、本 unit は contested を構築しない(ADR-1、R-4)。
- **park / waiting 状態**: U3 所有。本 unit は park guard の**廃棄済みであること**を前提条件として要求するだけで、状態自体は持たない(R-15)。
- **`--status` / statusline の表示型**: U7 / C8 所有。本 unit は実効値関数を export するのみ(R-16)。
- **`amadeus-log.ts` / `amadeus-state.ts` の presence 判定型**: 投影の意味変更が波及する面(R-21 / R-22)だが、いずれも本 unit の owned files 外。判定入力を何に差し替えるかは所有 unit の裁定に委ねる(R-23 の申し送り)。ここで型を先に決めると owned 外への設計の先取りになる。
