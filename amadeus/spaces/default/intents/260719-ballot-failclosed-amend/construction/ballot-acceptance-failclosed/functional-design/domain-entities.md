# Domain Entities — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

## 型定義(functional-domain-modeling-ts — 判別 union+コンパニオン、AD component-methods.md を正本として継承)

### BallotError(6分類 — FR-1)

```ts
export type BallotError =
  | "parse-failure" | "unknown-election" | "unknown-voter"
  | "invalid-timestamp"          // 追加(E-BFARA1 = mint 正規形限定)
  | "goa-out-of-range" | "reservation-missing";
```

### StoreError(unknown-ref 追加 — FR-3、ADR-2)

```ts
export type StoreError = "exists" | "duplicate" | "not-found" | "io-error" | "corrupt" | "unknown-ref";
// 既存5値(store.ts:33 実測順)+ unknown-ref のみ追加
```

### BallotShape の拡張(kind/ref — FR-3)

```ts
type BallotShape = {
  electionId: string; voter: string; voterKind: VoterKind;
  choiceInternalNo: number; submittedAt: string;
  goa: unknown; reservation: string | null; rationale: string | null;
  kind: "original" | "amend";      // 欠落は "original"(後方互換 FR-3(a))
  ref: BallotRef | null;           // kind==="amend" のとき必須(欠落・型不正は parse-failure)
};
```

- `kind` が "original"/"amend" 以外の文字列 → parse-failure(fail-closed)。
- `AmendBallot` 生成: shape.kind === "amend" のとき kind/ref 込みで返す(model.ts:194 の固定生成を置換)。
- `OriginalBallot` / `AmendBallot` / `BallotRef` の既存型(model.ts:102-134)は無変更。

### SUBMITTED_AT_RE(FR-1 一段目)

```ts
const SUBMITTED_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;   // normalizeAt mint 正規形(E-BFARA1)
```

二段目は `Number.isNaN(new Date(s).getTime()) === false`(実在日時)。regex が「形」を、Date が「実在」を担う相補(e4 所見: Date 単独は日付のみ入力を通す/regex 単独は 2026-13-45T99:99:99Z 級の非実在日時を通す)。

## 型の正本と伝播

本ファイルの型は AD component-methods.md からの逐語継承(単一 Unit のため cross-unit 参照なし)。実装時は本ファイルでなく AD 適用点表とあわせて参照し、乖離が出たら実装前に停止する(deviation-stop-before-implement)。
