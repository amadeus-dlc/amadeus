# re-scan 記録 — 260720-ballot-received-at

## 実行メタデータ

- Date: 2026-07-20(Asia/Tokyo)
- Intent: `260720-ballot-received-at`
- Issue: [#1262](https://github.com/amadeus-dlc/amadeus/issues/1262)(agmsg 中継票に receivedAt が無く、中継遅延で timeline が非単調になり verify が正当な選挙を完走不能にする)
- Scope / project type: `bugfix` / Brownfield
- Repository / stage: `amadeus` / `reverse-engineering`(2.1)
- Base commit: `262a86db9b2a47b59ac0b1287e540295ca212378`(`re-scans/260719-tally-choice-ruling.md` の Observed、HEAD 祖先 `git merge-base --is-ancestor` exit 0 実測)
- Observed commit: `37f8cf5e67cef77adfd82ef292303790f756c8fd`(現 HEAD)
- Base selection: 直近 re-scan の Observed を継承。区間 `262a86db9..HEAD` は 16 コミットだが `git log 262a86db9..HEAD -- scripts/ tests/ packages/` = **0 件**(全て `record(tally-choice-ruling)` の工程記録コミット)。フォーカス正本(`scripts/amadeus-election*.ts` + `tests/`)は区間内で無変更のため、Observed=HEAD のワークツリー実測が base 断面と同一(rescan-base-ancestry 準拠)。#1268(tally winner 化)は本ブランチの `262a86db9..HEAD` 区間には未着地 — `scripts/` diff 0 件で確認。
- 測定 ref: 全 file:line は Observed=HEAD `37f8cf5e6` のワークツリー実測(measurement-ref-in-artifacts 準拠)。回避運用の実データは leader tree のリードオンリー実測(`.../runs/20260719-231310-08a0/leader/amadeus/spaces/default/elections/`、正規化コミット `5e96f8766`)。e2 交差は e2 worktree(`.../engineer-2`、branch `team/20260719-231310-08a0/engineer-2` @ `67cf31165`)のリードオンリー実測。
- Focus: (1) 中継票の `submittedAt` がどこで timeline の `at` になるか、(2) `receivedAt` 相当時刻がどこにも記録されないこと(反証 grep)、(3) verify の timeline-order 検査の実装と正当選挙が完走不能になる経路、(4) 本日の回避運用の非単調実データ(回帰 fixture)、(5) e2 `260719-ballot-failclosed-amend` との関数交差、(6) timeline/verify/classifyLate の既存テスト固定内容と receivedAt 系テスト不在。
- 実施体制: Developer code scan → Architect synthesis(codekb 合成・timestamp 更新は後続)。

## 結論

バグの一次原因は `scripts/amadeus-election-store.ts` の `appendBallot` が timeline イベントの `at` に **投票者の自己申告時刻 `ballot.submittedAt` をそのまま書く**(:156 late lane、:166 normal lane)ことにある。受理側の機械時刻(leader が `vote --file` を実行した時刻)は **どこにも記録されない**(`receivedAt` は scripts/ tests/ packages/ 全域で 0 件 — 反証 grep 実測)。verify の `verifySelf`(record.ts:179-183)は timeline の `at` 列が辞書式昇順であることを要求するため、agmsg 中継票(送信側 submittedAt を保持したまま受理が遅延)と CLI 直接投票が混在すると、**受理順と submittedAt 順が乖離して構造的に非単調化**し、正当な選挙が `timeline-order` finding で `done` へ到達できない。

原因の所在は**設計**にある。timeline の時刻軸として `submittedAt`(投票者申告)を採用し、受理境界の機械時刻を捨てる設計判断が intent `260718-election-ts-foundation`(walking-skeleton 〜 Bolt 4)でなされ、中継 vs 直接投票の混在シナリオが requirements/functional-design/テストで未固定だった。`submittedAt` は投票者が自己申告する値(BallotShape の必須フィールド、model.ts:164)であり、受理側が検証・順序付けに使う機械時刻とは異なる意味を持つが、この2軸が単一フィールドに畳まれている。construction phase guardrail「統合境界(ここでは agmsg 中継 = 外部境界)の入力検証」の裏面で、受理境界の時刻を記録しない欠落。

実害は E-BFARA1/2/3(2026-07-19)で顕在化し、ユーザー承認のうえ timeline 配列を `at` 昇順ソート(時刻値不変・並び正規化のみ)して verify を通過させる暫定運用で回避された(leader コミット `5e96f8766`)。関連 = #1252(submittedAt 様式無検証、受理境界検証欠落の同族)。

## 機序確定(file:line + verbatim)

### submittedAt が timeline の at になる経路

`scripts/amadeus-election.ts` の `handleVote`(:320-339)が受理し、`submittedAt` を `normalizeAt`(秒精度 UTC 正規化)したうえで store へ渡す:

```ts
// election.ts:334
const ballot = { ...parsed.value, submittedAt: normalizeAt(parsed.value.submittedAt) };
const appended = Store.appendBallot(root, electionId, ballot);
```

`normalizeAt` は精度混在を防ぐだけで、値の意味(投票者申告時刻)は不変(transport.ts:87-91):

```ts
export function normalizeAt(at: string): string {
  const parsed = new Date(at);
  if (Number.isNaN(parsed.getTime())) return at; // leave unparseable input visible
  return parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}
```

`Store.appendBallot` が timeline イベントを生成する2箇所とも `at: ballot.submittedAt`(store.ts:154-159 late lane / :164-169 normal lane、verbatim):

```ts
// store.ts:164-169(normal lane)
return Store.appendTimeline(root, electionId, {
  kind: "ballot",
  at: ballot.submittedAt,
  detail: `ballot ${ballot.kind === "amend" ? "amendment" : "accepted"}: ${ballot.voter}`,
  voter: ballot.voter,
});
```

`appendTimeline`(:174-179)は受け取った event をそのまま append list へ追記する(受理順=append 順に格納されるが、event.at は submittedAt のまま)。したがって **timeline 配列の格納順 = 受理順、各要素の at = 投票者申告時刻** となり、この2軸が中継遅延で乖離する。

### receivedAt 相当時刻がどこにも記録されないこと(反証 grep)

- `grep -rc "receivedAt" scripts/ tests/ packages/framework/core/tools/` → **0 件**(絶対不在を機械確認、absence-claim-grep-verify)。
- timeline に流れる `at` の全供給源(`grep -n` 実測):
  - store.ts:156 `at: ballot.submittedAt`(late)
  - store.ts:166 `at: ballot.submittedAt`(ballot)
  - store.ts:228 `at: talliedAt`(tallied — `handleTally` が `normalizeAt(new Date().toISOString())` を渡す、election.ts:354 = 受理側機械時刻だが tally イベント限定)
  - election.ts:304 `at: d.result.value.record.at`(distributed — `makeDeliveryRecord` の `now()` = 配信側機械時刻、transport.ts:148)
- すなわち **ballot / late イベントだけが機械時刻を持たず submittedAt を使う**。distributed/tallied は既に機械時刻を使っている(非対称)。この非対称が symmetric-pair-review 観点で「片側だけ機械時刻」のクラスタに該当。

### verify の timeline-order 検査と完走不能経路

`handleVerify`(election.ts:434-460)は tally 再計算・GoA 行 round-trip・留保転記数・`verifySelf` の3クラス走査を行う。timeline-order 検査は `verifySelf`(record.ts:165-185)内:

```ts
// record.ts:179-183(verbatim)
for (let i = 1; i < timeline.length; i++) {
  const prev = timeline[i - 1].at;
  const cur = timeline[i].at;
  if (cur < prev) findings.push({ kind: "timeline-order", expected: prev, actual: cur });
}
return findings.length === 0 ? ok(undefined) : err(findings);
```

- 比較対象: 隣接する timeline イベントの `at` 文字列(ISO-8601 秒精度 UTC、辞書式 `<` 比較 = 時系列比較)。
- fail 条件: いずれかの隣接ペアで `cur < prev`(後の要素が前より過去)。1件でも finding が出れば `verifySelf` は `err([...])` を返す。
- `handleVerify`:456-457 が `verifySelf` の err を受けて `return fail(...)` → **exit 1**。`report --result verified` へ到達できず、状態機械は `rendered` 止まりで `recorded`(=done)へ遷移不能。

**完走不能の具体経路**: 中継票(submittedAt が過去)が直接票(submittedAt がより新しい)の **後に** 受理されると、timeline 配列は `[..., 直接票(新しい at), 中継票(古い at)]` の順で格納される。verifySelf が `prev=直接票.at`(新)、`cur=中継票.at`(旧)を比較して `cur < prev` → `timeline-order` finding → verify 停止。時刻値・集計・GoA はすべて正当だが、並びだけで正当な選挙が done へ到達できない。

## 回避運用の実測(回帰 fixture 用の非単調実データ)

leader tree の E-BFARA1(intent 起点の実選挙)で非単調が発生。**ledger.json の append 順が受理順の正本**(appendBallot は呼び出し順に push)であり、これが回帰 fixture の権威データ:

- ledger append 順(= 真の受理順、E-BFARA1/ledger.json):
  1. `e1` submittedAt `2026-07-19T22:10:03Z`(受理1番目)
  2. `e4` submittedAt `2026-07-19T22:10:42Z`(受理2番目 — CLI 直接投票)
  3. `e3` submittedAt `2026-07-19T22:10:29Z`(受理3番目 — agmsg 中継、遅延着)

- したがって **正規化前の timeline**(受理順で at=submittedAt)は:
  - `ballot e1 @ 22:10:03Z`
  - `ballot e4 @ 22:10:42Z`
  - `ballot e3 @ 22:10:29Z` ← `22:10:29 < 22:10:42` で **timeline-order finding 発火**(expected=`2026-07-19T22:10:42Z`、actual=`2026-07-19T22:10:29Z`)

- 現行 leader tree の timeline.json は**正規化後**(at 昇順ソート済み): `[e1@22:10:03, e3@22:10:29, e4@22:10:42]`(単調)。ledger 順(真の受理順)と timeline 順(正規化後)が乖離していることが、回避運用の痕跡そのもの。

- 回避 provenance(コミット `5e96f8766` メッセージ verbatim):
  > E-BFARA1-3 timelines were re-sorted by 'at' ascending (user-approved normalization; relay-accepted ballots carry sender-side submittedAt and landed after a direct CLI vote — no timestamp values changed).

- **回帰 fixture 対照**(受理順 vs submittedAt 順):

| voter | submittedAt | 受理順(ledger append) | 経路 |
|---|---|---|---|
| e1 | 22:10:03Z | 1 | — |
| e4 | 22:10:42Z | 2 | CLI 直接 |
| e3 | 22:10:29Z | 3 | agmsg 中継(遅延) |

  受理順 [e1, e4, e3] で at=submittedAt を並べると非単調(3番目が2番目より過去)。受理時刻(receivedAt)軸なら append 順=単調が構造保証される。E-BFARA2/E-BFARA3 も同一 ballot 集合(submittedAt 同値)で同型。他選挙(E-TCRRA1-4、E-CCCRAS13、E-BFAFD、E-BFAND)の現行 timeline は ballot at が昇順(直接投票のみ or 正規化済み)で非単調は E-BFARA1/2/3 に限局。

## e2 交差目録(関数単位)

e2 intent `260719-ballot-failclosed-amend`(#1252/#1253、branch `team/.../engineer-2` @ `67cf31165`、現在 ND ゲートで park、code-generation 未着手=untracked)は本 #1262 と**同一3ファイルを編集する高交差**。requirements.md(e2 worktree リードオンリー実測)から関数単位で列挙:

| e2 の対象(FR) | ファイル:関数 | #1262 想定修正面 | 交差判定 |
|---|---|---|---|
| FR-1: submittedAt 受理段 fail-closed 検証 | `model.ts:184-204` `Ballot.parse`(`invalid-timestamp` 分類追加) | Ballot 型 / submittedAt 意味論(receivedAt 分離) | **交差**(同関数・同フィールド近傍) |
| FR-1 留保: normalizeAt 扱い | `election.ts:334` normalizeAt 呼び / `transport.ts:87-92` | 受理時 receivedAt 採取を handleVote 近傍に追加 | **交差**(同関数 handleVote) |
| FR-3: amend 提出経路 | `election.ts:320-338` `handleVote` | 同上 handleVote | **直接交差**(同関数) |
| FR-3 (c): amend timeline 疎通 | `store.ts:167`(=本 RE の :166)timeline `at` 分岐 | **本バグの修正正本**(store.ts:156/166 の `at:` 差し替え) | **直接交差**(同一行近傍) |
| FR-3: ref 検証 unknown-ref 分類 | `model.ts` BallotError 拡張 | — | 低交差 |
| FR-4: amend tally 解決(per-voter 最新1票) | `model.ts:321-337` `tally` | — | 低交差(#1262 は tally 不変) |
| FR-4 (c): classifyLate 整合 | `model.ts:296-298` `classifyLate` | classifyLate は submittedAt 軸(:297)— receivedAt 導入時の late 判定軸は要 design 判断 | **要調整**(時刻軸の意味が両 intent で交わる) |

- ファイル単位: 両 intent とも `scripts/amadeus-election-model.ts` / `scripts/amadeus-election-store.ts` / `scripts/amadeus-election.ts` を編集(非交差ではない)。c6(非交差判定)・parallel-bolts に従い **直列化 or merge 協調が必須**。特に `store.ts` appendBallot の timeline `at` 行と `election.ts` handleVote は両 intent の修正正本が重なる。
- e2 は「t238 は触らない(W-1)」「修正面は scripts/amadeus-election-*.ts+tests のみ、dist 投影 0件」を明記。#1262 も同じ配布面前提を共有する。
- 現況: e2 は ND(nfr-design)park 中で CG 未着手。着手タイミング次第で直列 or rebase 協調。requirements/delivery-planning で交差を明示し、着手前に実 diff で再判定(c6)。

## テスト面(既存固定内容 + receivedAt 系不在)

- election 系テスト6本(全て base 区間で無変更): `tests/unit/t234-election-model.test.ts`、`tests/unit/t238-election-record.test.ts`、`tests/integration/t235-election-store.integration.test.ts`、`tests/integration/t236-election-loop.integration.test.ts`、`tests/e2e/t237-election-walking-skeleton.test.ts`、`tests/e2e/t241-election-machine-executor.test.ts`。
- **timeline-order 検査の固定**(t238:146-182、BR-R4 `verifySelf reports ballot-count / freq / timeline findings`):
  - `goodTimeline`(:150-154): distributed 00:00 → ballot 00:01 → tallied 00:02(単調、happy path で `.ok === true`)。
  - `badTimeline`(:169-173): distributed 00:00 → **tallied 00:02 → ballot 00:01**(tally が ballot を先行=非単調)を注入し `timeline-order` finding を固定(:176)。
  - **この fixture は「tally が ballot に先行」型の非単調のみを固定しており、本 #1262 の「中継票 submittedAt < 先行直接票」型(ballot 同士の非単調)は未固定**。回帰テストは受理順 [e1,e4,e3] × submittedAt を注入する新ケースが必要。
- **appendBallot / timeline の at 意味論を検証するテストは不在**: t235 は timeline イベントの `kind`(late/tallied 存在、:210/:230)は検証するが、`at` の値がどの時刻軸(submittedAt か受理時刻か)かは検証しない。t235:139-146 の amend も submittedAt を ref に使うのみ。
- **classifyLate**(t234:207-220): submittedAt を tallyTime と比較する軸を固定(`classifyLate(tallyTime, onTime)` で submittedAt<=tally は null、:212)。receivedAt 導入時、late 判定を submittedAt 軸のまま残すか受理時刻軸へ移すかで t234 の前提が変わりうる — design 判断点。
- **receivedAt 系テストは全域 0 件**(grep 実測)。修正時に (a) 受理時刻を timeline に記録し単調性が受理順で保証されること (b) 中継/直接混在の非単調実データ(E-BFARA1 型)が verify を通過すること (c) submittedAt が ballot 上に申告値として保存され続けること、の3点を新規テストで固定する必要。
- 遡及 sweep(corpus-sweep-for-new-guards / transient-state-fixtures): timeline `at` の意味を変える修正は leader elections/ 配下の**全既存選挙**(実装時点 glob 列挙、RE 時点 leader tree に 37 ディレクトリ実在)に対し、正当データが赤にならないことの両側実証が必要。既存 timeline は正規化後(単調)なので受理順記録への移行時は再生成 or 互換読取の design 判断あり。

## requirements への未決点(design で確定すべき選択肢)

1. **修正方式(時刻軸)**: 案A = timeline イベントに新フィールド `receivedAt`(受理側機械時刻)を追加し、`verifySelf` の単調性検査を `receivedAt` 軸へ切替、`submittedAt` は ballot 上に申告値として保存のみ(Issue 提案案)。案B = timeline イベントの既存 `at` を受理時刻へ意味変更し submittedAt は ballot 側のみ保持(TimelineEvent スキーマ最小変更だが at の意味が破壊的変更)。案C = verifySelf の単調性検査自体を撤廃/緩和(順序不問)。→ **案A/B が有力、C は verify の検査価値を失う**。TimelineEvent 型(model.ts:141-146)は U2 が persist・U3 が render する canonical 定義のため、フィールド追加は render(record.ts:84-99 timelineSegment)への波及を要確認。
2. **受理時刻の採取点**: `handleVote`(election.ts:334 近傍)で `normalizeAt(new Date().toISOString())` を採取し appendBallot へ渡すか、`appendBallot` 内で採取するか。distributed(transport.ts:148 now())/tallied(election.ts:354)が既に機械時刻を持つ様式に揃える(symmetric-pair-review)。
3. **classifyLate の時刻軸**(model.ts:296-298): late 判定を submittedAt(申告)軸のまま残すか、受理時刻軸へ移すか。tally 母集団の fixed set は「tallied 時刻より前に受理されたか」で決めるべきで、submittedAt 軸だと中継遅延で late 誤判定しうる。e2 FR-4(c) と交差 — 両 intent 協調要。
4. **既存 timeline データの互換**: leader elections/ の全既存 timeline.json は receivedAt を持たない。読取時に欠落を submittedAt fallback で埋めるか(移行シムは construction guardrail で原則禁止 — 根拠を NFR に明示)、再生成するか。トランクベース互換負債回避の観点で fallback は要根拠。
5. **e2 との着手順**: store.ts/election.ts/model.ts の3ファイル交差により直列化 or rebase 協調が必須(上記交差目録)。delivery-planning で着手前の実 diff 再判定を定型化。
6. **回帰テスト設計**: 中継/直接混在の非単調(E-BFARA1 実データ [e1,e4,e3] × submittedAt)を注入し、修正前は verify 赤・修正後は緑の両側実証(落ちる実証)。テストは in-process seam(verifySelf / appendBallot 直呼び)で lcov 有効化(fs-tests-integration-first)。

## 測定コマンド(数値の出所)

- 区間 scripts 変更 0 件: `git log --oneline 262a86db9..HEAD -- scripts/ tests/ packages/` = 0 行。
- receivedAt 不在: `grep -rc "receivedAt" scripts/ tests/ packages/framework/core/tools/` = 全 0(マッチ無し)。
- submittedAt 出現 11 箇所(scripts/): `grep -rn "submittedAt" scripts/` = 11 行。
- dist/self-install 投影 0: `find dist -name "*election*"` = 0、`.claude` の唯一マッチは `.claude/skills/amadeus-election`(SKILL、tool コピーではない)。election CLI は `scripts/` のみに存在(projected source dir 外)。
- base 祖先性: `git merge-base --is-ancestor 262a86db9 HEAD` exit 0。
- leader 非単調 provenance: `git -C <leader> show -s 5e96f8766`。
