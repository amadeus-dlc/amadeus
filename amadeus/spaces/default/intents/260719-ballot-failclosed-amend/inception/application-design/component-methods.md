# Component Methods — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

型・関数シグネチャの設計(functional-domain-modeling-ts: type+コンパニオン、判別 union Result)。

## election-model

### BallotError の拡張(FR-1/FR-3)

```ts
export type BallotError =
  | "parse-failure" | "unknown-election" | "unknown-voter"
  | "invalid-timestamp"          // 追加(FR-1)
  | "goa-out-of-range" | "reservation-missing";
```

`unknown-ref` は store 側 `StoreError` へ追加(受理点分離 — decisions.md ADR-2)。

### Ballot.parse の分類順(6分類、fail-closed 明文コメント — NFR-1)

parse-failure → unknown-election → unknown-voter → **invalid-timestamp** → goa-out-of-range → reservation-missing。
invalid-timestamp の位置は「識別子の検証(誰の・どの選挙の票か)→ 内容の検証(いつ・どの強さか)」の既存順序に内容側の先頭として挿入(goa より前 = timestamp は全 ballot 共通属性、goa/reservation は投票内容)。

```ts
const SUBMITTED_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;   // mint 正規形(E-BFARA1=A)
// 二段目: new Date(s) が NaN でない(実在日時 — e4 所見の regex 単独穴を Date が、Date 単独穴を regex が塞ぐ相補)
```

### parseBallotShape の kind/ref 対応(FR-3)

```ts
type BallotShape = { ...既存 8 フィールド; kind: "original" | "amend"; ref: BallotRef | null };
// kind 欠落・"original" → original(後方互換 FR-3(a))。"amend" → ref の3フィールド型検査必須(欠落は parse-failure)。
// それ以外の kind 値 → parse-failure(fail-closed)。
```

`Ballot.parse` は shape.kind === "amend" のとき `AmendBallot`(kind/ref 込み)を返す — model.ts:194 の固定生成を置換。

### resolveBallots(FR-4、canonical 1定義)

```ts
/** Per-voter resolution (E-BFARA2 = A): keep exactly one ballot per voter —
 *  the max submittedAt; on ties, amend wins over original. Pure. */
export function resolveBallots(ballots: Ballot[]): Ballot[];
```

適用点の全数列挙(reviewer iteration 1 Critical の是正 — 定義は1箇所・適用は全消費面。resolveBallots は冪等のため多重適用は無害):

| # | 消費面 | 適用方法(実測 file:line) |
| --- | --- | --- |
| 1 | tally の outcome 導出 | `tally` 先頭で内部適用(model.ts:321 — シグネチャ不変、呼び出し元 :353/:440 変更不要) |
| 2 | verify の GoA 度数・reservation 検査 | `handleVerify` で `const resolved = resolveBallots(ballots)` を1回導出し、GoaFreq.fromVotes(election.ts:447)/ checkGoaLine(:448)/ verifyReservations(:450)へ resolved を渡す |
| 3 | render(record 描画) | `handleRender` の ballots(election.ts:372)を resolved にして renderPersistDraft(:386)へ渡す — record.ts:134 の freq と :137 の reservationLines は引数経由で解決済みになる(record.ts 自体は無変更) |
| 4 | materialize の fixed set | **解決しない(blind lift のまま — store.ts:9 コメント・:223 実測)**。tally.json の ballots は全受理集合 = correction trail の保存面であり、集計値でない。消費側(#1〜#3)が読み出し時に解決する契約 |
| 5 | verifySelf の自己検査 | `handleVerify` の verifySelf 呼び出し(election.ts:456)の両引数(`ballots.length`, `ballots`)を resolved 化(`resolved.length, resolved`)— verifySelf 内部の freq 再計算(record.ts:175-177)が #2 の resolved 由来 freq と同一母集団で比較され、freq-mismatch の偽陽性を封鎖(iteration 2 Critical の是正)。あわせて handleVerify 内は resolved 導出(:447 の直前)以降の全消費点(:447/:448/:450/:456)で `resolved` を明示使用し、生 `ballots` の残用途は :440 の tally 呼び出しのみ(tally 内部で解決)と宣言する |

- classifyLate は受理時分類のため非解決(素の ballot 単位)— late lane の amend も post-tally 到着なら late のまま。
- FR-4 (b) の充足構造: verify の recompute(tally 経由)と freq/reservation 検査(明示 resolved)が同一 resolver 定義を通るため乖離しない。record.md に描画される GoA 行・留保数と verify の再計算も同一 resolved 母集団(#2=#3)。

## election-store

### appendBallot の unknown-ref 照合(FR-3、E-BFARA3)

```ts
export type StoreError = "exists" | "duplicate" | "not-found" | "io-error" | "corrupt" | "unknown-ref";  // 既存5値(store.ts:33 実測順)+ unknown-ref のみ追加
// ballot.kind === "amend" のとき: accepted(ballots+late)から
//   b.voter === ballot.ref.voter && b.submittedAt === ballot.ref.submittedAt && ballot.ref.electionId === electionId
// の既存 ballot(original または先行 amend)を探し、不在なら err("unknown-ref")。dup 判定(:131-133)の直後に挿入。
```

## election-cli

- `handleVote`: `storeFail("appendBallot", "unknown-ref")` が既存の storeFail 経路で loud に出る(新規コードほぼ不要)。`Ballot.parse` の `invalid-timestamp` も既存 `vote: <分類>` fail 経路(:332)で表示 — 追加はエラー文言のみ。
- `normalizeAt(:334)`: 残置(ADR-1)。受理済み入力に対し恒等であることを示すコメントを付す。

## テスト面(NFR-2: unit=純関数 / integration=実 FS)

| テスト | 層 | 検証 |
| --- | --- | --- |
| t234 追加 | unit | invalid-timestamp 6分類(`__NOW__` / 日付のみ `2026-07-19` / ms 形 / TZ オフセット形 / 空文字 / 正当形)、amend parse(kind/ref)、resolveBallots(最新勝ち・同時刻 amend 優先・original のみ・空) |
| t235 追加 | integration | unknown-ref 拒否 / ref 一致 amend 受理・共存(ADR-5 不変)/ timeline amendment 行 |
| t236 追加 | integration | vote verb で amend 疎通(FR-3(b)(d) 閉包)/ original+amend 後の tally 単一計上(FR-4(a)) |
| corpus sweep | 実装時検証(コミット外) | leader worktree elections/ の glob 全数へ SUBMITTED_AT_RE+Date を適用、正当データ赤 0(FR-2) |
