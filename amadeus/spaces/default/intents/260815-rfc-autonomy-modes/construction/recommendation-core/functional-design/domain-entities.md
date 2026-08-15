# Domain Entities — unit recommendation-core(U1)

> シグネチャは component-methods.md C1 / C2 を正本として再利用し、必要な箇所のみ精緻化する。スタイルは project.md Code Style(class-free、type + コンパニオンオブジェクト、ブランド型 + スマートコンストラクタ、判別ユニオン Result)に従う。

## 本 unit が所有する型

### `RecommendationOutcome`(判別ユニオン)

```ts
type RecommendationOutcome =
  | { readonly kind: "unique"; readonly optionId: string; readonly basis: RecommendationBasis }
  | { readonly kind: "contested"; readonly candidates: readonly Candidate[]; readonly reason: string }
  | { readonly kind: "none"; readonly reason: string };
```

裁定点における「推奨がどう決まったか」の全体を表す値。RFC-0001 Guide-level「裁定の順序」の 2(一意 → 採用)と 3(不一意 → 人間 / 中断)の境界を、実行時分岐ではなく型の判別子として持つ。

**不変条件**
- `unique.optionId` は当該 `InteractionOccurrence.optionIds` の要素である(既存の妥当性検査 `amadeus-intent-autonomy.ts:958` / `:967` と同じ述語)。
- `contested.candidates.length >= 2`。1 件以下は構築時に例外(R-2)。
- `contested.candidates` の `rank` は 1 起点の連番で重複しない(推奨順の提示に使う)。
- `reason` は非空文字列。空文字は「理由を書かない contested」を許すため禁止。

### `Candidate`

```ts
type Candidate = { readonly optionId: string; readonly rationale: string; readonly rank: number };
```

contested の提示で 1 候補分を担う値。`rationale` が RFC-0001 の UX 契約が要求する「各候補の根拠」に対応する。

**不変条件**: `optionId` は occurrence の選択肢集合の要素。`rationale` は非空。`rank >= 1`。

### `RecommendationBasis`

```ts
type RecommendationBasis = {
  readonly source: "norm" | "prior-ruling" | "election" | "agent";
  readonly fingerprint: string;
};
```

unique がどの梯子段の根拠で決まったかを保持する。`source` の 4 値は既存 `DecisionBasisKind`(`amadeus-intent-autonomy.ts:766-773` — `mode-semi` / `grant-gate` / `confirmed-policy` / `norm` / `history` / `solo-election` / `agent-recommendation`)の **裁定根拠としての側面** への写像であり、置換ではない。`confirmed-policy` と `history` はどちらも「過去の裁定」であるため `prior-ruling` へ、`mode-semi` / `grant-gate` は根拠ではなく権限であるため source には現れない(ゲート導出器は `source: "norm"` を使う)。

**不変条件**: `fingerprint` は SHA-256 形式(既存 `SHA256` 述語と同一)。**算出規則は本 unit の外**(ADR-11 の code-generation 申し送り)。

### `RulingPresentation`

```ts
type RulingPresentation = {
  readonly candidates: readonly Candidate[];   // 推奨順に整列済み
  readonly nonUniqueReason: string;
  readonly kind: "contested" | "none";
};
```

人間裁定(U4)と非対話中断の記録・再提示(U3)が共有する提示形。RFC-0001 の「候補+各候補の根拠+一意に決まらなかった理由+推奨順」の 4 要素を 1 つの値に閉じ込め、消費者ごとに組み立て直させない(First-Class Collection と Tell, Don't Ask)。

### `DecodeError`

```ts
type DecodeError = { readonly reason: string; readonly path: string };
```

`parse` の失敗を表す。`path` は不正だったフィールド位置で、fail-closed の理由を利用者へ loud に出すための最小情報。

### コンパニオン

```ts
const RecommendationOutcome: {
  unique(optionId: string, basis: RecommendationBasis): RecommendationOutcome;
  contested(candidates: readonly Candidate[], reason: string): RecommendationOutcome;
  none(reason: string): RecommendationOutcome;
  parse(value: unknown): Result<RecommendationOutcome, DecodeError>;
  presentationOf(o: RecommendationOutcome): RulingPresentation;
};
```

static 相当(スマートコンストラクタ・parse・提示変換)のみをコンパニオンに置く(project.md「コンパニオン namespace は static 相当のみ」)。`Result<T, E>` はこのリポジトリに単一の共有定義がなく、`amadeus-election-model.ts:10` / `amadeus-plugin-compose.ts:640` / `amadeus-stage-stats.ts:1114` のように **各モジュールが自前で宣言する** のが既存の流儀であるため、本モジュールも同形の定義を自前で持つ(新しい共有 Result 型を作らない — surgical scope)。

`presentationOf` は `unique` を渡された場合、提示すべき裁定が存在しないことを型で表す必要がある。本 unit では `presentationOf` の入力を `contested | none` に絞る(`unique` を渡す呼び出しがコンパイルできない形)ことで、「一意なのに人間へ聞く」経路を構成的に排除する。

## 本 unit が拡張する既存型

| 型 | 位置 | 拡張内容 |
|---|---|---|
| `AutoDecisionResolution` | `amadeus-intent-autonomy.ts:807-810` | escalate 枝を追加(`{ kind: "escalate"; outcome: RecommendationOutcome }`)。既存 `decided` / `park` / `invalid` は不変(R-11) |
| `DecisionCapabilityPort` | `:801-806` | `elect` / `recommend` の戻り型を `RecommendationOutcome` へ拡張。`unavailableReason` の意味論は不変 |
| ゲート導出 | `amadeus-intent-autonomy-production.ts:834-838` | 定数 approve を `deriveGateRecommendation` の背後へ移す。外部観測挙動は不変(R-15) |

`AutoDecisionRecord`(`:776-791`)は **無改変**。unique 終端のみがこれを生成するという条件が変わるだけで、レコードの形は変えない。したがって U8(completion-report)と既存の review 面(`amadeus-bolt.ts` の `list-auto-decisions` / `get-auto-decision` / `review-auto-decision` — dispatch 登録 `:1334-1336`)への波及は生じない。

## 意図的にモデル化しないもの

- **導出ロジック本体**: 各段が「どの事実からどの候補を挙げるか」は裁定点の所有者(C2 / C4 / C5)側にある。C1 は表現のみを持つ(components.md C1「導出ロジックは持たない」)。
- **basisFingerprint の正規化アルゴリズム**: ADR-11 の申し送り事項。型はフィールドを運ぶだけで、正規形の定義を持たない。
- **対話 / 非対話の判定**: U2(C3)が単一ソースで所有する。本 unit は分岐先を注入で受け、判定関数を import しない(dependency 文書 disposition (2))。
- **waiting 状態と park 会計**: U3(C4)の所有。本 unit は `WaitingCause.outcome` に載る値を提供するだけで、格納・レート制約・resume を知らない。
- **人間専権事項の判定**: 裁定順序 1 の所有は U5(C5)。本 unit は専権判定の結果を上書きしない(R-12)。
- **`confidence` などの連続値**: RFC-0001 Rationale が Q1-C として明示棄却済み(「連続値の閾値根拠が検証劇場化し、候補の列挙も返せない」)。型に持ち込まない。
- **後方互換の旧戻り型シム**: org.md Forbidden(要求されていない後方互換レイヤーの追加禁止)により、旧「常に 1 件」形の並存版は作らない。置換のみ。
