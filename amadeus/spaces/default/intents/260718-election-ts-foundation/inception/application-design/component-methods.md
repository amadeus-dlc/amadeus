# Component Methods — election-ts-foundation

> 上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

型は functional-domain-modeling-ts スタイル(判別ユニオン Result、type+コンパニオン — team-practices.md live Code Style 節準拠)。以下は公開 API 面の設計レベル定義 — 正確な型形状は functional-design/実装へ委任(decisions.md 委任節)。

## C1 election-model(純関数コア)

| メソッド | シグネチャ(概形) | 対応 FR |
|---|---|---|
| `Election.parse` | 定義データ → `Result<Election, DefineError>`(種別・質問・選択肢≥2・投票者集合≥1 を検証) | FR-1a |
| `Ballot.parse` | 生票データ → `Result<Ballot, BallotError>`(5クラス不正+GoA 2/3/6 留保必須を fail-closed 検証。GoA は数値 parse — verification-numeric-parse) | FR-3a/3b |
| `shuffleView` | `(election, voter) → DistributionView`(seed=hash(選挙ID+voter) の決定的シャッフル、内部 No→表示番号写像を保持) | FR-1b |
| `tally` | `(election, ballots[]) → TallyResult`(判別ユニオン: `established(採用/不採用)` \| `hold(reason: tie \| block \| quorum-short)`。賛成 1-3/6・反対 7-8・棄権 4 除外・8 で hold) | FR-4a/4b |
| `canEarlyTally` | `(election, ballots[]) → boolean`(未着があっても賛成側多数確定か) | FR-4c |
| `classifyLate` | `(tallyTime, ballot) → LateBallot`(後着判定+GoA 8 なら再審フラグ) | FR-3d |

## C2 election-store(記録 I/O)

| メソッド | 責務 | 対応 FR |
|---|---|---|
| `Store.create` | `elections/<選挙ID>/` を作成し定義+配布ビューを書く(既存 ID は拒否) | FR-1a |
| `Store.appendBallot` | 票を受付台帳へ追記(二重票は reject — ADR-5。amend は原票保持のまま追記) | FR-3b/3c |
| `Store.materialize` | 開票時に全票を一括ファイル化(blind 解除 — S-07) | FR-5b |
| `Store.load` / `Store.status` | 選挙状態・受付台帳(投票済み/未着一覧)の読取 | FR-3c |
| `Store.appendTimeline` | 配信・票・開票・後着のイベント記帳(送信実行の結果からのみ — FR-2b) | FR-2b |

## C3 election-render(記録生成)

| メソッド | 責務 | 対応 FR |
|---|---|---|
| `renderGoaLine` | 票集合 → `GoA[E-<code>]: 1x<n> … 8x<n>`(parseGoaLine round-trip テストで byte 互換固定) | FR-5a, C-08 |
| `renderTimeline` | タイムライン1行様式(persist-vote-timeline-field 準拠) | FR-5a |
| `renderPersistDraft` | persist 文素案(裁定+留保転記+タイムライン+GoA 行) | FR-5a |

## C4 election-verify(照合)

| メソッド | 責務 | 対応 FR |
|---|---|---|
| `verifyReservations` | 留保必須票(GoA 2/3/6)件数 vs 文書中の転記件数の機械照合 | FR-6a |
| `verifySelf` | 票数・度数分布・タイムライン単調性の self-check(render 出力へ常時適用) | FR-6b |
| `verifyDocument` | 外部文書(persist 文・ノルム PR 本文)への検査 CLI 面 | FR-6b |

## C5 election-transport(輸送抽象)

```
interface VoterTransport {
  notify(voter, payload: ShortNotification): Result<DeliveryRecord, TransportError>
}
// ShortNotification = { electionId, viewPath } のみ — 質問文・選択肢テキストのフィールドを型として持たない(FR-2a の型保証)
```

- `AgmsgTransport`(team): send.sh spawn(env: process.env 明示 — bun-spawn-env-snapshot)。送信 exit code から DeliveryRecord を導出(送らず記帳する経路なし)
- `SubagentTransport`(solo): 配布ビューパスの返却のみ(spawn は呼出側 AI の指令実行 — ツールは投票 URL 相当の指令を出す)。票還流は C6 の `vote` 受理で同一

## C6 election CLI(指令ループ)

| verb | 責務 |
|---|---|
| `next --election <id>` | 状態機械(ADR-3)から型付き指令 JSON を stdout へ(stdout=directive / stderr=advisory — stdout-directive-stderr-advisory 準拠。構造写像元 = architecture.md:32-40 invoke-swarm directive への類推+component-inventory.md swarm 節の orchestrate/referee 分離実測) |
| `report --election <id> --result <...>` | 遷移コミット(配信済み・開票実行等) |
| `open` / `notify` / `vote` / `status` / `tally` / `render` / `verify` | 各操作の実行面(next の指令が名指しする)。全 verb loud エラー・exit code 契約(0/1) |

## C7 SKILL(amadeus-election)

- 内容: (1) `next` を呼ぶ (2) 指令を実行する (3) `report` する (4) hold 指令は人間へ委譲する — の転送ループのみ
- 禁止語彙 grep(FR-8a AC): GoA 数値集計規則・賛成/反対閾値・シャッフル手順・開票条件分岐の語彙が SKILL.md に現れないこと(検査は required-sections 型+禁止語彙 grep の2面、vocabulary-collision 回避のため Answer 行内限定型の語彙設計を実装時に行う)
