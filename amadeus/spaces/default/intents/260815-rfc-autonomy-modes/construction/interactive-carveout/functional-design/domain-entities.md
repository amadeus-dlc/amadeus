# Domain Entities — unit interactive-carveout(U4)

> 上流入力: `component-methods.md`(C1 `RecommendationOutcome`、C3 `resolveSessionInteractivity`、C4 `enterWaiting`)、`components.md` C3、`unit-of-work.md` U4(owned file は `hooks/amadeus-stop.ts` のみ)、`unit-of-work-story-map.md`(背骨 4「対話なら聞いてくる」)、`unit-of-work-dependency.md`(統合ポイント U1→U4 / U2→U4 / U3→U4)、`requirements.md` FR-4、`services.md` S1、`decisions.md` ADR-5。本 unit は**新しいドメイン型をほとんど持たない** — 判定に必要な型はすべて他 unit の公開面から借りる。

## 借りる型(他 unit 所有 — 本 unit は消費のみ)

```ts
// U2 / C3 所有(amadeus-intent-autonomy.ts に新設)
resolveSessionInteractivity(projectDir: string):
  { interactive: boolean; source: "human-turn-pipeline"; measuredAt: string };

// U1 / C1 所有(amadeus-recommendation.ts)
type RecommendationOutcome =
  | { kind: "unique"; optionId: string; basis: RecommendationBasis }
  | { kind: "contested"; candidates: readonly Candidate[]; reason: string }
  | { kind: "none"; reason: string };
```

- `resolveSessionInteractivity` は **単一ソース**であり、hook は同等物を再実装しない(R-1)。`interactive: false` は「非対話と確定」と「判定不能」の両方を吸収する fail-closed 表現で、hook 側はこの 2 者を区別しない。
- `RecommendationOutcome` のうち hook が参照するのは**終端種別(`kind`)だけ**で、`candidates` / `basis` の中身は読まない。提示は conductor の責務(`services.md` S1)。
- 終端種別の**読み口**は、本 hook が既に import している `readProductionAutonomyProjection`(`amadeus-stop.ts` import :105、使用 :176 / :200)ただ 1 つ。hook は spawn プロセスで engine とは directive kind 文字列しか交換しない(:925 / :932 / :947 / :953)ため、engine 呼出を新設せずディスク投影から読む。必要な最小フィールドは `occurrenceId` / 終端種別 / 発生時刻の 3 点で、`AutonomyProjection`(`amadeus-intent-autonomy.ts:165-182`)が既に持つ `parkEnvelope: ParkEnvelope | null` と同じ「保留中の封筒」形を想定する。**フィールド名・スキーマ・書込点は U1 / U3 の所有**であり、本書はそれを入力要件として要求するだけで新たな裁定はしない。

## 本 unit が持つ内部値

```ts
// 束縛付き carveout(2 pending-question / 3 pending-compose)の発火根拠。
// allow したときだけ構築され、recordHookDrop に転記される。
type BoundCarveoutBasis = {
  readonly carveout: "pending-question" | "pending-compose";
  readonly interactivity: { readonly interactive: boolean; readonly source: string };
  readonly outcomeKind: "contested" | "none" | "human-prerogative" | "not-required";
};
```

- **`human-wait` と `conversational` はこの型に含めない。** 2 つは対話性も終端束縛も課さない保存対象(R-11 / R-12)であり、記録は現行の `recordHookDrop`(:967 / :1019)の文言のまま。含めると「この 2 つも新束縛を持つ」という誤読を型が誘発する。
- `outcomeKind: "not-required"` は mode `none` の経路(R-7 — 梯子を通らないため終端束縛を要求しない)を表す。「読めなかった」を表す値は**持たない** — 読めない場合は carveout 自体が発火せず、この値が構築されない(R-5 / R-10)。
- 不変条件: `BoundCarveoutBasis` が構築されるのは hook が carveout 2 / 3 で allow を返す直前だけであり、block 経路では構築されない。すなわちこの値の存在は「束縛付き carveout でターンを返した」ことと同値。

## 既存型との関係(変更しないもの)

| 型・定数 | 現在地 | 本 unit での扱い |
|---|---|---|
| `StopBudgetMode`(`"autonomous" \| "gated" \| "interactive"`) | `amadeus-convergence-policy.ts`、`stopBudgetMode` :160-163 が `Intent Autonomy Mode` から導出 | 不変(R-14)。`Construction Autonomy Mode` を読まないため U5 の投影変更に追随しない |
| `BudgetPolicyV1` / `stopContinuationBlockCap`(:141-147)/ hard cap 10(:158) | 同上 | 不変(R-14) |
| `MarkerObservation` / `inspectComposeMarker` / `COMPOSE_MARKER_TTL_MS` | `amadeus-lib.ts`、`isPendingComposeStop` :489-513 が消費 | 不変。compose marker の鮮度判定は既存のまま、autonomy guard(:485)だけを置換 |
| `PendingComposeStopDeps`(注入シーム) | `amadeus-stop.ts`(`realPendingComposeStopDeps`) | 対話性判定の注入口をここに寄せる(テスト可能性の既存様式の踏襲) |

## 意図的にモデル化しないもの

- **waiting 状態**: U3 / C4 が所有し engine 発行専用(ADR-4)。hook は `WaitingCause` も `WaitingReceipt` も持たず、engine が返す `parked` 系 directive の文字列種別しか見ない(:947-949)。
- **裁定の提示(`RulingPresentation`)**: C1 の `presentationOf` が生成し conductor が提示する。hook は提示内容を組み立てない。
- **鮮度ウィンドウ / TTY / 明示フラグによる対話性**: RFC-0001 Rationale で棄却済み(Q3 初案 / Q3-B / Q3-C)。型としても述語としても持ち込まない(FR-2 の文書検査対象)。
- **mode 別の carveout ポリシー表**: R-4 で mode を carveout の単独決定因から外したため、mode → carveout の対応表そのものを持たない。mode が残る唯一の入力は継続上限(R-14)と、mode `none` の R-7 分岐のみ。
