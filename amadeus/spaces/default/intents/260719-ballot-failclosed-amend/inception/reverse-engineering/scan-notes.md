上流入力(consumes 全数): (本ステージは consumes 宣言なし)

測定 ref: 行番号・件数は observed HEAD `6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c` の実ファイル直読、区間変更は `git log 591b6a2a2..6f2455c43 -- scripts/` で実測(measurement-ref-in-artifacts)。

# scan-notes — 260719-ballot-failclosed-amend(Developer スキャン生データ + Architect 独立再照合)

> 本ファイルは reverse-engineering の一次資料。後続 requirements-analysis はここを起点にする。Developer 生データを全文収載し、Architect が確約級引用を observed HEAD で独立再照合した結果(反証有無)を各項に併記する。手法 = diff-refresh(cid:reverse-engineering:c1)、体制 = Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。

## 1. 受理チェーン(vote verb → 永続化)

- 受理チェーン: `handleVote`(`scripts/amadeus-election.ts:320`)→ `Ballot.parse`(`:328`)→ `normalizeAt`(`:334`)→ `Store.appendBallot`(`:335`)。
- 5分類 fail-closed 検証は `Ballot.parse`(`scripts/amadeus-election-model.ts:180` の `export const Ballot`、検証本体 `:184-192`)。順序コメント(`:181-183`)= `parse-failure -> unknown-election -> unknown-voter -> goa-out-of-range -> reservation-missing`。
- `parseBallotShape`(`model.ts:160-178`)は **kind を一切読まない**(構造検証はフィールド存在と primitive 型のみ)。`Ballot.parse` の成功 return は **`kind: "original"` 固定**(`model.ts:194`)。
- **構造的帰結**: `vote` verb 経由で `kind:"amend"` の ballot を投入する経路は存在しない — parse は raw の kind を無視し常に `"original"` を刻む。amend ballot は Store 直接注入(テストのみ)でしか生まれない。

verbatim(`model.ts:193-198` 抜粋):
```
    return ok({
      kind: "original",
      electionId: shape.electionId,
      voter: shape.voter,
      voterKind: shape.voterKind,
```

**再照合(Architect)**: `model.ts:194` の `kind: "original"` を直読で確認、`parseBallotShape`(`:160-178`)に kind 参照なしを確認。反証なし。

## 2. normalizeAt の fail-open(NaN 素通し)

- `normalizeAt`(`scripts/amadeus-election-transport.ts:87-91`): `new Date(at)` が NaN のとき **入力をそのまま返す fail-open**。コメント `// leave unparseable input visible`(`:90`)。
- 消費6箇所: `transport.ts:101`(`makeDeliveryRecord` の `at`)/ `election.ts:43,214,334,354` / `tests/.../t239:125-129`。

verbatim(`transport.ts:87-91`):
```
export function normalizeAt(at: string): string {
  const parsed = new Date(at);
  if (Number.isNaN(parsed.getTime())) return at; // leave unparseable input visible
  return parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}
```

**再照合(Architect)**: `transport.ts:87-91` を直読で確認。NaN 分岐 `:90` が入力 `at` を無検証で返す fail-open を確認。反証なし。

## 3. store 側の kind 非区別

- dup 判定(`scripts/amadeus-election-store.ts:132`、条件式は `:131-133` に跨る `.some()`)は **amend を除外**: `b.voter === ballot.voter && b.kind !== "amend" && ballot.kind !== "amend"`。→ amend は重複検査をすり抜ける。
- timeline detail は amend を `amendment` と表示(`store.ts:167` 近傍、`detail: \`ballot ${ballot.kind === "amend" ? "amendment" : "accepted"}\``)。
- `classifyLate`(`model.ts:296-298`)は **kind 非区別**(`submittedAt <= tallyTime` の字句比較のみ)。
- `tally`(`model.ts:321-337`)は **kind 非区別の全走査** — `for (const b of ballots)` が全 ballot を GoA で集計。original + amend が同一 voter 分で **二重計上**される。`verify`(`election.ts:440` の recompute)も同一母集団 `tally(...)` で再計算するため **検出不能**(同じ二重計上を再現するだけ)。

verbatim(`store.ts:131-133` dup 判定):
```
    const dup = accepted.some(
      (b) => b.voter === ballot.voter && b.kind !== "amend" && ballot.kind !== "amend",
    );
```

verbatim(`model.ts:321-333` tally 走査、kind 参照なし):
```
export function tally(_election: Election, ballots: Ballot[]): TallyResult {
  const counts: GoaCounts = { favor: 0, against: 0, abstain: 0, discuss: 0 };
  let blocks = 0;
  for (const b of ballots) {
    if (FAVOR.has(b.goa)) counts.favor++;
    else if (AGAINST.has(b.goa)) counts.against++;
    else if (b.goa === 4) counts.abstain++;
    else counts.discuss++;
    if (b.goa === 8) blocks++;
  }
```

