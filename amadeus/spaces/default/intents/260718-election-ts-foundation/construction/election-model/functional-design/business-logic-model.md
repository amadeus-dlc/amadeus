# Business Logic Model — election-model(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## tally 決定表(FR-4a — gradients-of-agreement-scale の写像)

入力: election(投票者集合)+受理済み ballots[]。GoA 側割当:

| GoA | 側 | 根拠 |
|---|---|---|
| 1, 2, 3, 6 | 賛成側 | norm (i) |
| 7, 8 | 反対側 | norm (i) |
| 4 | 定足数除外(どちらにも数えない) | norm (v) |
| 5 | 賛否に数えない。【E-ETF-FD Q1 裁定待ち — A: 2票以上で hold(discussion-needed) / B: 素通し(開票後の人間裁量)】 | norm (iii) |

判定順序(先勝ち):

```
tally(election, ballots):
  1. GoA 8 が1票以上         → hold(block)          # norm (iv) — 成立保留
  2. 【Q1=A 採用時: GoA 5 が2票以上 → hold(discussion-needed)】
  3. 有効票(賛成側+反対側)の定足数判定【E-ETF-FD Q2 裁定待ち — A: 有効票 0 で hold(quorum-short) / B: 過半着票閾値 / C: 実装時委任】
  4. 賛成側 > 反対側          → established(adopted)
     反対側 > 賛成側          → established(rejected)
     同数                    → hold(tie)
```

- `canEarlyTally(election, ballots)`: 未着票が全て反対側に回っても賛成側多数が覆らないとき true(= 賛成側 > 反対側 + 未着数)。GoA 8 既着なら常に false(hold(block) が先行)
- `classifyLate(tallyTime, ballot)`: submittedAt > tallyTime で LateBallot 化、goa===8 で reexamRequired=true(early-tally-with-block-reopen の型写像)

## 決定的シャッフル(FR-1b、ADR-4)

```
shuffleView(election, voter):
  seed = fnv1a(electionId + ":" + voter)     # 具体 hash 関数は実装時選定(Bun 標準内、外部依存なし — NFR-1)
  order = fisherYates(choices, mulberry32(seed))  # シード付き決定的 PRNG
  displayNo は order 上の連番、internalNo は Choice が保持
```

- 監査再現: 同一入力から配布ビューを再生成して照合可能(ADR-4 Consequences)

## 票検証フロー(FR-3a/3b — fail-closed)

```
Ballot.parse(raw, election):
  parse 不能            → parse-failure
  electionId 不一致     → unknown-election
  voter ∉ voters        → unknown-voter
  goa 数値 parse 失敗/1-8 外 → goa-out-of-range   # verification-numeric-parse: "five" 等は例外でなく型エラー
  goa ∈ {2,3,6} かつ reservation 空 → reservation-missing
  成功 → Ballot
checkDuplicate(accepted, candidate):
  同一 voter の既受理票あり(amend でない) → duplicate(拒否 — ADR-5)
```

## Bolt 1 最小核(walking-skeleton 切り出し — bolt-plan)

型一式+`Election.parse`+`Ballot.parse`(5クラス)+最小 `tally`(0件確認選挙 = zero-confirm: 賛成のみの単純確定パス)。シャッフル・early tally・後着・checkDuplicate の完全化は Bolt 2(model-complete)。

## エラー処理

全 API は `Result<T, E>` を返す(throw しない — 判別ユニオン Result 既決)。エラーは呼び出し元(C6 CLI)が指令/exit code へ写像。
