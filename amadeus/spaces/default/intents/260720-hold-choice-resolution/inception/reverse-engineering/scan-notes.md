# Reverse-Engineering Scan Notes — 260720-hold-choice-resolution

> 上流入力(consumes 全数): **宣言なし**。reverse-engineering(2.1)は前段成果物を consumes 宣言せず、コードベース実測(git 履歴・実ファイル)を一次入力とする。本 scan-notes は Developer code scan の生データを整形収載し、後続 requirements-analysis の一次資料とする。
>
> 測定 ref: 全 file:line は Observed=HEAD `f6ab1e48d321e11ab6355fa315d505e28bd0273b` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間変更・crossing 帰属は `git log/diff/blame/show` 実測。実データ census は本 worktree(engineer-2、`f6ab1e48d`)実測。base=`6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`(距離 87、祖先 exit 0)。

## 対象と目的

- Issue: [#1267](https://github.com/amadeus-dlc/amadeus/issues/1267) — 選挙 CLI の hold-resolution に**勝者 choice 指定**を追加する。
- 背景: 多肢 choice tie で発生する hold を人間が解決するとき、現行 resolution 語彙 `adopted`/`rejected`(二値)では**どの choice が勝ったか**を表現できない。E-TCRCG e4 留保の履行。
- 目標像: `--resolution choice:<internalNo>` 形の受理 → `renderPersistDraft` の winner 描画経路へ合流 → human-ruling-persist-through 準拠で record.md 反映まで実装・テスト。二値語彙の後方互換は設計時裁定。修正面 = `scripts/amadeus-election*.ts` 系 + テスト。
- Scope: `amadeus`(enhancement)。Project type: Brownfield。

## 主要機構(file:line + verbatim、Observed=HEAD `f6ab1e48d` 実測)

### HOLD_RESOLUTIONS(`scripts/amadeus-election.ts:69-74`)

```ts
const HOLD_RESOLUTIONS: Record<HoldReason, Record<string, ElectionState>> = {
  tie: { adopted: "tallied", rejected: "tallied" },
  block: { adopted: "tallied", rejected: "tallied", reopen: "collecting" },
  "quorum-short": { "resume-collecting": "collecting", "close-rejected": "tallied" },
  "discussion-needed": { discussed: "collecting" },
};
```

- `tie` の有効 resolution は `adopted` / `rejected` の2値、いずれも復帰先 `tallied`。
- `block` は `adopted`/`rejected`(→tallied)+ `reopen`(→collecting)。
- `quorum-short` は `resume-collecting`(→collecting)/ `close-rejected`(→tallied)。
- `discussion-needed` は `discussed`(→collecting)。
- **choice:N の受け皿は tie 行に不在** = 本 intent の主拡張点。`Record<string, ElectionState>` の静的 table では `choice:<no>` の動的キーを表現しづらい。

### handleHoldResolved(`scripts/amadeus-election.ts:190-226`)

シグネチャ: `function handleHoldResolved(root: string, electionId: string, resolution: string | null): number`

ガード列(順序):
- `:191` null チェック — `if (resolution === null) return fail("invalid-transition: hold-resolved requires --resolution");`
- `:192-193` `Store.load` → 失敗で storeFail
- `:194-196` state ガード — `state !== "hold"` なら fail(`got ${loaded.value.state}`)
- `:197-200` hold tally ガード — `t === null || t.result.kind !== "hold"` なら fail(`hold state without a hold tally result`)
- `:201-202` table 引き — `const table = HOLD_RESOLUTIONS[t.result.reason];` / `const resumedTo = table[resolution];`
- **`:203-208` resolution 値検証 fail-closed**(table 由来、未知値 fail):

```ts
if (resumedTo === undefined) {
  return fail(
    `invalid-transition: resolution "${resolution}" is not valid for hold reason "${t.result.reason}" (valid: ${Object.keys(table).join("/")})`,
  );
}
```

- `:208-210` #1235 M1 コメント(human ruling は DURABLE — state 遷移前に tally.json へ append)
- **`:211-221` 永続化**(`writeStoreFile` 直呼び、state 遷移**前** append = DURABLE):

```ts
const entry: HoldResolution = {
  reason: t.result.reason,
  resolution,
  resumedTo,
  at: normalizeAt(new Date().toISOString()),
};
const persisted = writeStoreFile(
  join(root, electionId, "tally.json"),
  JSON.stringify({ ...t, resolutions: [...(t.resolutions ?? []), entry] }, null, 2),
);
if (!persisted.ok) return storeFail("tally-resolution", persisted.error);
```

- `:222` `const set = Store.setState(root, electionId, resumedTo);`
- `:224-225` `out({ committed: "hold-resolved", resolution, resumedTo });` → return 0

> Developer 生データは fail-closed を「:201-207」と記録。独立再照合の実測では table 引き :201-202、undefined チェック+fail メッセージ :203-208(fail 呼びは :204-207、メッセージ行 :205)。**意味論は同一**(table 由来 fail-closed)、行番号の微差のみ。

### HoldResolution 型(`scripts/amadeus-election.ts:89-94`)

```ts
export type HoldResolution = {
  reason: HoldReason;
  resolution: string;
  resumedTo: ElectionState;
  at: string;
};
```

- `resolution: string` に現状 `adopted`/`rejected`/`reopen`/... を格納。choice 勝者を運ぶなら `choice:1` を string で入れるか専用フィールド追加かが設計判断。

### tally.json スキーマ + carry-forward(`scripts/amadeus-election-store.ts:246-253`)

- スキーマ = `{result, talliedAt, ballots, resolutions}`。
- carry-forward(reopen 跨ぎで human ruling を保存、FR-4b、verbatim `:248-249`):

```ts
const prior = readJson<{ resolutions?: unknown[] }>(join(dir, "tally.json"));
const resolutions = prior.ok ? (prior.value.resolutions ?? []) : [];
const w = writeStoreFile(
  join(dir, "tally.json"),
  JSON.stringify({ result, talliedAt, ballots: ledger.value.ballots, resolutions }, null, 2),
);
```

### 裁定描画経路(`scripts/amadeus-election.ts` + `scripts/amadeus-election-record.ts`)

- **finalRuling 選定**(`election.ts:389`)— `const finalRuling = resolutions.filter((r) => r.resumedTo === "tallied").at(-1);`(resumedTo が tallied の最後)
- **rulingOverride 二値写像**(`election.ts:390-393`):

```ts
const rulingOverride =
  t.result.kind === "hold" && finalRuling !== undefined
    ? `裁定: ${finalRuling.resolution === "adopted" ? "採用" : "不採用"}`
    : undefined;
```

- **renderPersistDraft**(`record.ts:149-159`、`rulingOverride ?? rulingText` 合流、param `:155`、合流 `:159`):

```ts
export function renderPersistDraft(
  code: GoaLineCode,
  _election: Election,
  result: TallyResult,
  ballots: Ballot[],
  timeline: TimelineEvent[],
  rulingOverride?: string,          // :155
): string {
  const freq = GoaFreq.fromVotes(ballots.map((b) => b.goa));
  return [
    rulingOverride ?? rulingText(result),   // :159
    // ...
```

- **rulingText**(`record.ts:120-131`、established = winner label + 内訳 / hold = 保留):

```ts
function rulingText(result: TallyResult): string {
  if (result.kind === "established") {
    const winnerCount =
      result.choiceCounts.find((c) => c.internalNo === result.winner.internalNo)?.count ?? 0;
    const breakdown = result.choiceCounts
      .map((c) => `choice${c.internalNo}=${c.count}票`)
      .join(" ");
    return `裁定: ${result.winner.label}(choice ${result.winner.internalNo}: ${winnerCount}票)\n内訳: ${breakdown}`;   // :126
  }
  return `裁定: 保留(${result.reason})`;   // :129
}
```

- **trail**(`election.ts:402-404`)— `resolutions.map((r) => `- hold 裁定履歴: ${r.reason} → ${r.resolution}(${r.at}、復帰先 ${r.resumedTo})`)`

> Developer 生データは rulingOverride を「:390-392」、rulingText を「:120-130」と記録。独立再照合の実測では rulingOverride const は :390-393(二値写像式 :392)、rulingText は :120-131(established return :126、保留 return :129)。微差のみ、内容一致。

### tie 発生源(`scripts/amadeus-election-model.ts:442-456`)

first-match 順(block → discussion-needed → quorum-short → choice):

```ts
if (blocks >= 1) return { kind: "hold", reason: "block", counts };                      // :442
if (counts.discuss >= 2) return { kind: "hold", reason: "discussion-needed", counts };  // :443
if (counts.favor + counts.against === 0) return { kind: "hold", reason: "quorum-short", counts };  // :444
// ... eligible = resolved.filter(b => b.goa !== 4)、choiceCounts 集計 ...
const top = choiceCounts.reduce((m, c) => Math.max(m, c.count), 0);   // :454
const leaders = choiceCounts.filter((c) => c.count === top);          // :455
if (leaders.length !== 1) return { kind: "hold", reason: "tie", counts };   // :456
```

- `HoldReason`(`model.ts:406`)= `"tie" | "block" | "quorum-short" | "discussion-needed"`。
- tie = 勝者 choice が一意でない(`leaders.length !== 1`)。人間が choice:N でどの leader を勝者にするかを確定するのが本 intent の中核。

## テスト状況(grep = `tests/`、Observed 実測)

- hold-resolved 駆動テスト = **全て非 tie**:
  - `tests/integration/t236-election-loop.integration.test.ts` — :212 テスト本体、:229 `--resolution discussed`(discussion-needed)、:233 `reopen`・:295 `rejected`(block)、:237 missing `--resolution` loud、:321-344 residual guard(:325/:344 `reopen` = 非 hold 拒否等、block reason)。
  - `tests/e2e/t241-election-machine-executor.test.ts` — :113 テスト本体、:128-130 `hold-resolved --resolution rejected`(E-EXEC2、block)。
- **tie の hold-resolved・adopted(採用)分岐・tie resolution 検証テストは全欠落**(grep 0件):
  - `tests/unit/t238-election-record.test.ts:200-208` は `renderPersistDraft` に `HOLD {reason:"tie"}` を渡すが `expect(held).toContain("保留(tie)")`(:208)のみ — `rulingText` 保留分岐であり `rulingOverride` の `裁定: 採用` は踏まない。
  - `--resolution adopted` を渡すテストは選挙系で 0 件 → `rulingOverride === "裁定: 採用"` の描画は未カバー。
  - tie の有効集合 `{adopted, rejected}` に対する fail-closed(`election.ts:203-208`)を tie で駆動するテストは 0 件。
- 補足(tie 発生のみ固定):
  - `tests/unit/t234-election-model.test.ts:413` `test("tally: a choice tie holds with reason tie", ...)`、:421 `expect(result.reason).toBe("tie")` — hold-resolved へ繋げない。
  - `tests/integration/t235-election-store.integration.test.ts:131`・:201 tie hold の store 往復のみ。

## 実データ census(測定 ref = 本 worktree engineer-2 `f6ab1e48d`)

- `amadeus/**/elections/**/tally.json` 総数 = **51**(本 worktree、`find`)。
- 内訳: `"kind":"hold"` 結果 = **0** / `"winner"` スキーマ = **0** / `"outcome"` 旧スキーマ = **51** / 非空 `"resolutions"` = **0**。
- 結論: 本 worktree の全選挙は旧 outcome スキーマ(#1268 前の tally 様式)、**tie hold・resolution の本番実績はゼロ**。choice tie hold-resolution は完全に未実行のコードパス。回帰対照データ不在、テストで合成必須。
- ref 注記: Developer scan は leader store で **62** tally.json を計数。本 worktree は **51**。差は worktree ref 差(measurement-ref-in-artifacts)。**定性結論(hold 0 / winner-schema 0 / 非空 resolutions 0)は両 ref で一致** — 矛盾ではない。

## 区間交差(`6f2455c43..HEAD` = `scripts/` 3 PR)

区間で `scripts/` を触るコミット3本(`git log --oneline`):
- `ea6acac53` `fix(election): decide tally winner from choiceInternalNo (#1268)`
- `a6f4a4522` `fix(election-cli): fail-closed ballot acceptance — invalid-timestamp validation, amend submission path, per-voter resolution (#1273)`
- `e1fd1826b` `fix(election-cli): stamp ballot receipt time and verify timeline on the receipt axis (#1277)`

交差判定(new-side hunk header + blame 実測):
- `HOLD_RESOLUTIONS`(`election.ts:69-74`)= **非交差**(hunk 外、base とバイト同一)。
- `handleHoldResolved`(`election.ts:190-226`)= **非交差**(hunk 外、未変更)。
- **`rulingOverride` 二値写像(`election.ts:389-393`)= 交差(反証点)** — hunk `@@ -370,20 +376,29 @@ handleRender` が覆い、:390/:392/:393 は **#1268(`ea6acac53`)が変更**。base は `effective: TallyResult` established 合成(`outcome: finalRuling.resolution === "adopted" ? "adopted" : "rejected"`)。#1268 が `rulingOverride` 文字列 + `resolveBallots(ballots)` + `renderPersistDraft` の6th param へ再形成(Issue #1261 ruling A、コメント `election.ts:381-383`)。
- **`renderPersistDraft` の `rulingOverride` param(`record.ts:155/159`)= 交差(反証点)** — hunk `@@ -124,16 +142,21 @@` が覆い、:155/:159 は **#1268(`ea6acac53`)が追加**。base の同関数に rulingOverride param 不在(`git show 6f2455c43:` 確認)。
- `tally` の tie 判定(`model.ts:456`)= tie/established 分岐自体が #1268 由来(本 intent が直接乗る面)。

**Developer scan の反証(1点)**: Developer は「rulingOverride 本体・handleHoldResolved・HOLD_RESOLUTIONS はいずれも未変更(Bolt 4 由来)」と記録。**`rulingOverride` 本体は Bolt 4 由来ではなく #1268(`ea6acac53`、2026-07-20)の直近変更面**(blame/show 実測)。HOLD_RESOLUTIONS・handleHoldResolved の未変更判定は正しい。**含意**: 本 intent は #1268 の `rulingOverride` 構築の直接拡張であり、requirements/design はこの面を「1日前に変わったばかりの面」として扱い、#1268 の rulingOverride 契約(choice-blind な採用/不採用)を前提に choice 勝者描画を接ぐ。base-advance-regrounding: 着手前に merge-base 再実測。

**e4 バッチ面の非交差裏取り**(本 intent が e4 の並行面と交わらないこと):
- `GoaLineCode`(`record.ts:26-49`)= 非交差(record.ts hunk :89/:112/:142/:200 起点、範囲外)。
- `renderGoaLine`(`record.ts:77-80`)= 非交差。
- `handleOpen`(`election.ts:230-262`)= 非交差(election.ts hunk :25/:333/:376/:452 起点、範囲外)。
- norm-metrics schema = 非交差(区間 `scripts/` diff の stat に norm/metric 出現 0)。

## requirements への未決点(design で確定)

1. **choice 指定の語彙形式**: `--resolution choice:<internalNo>`(prefix 形)か専用フラグか。前者は `HOLD_RESOLUTIONS[tie]` 静的 table では表現できず、`handleHoldResolved`(`election.ts:201-208`)の table 引き前に prefix 判定を挟む実装。
2. **`HoldResolution` 型の運搬形**: 勝者 choice を `resolution: string`(`election.ts:90`)に `choice:1` で畳むか `winnerInternalNo?: number` 追加か。`tally.json` carry-forward(`store.ts:248-249`)と `finalRuling` フィルタ(`election.ts:389`)への影響を要確認。復帰先は `tallied` が自然。
3. **rulingOverride の choice 描画**: `record.ts:126` established winner label(`裁定: <label>(choice <no>: <n>票)`)相当で描くか。caller(`election.ts:390-393`)で choice ラベルを組み立てる。ラベルは `election.choices` から internalNo で引く必要 — render 段が choices を持つか要確認(現 `renderPersistDraft` の `_election` は未使用 `record.ts:151`)。
4. **既存二値語彙の後方互換**: tie の既存 `adopted`/`rejected`(`election.ts:70`)を残すか choice 一本化か。intent は「二値語彙の後方互換は設計時裁定」と明示 — construction guardrail(要求外の互換レイヤー禁止)と照合し、残す場合は根拠を design/NFR に明示。tie で adopted/rejected が意味を持つか(choice-blind 採否 vs choice 勝者)の意味論整理が要る。
5. **human-ruling-persist-through 準拠**: choice:N が `resolutions[]`(`election.ts:211-221`)へ永続 → render(`election.ts:389`)→ record.md に winner label、の往復を実データ合成で実証。「保留」で残らないこと(#1235 M1 同型)を閉包テストで固定。
6. **#1268 面への接地**: 拡張対象 `rulingOverride` は #1268 で1日前に再形成された面。実装は #1268 の契約を前提に接ぎ、着手前 merge-base 再実測(base-advance-regrounding)。
7. **テスト設計**: (a) tie 由来 hold-resolved の choice:N 受理 (b) choice 勝者の rulingOverride 描画(record.md 反映) (c) tie の既存二値 resolution 後方互換 の3点を新規テストで固定。tie hold・resolution は本番実績ゼロなので全て合成 fixture。in-process seam(`handleHoldResolved` / `renderPersistDraft` 直呼び)で lcov 有効化(fs-tests-integration-first)。

## 測定コマンド(数値の出所)

- 祖先性: `git merge-base --is-ancestor 6f2455c43 f6ab1e48d` exit 0。距離: `git rev-list --count 6f2455c43..f6ab1e48d` = 87。
- base 選定(非祖先除外): `git merge-base --is-ancestor 37f8cf5e6 f6ab1e48d` exit 1 / `... 262a86db9 f6ab1e48d` exit 1。祖先候補距離 6f2455c43=87 / 591b6a2a2=152 / 6495e03a1=278。
- 区間 scripts コミット: `git log --oneline 6f2455c43..f6ab1e48d -- scripts/`。
- crossing 帰属: `git blame -L 389,393 scripts/amadeus-election.ts`(:390/:392/:393 = `ea6acac53e`)/ `git blame -L 149,159 scripts/amadeus-election-record.ts`(:155/:159 = `ea6acac53e`)/ `git show 6f2455c43:scripts/amadeus-election-record.ts | grep renderPersistDraft`(base に param 不在)。
- hunk header: `git diff 6f2455c43..f6ab1e48d -- scripts/amadeus-election.ts scripts/amadeus-election-record.ts | grep -E '^\+\+\+|^@@'`。
- census: `find amadeus -path '*elections*' -name tally.json | wc -l` = 51、`grep -l '"kind": *"hold"'` = 0 / `"winner"` = 0 / `"outcome"` = 51 / 非空 `"resolutions"` = 0。
- テスト空白: `grep -rn 'hold-resolved' tests/`(t236/t241 のみ、全て block/discussion-needed)/ `grep -rn '"adopted"\|--resolution adopted' tests/`(選挙系 0 件)。