**再照合(Architect)**: `store.ts:132`(dup、amend 除外)、`model.ts:296`(classifyLate、kind 非参照)、`model.ts:321-337`(tally、kind 非参照の全走査)、`election.ts:440`(verify recompute が同一 `tally` 呼び出し)を直読で確認。反証なし。

## 4. 実データ観測(leader elections)

- leader elections 12件: **全 ballot kind=original、全 late=[]** — amend/late はゼロ世代(本番運用で amend・late lane は一度も踏まれていない)。
- `talliedAt` は秒精度 UTC(`normalizeAt` の funnel 経由)。

**再照合(Architect)**: 実データ件数は Developer スキャン値を採用(observed HEAD の store ファイル群)。件数の独立再カウントは本合成では未実施(生データ値をそのまま一次資料へ収載、requirements 段で必要なら再カウント)。

## 5. テスト被覆

- amend の被覆: `tests/.../t235:64`(dup)/ `t235:136-152`(coexistence — **Store 直接注入で、`Ballot.parse` 非経由**)のみ。
- **amend × submittedAt の二重計上検査は不在**(tally の二重計上を pin するテストがない)。
- `t234` に `classifyLate` 境界、`t239` に `normalizeAt` 4 assertion。

**再照合(Architect)**: テスト所在は Developer スキャン値を採用。amend 二重計上検査の不在主張は、requirements 段で `tally` テストの全域 grep により反証確認すること(absence-claim-grep-verify)。

## 6. 区間交差判定(diff-refresh)

- base=`591b6a2a222357f41061128f1b5a93c7f7a877be` / observed=`6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`。祖先性 `git merge-base --is-ancestor` exit 0、距離 **65**(`git rev-list --count`、observed HEAD 実測)。
- 区間交差(`591b6a2a2..HEAD -- scripts/`): election 4 Bolt = #1227(`cf92b6813` walking-skeleton)/ #1231(`654e54b53` model-complete)/ #1233(`773ded00a` io-record-transport)/ #1235(`fdfe1ecd3` cli-complete)+ 非交差2件 = #1198(`cd9865194` mirror)/ #1212(`bf84cdfaf` codex hooks)。
- フォーカスシンボル(`Ballot.parse` / `normalizeAt` / dup / `classifyLate` / `tally`)は **全て 4 Bolt 内で導入**。
- **本欠陥は区間内退行ではなく設計時ギャップ**: #1231(5分類に timestamp 分類分岐なし = kind を検証軸に含めない設計)/ #1235(vote verb 導入時に amend 投入経路を塞いだまま tally の kind 非区別を残した)導入時の設計時ギャップ。

**再照合(Architect)**: `git merge-base --is-ancestor 591b6a2a2 6f2455c43` exit 0、`git rev-list --count`=65、`git log ... -- scripts/` の 4 Bolt + 2 非交差コミット SHA を実測で確認。反証なし。

## 7. 配布面

- `scripts/amadeus-election-*.ts` は **dist/ 投影 0件**(`git ls-files 'dist/**' | grep -i election` = 0件実測)。チーム内ツール・配布外(W-04 整合)。
- `amadeus-election` SKILL のみ **3面**(`.agents/skills/` / `.claude/skills/` / `contrib/skills/`)。

**再照合(Architect)**: `git ls-files 'dist/**' | grep -i election` = 0件、SKILL 3面(`git ls-files | grep -i amadeus-election | grep -i skill`)を実測で確認。反証なし。

## 欠陥要約(requirements への引き継ぎ)

観測される「fail-open / 無差別集計」の3点は独立に成立する:
1. **kind 非読取**: `Ballot.parse` が raw kind を無視し `"original"` 固定(`model.ts:194`)— vote verb からの amend 投入経路が構造的に不在。
2. **normalizeAt 素通し**: パース不能タイムスタンプを無検証で返す fail-open(`transport.ts:90`)。
3. **tally 無差別集計**: `tally`/`classifyLate`/dup が kind 非区別(`model.ts:321-337` / `:296-298` / `store.ts:131-133`)— Store 直接注入で生まれた amend が original と二重計上され、`verify` の recompute でも検出不能。

いずれも #1231/#1235 の設計時ギャップであり区間内退行ではない(restart-loss regression クラスではない)。どの点を fail-closed 化するか・amend の意味論をどう定めるかは requirements/選挙で裁定する。
