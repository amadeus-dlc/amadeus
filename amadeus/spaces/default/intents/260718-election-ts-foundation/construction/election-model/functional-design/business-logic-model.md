# Business Logic Model — election-model(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## tally 決定表(FR-4a — gradients-of-agreement-scale の写像)

入力: election(投票者集合)+受理済み ballots[]。GoA 側割当:

| GoA | 側 | 根拠 |
|---|---|---|
| 1, 2, 3, 6 | 賛成側 | norm (i) |
| 7, 8 | 反対側 | norm (i) |
| 4 | 定足数除外(どちらにも数えない) | norm (v) |
| 5 | 賛否に数えない。2票以上で hold(discussion-needed)(E-ETF-FD Q1=A 裁定) | norm (iii) |

判定順序(先勝ち):

```
tally(election, ballots):
  1. GoA 8 が1票以上         → hold(block)          # norm (iv) — 成立保留
  2. GoA 5 が2票以上         → hold(discussion-needed)  # Q1=A 裁定
  3. 有効票(賛成側+反対側)= 0 → hold(quorum-short)   # Q2=A 裁定(最小定義・新定数なし)
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
# 二重票 reject は C2 Store.appendBallot の所有(AD 契約 — U2 FD で詳細化)
```

## Bolt 切り出しの参照(正本 = delivery-planning/bolt-plan.md — 本節は整合参照のみ)

Bolt 1(walking-skeleton)の U1 核 = **型一式+`Election.parse`+最小 `tally`(zero-confirm の単純確定パス)+trivial な票受理**(構文 parse のみ — 5クラス fail-closed 検証の完全化は bolt-plan どおり **Bolt 2**)。シャッフル・early tally・後着分類も Bolt 2(model-complete)。旧起草は 5クラス検証を Bolt 1 に含めており bolt-plan.md:11-12 と矛盾していた(reviewer Finding 1 是正 — bolt-plan 側を正とする)。

## エラー処理

**全ての fallible API(`Election.parse`/`Ballot.parse`)は `Result<T, E>` を返し throw しない**(判別ユニオン Result 既決)。全域関数(shuffleView/tally/canEarlyTally/classifyLate)は失敗しない設計のため素の値を返す(reviewer Finding 4 是正 — 過大主張の限定)。エラーは呼び出し元(C6 CLI)が指令/exit code へ写像。
