# Component Methods — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## election.ts の変更設計

### HOLD_RESOLUTIONS の tie 行(FR-1)

```ts
const HOLD_RESOLUTIONS: Record<HoldReason, Record<string, ElectionState>> = {
  tie: {},   // choice:<internalNo> のみ受理(動的値のため専用分岐で検証 — 下記)。二値はユーザー承認済み置換で除去
  block: { adopted: "tallied", rejected: "tallied", reopen: "collecting" },   // 不変
  "quorum-short": { "resume-collecting": "collecting", "close-rejected": "tallied" },   // 不変
  "discussion-needed": { discussed: "collecting" },   // 不変
};
```

### choice parse(新・module スコープ純関数)

```ts
/** Parse "choice:<internalNo>" — returns the internalNo or null (not that form). */
function parseChoiceResolution(resolution: string): number | null
// 実装: /^choice:(0|[1-9][0-9]*)$/ 一致時に Number、他は null(先頭ゼロ・空・非数値は null = fail 側)
```

### handleHoldResolved の tie 分岐(FR-1 二段検証)

既存のテーブル検証(:201-207 相当)の**前**に tie 専用分岐:

```ts
if (t.result.reason === "tie") {
  const n = parseChoiceResolution(resolution);
  const valid = loaded.value.election.choices.some((c) => c.internalNo === n);
  if (n === null || !valid) {
    return fail(`invalid-transition: resolution "${resolution}" is not valid for hold reason "tie" (valid: choice:<internalNo> of ${choices の internalNo 列挙})`);
  }
  // resumedTo = "tallied" 固定(現行 tie の両値と同じ復帰先)
}
```

- 非 tie reason はテーブル検証そのまま(既存経路無変更 — E-TCRCG=A 維持)。
- tie への adopted/rejected/未知値/不正 choice は全てこの分岐で loud 拒否(e4 留保の実装形+valid ヒント)。

### rulingOverride 合成の拡張(FR-3、election.ts:389-393 の後継)

```ts
const choiceNo = finalRuling ? parseChoiceResolution(finalRuling.resolution) : null;
const rulingOverride =
  t.result.kind === "hold" && finalRuling !== undefined
    ? choiceNo !== null
      ? `裁定: ${choices.find((c) => c.internalNo === choiceNo)?.label ?? `choice ${choiceNo}`}(choice ${choiceNo} — tie 裁定)`
      : `裁定: ${finalRuling.resolution === "adopted" ? "採用" : "不採用"}`   // 旧形(他 reason 由来)不変
    : undefined;
```

- label 不在(choices 変更等の防御)は `choice <n>` 表記へ縮退(?? — 実在照合済み経路では到達しない防御行。lcov 対象外化に注意 = 実装時に到達可能性を判断し不要なら省く)。

## 永続化(FR-2)

変更なし — resolution 文字列 `choice:<n>` が HoldResolution.resolution にそのまま入り、trail 行(:402-404)は現行 map で `tie → choice:<n>(...)` を表示。

## テスト面(NFR-2)

| テスト | 層 | ケース |
| --- | --- | --- |
| parseChoiceResolution | unit(t234 でなく election.ts 内部 — export するか実装時判断、export 時は新 unit) | 正常形・choice: 欠落・非数値・先頭ゼロ・空 |
| tie hold-resolved | integration(t236 追記) | choice 受理→tally.json 保存→resumedTo tallied / adopted・rejected・不正 choice・非実在 internalNo の loud 拒否(valid ヒント文言 assert) |
| render 貫通 | integration(t236 追記) | tie hold→choice resolution→record.md に「裁定: <label>(choice <n> — tie 裁定)」 |
| 旧形不変 | 既存 t236:212/:278(block 経路)が回帰ピン — 無変更 green を確認 |
