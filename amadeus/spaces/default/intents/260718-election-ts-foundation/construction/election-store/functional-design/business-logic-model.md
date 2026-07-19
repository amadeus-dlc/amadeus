# Business Logic Model — election-store(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ストアレイアウト(ADR-2 — space レベル elections/)

```
amadeus/spaces/<space>/elections/<選挙ID>/
  election.json        # 定義(Election の直列化 — 正本)
  views/<voter>.json   # 配布ビュー(voter 別)
  ledger.json          # 受付台帳(受理票の追記列+投票済み/未着の導出元)
  ballots/             # 開票時実体化(materialize — S-07 blind 解除)
  tally.json           # 開票結果(TallyResult+開票時点の票集合固定 — FR-4c)
  timeline.json        # イベント記帳(TimelineEvent 追記列)
```

ファイル名様式・選挙 ID 採番は実装時に mirror.ts 様式へ揃える(decisions.md 委任)。

## 操作フロー(C2 — 全て atomic write: tmp+rename の既習様式)

```
Store.create(election, views):    既存 ID → reject("exists")。dir 作成+定義+views 書込
Store.appendBallot(ballot):       ledger 読取 → 同一 voter の既受理(非 amend)→ reject("duplicate")
                                  amend → 原票保持のまま追記(ADR-5)。受理 → ledger 追記+timeline 記帳
Store.materialize(tallyResult):   ledger 全票 → ballots/ へ一括ファイル化+tally.json 書込(開票時点の票集合固定)
Store.load / Store.status:        読取のみ。status = 投票済み/未着一覧(voters − ledger 受理者)— FR-3c
Store.appendTimeline(event):      送信実行の結果からのみ呼ばれる(呼出契約 — 送らず記帳する経路を持たない。FR-2b の受け入れは U4 の統合テストで固定)
```

## 並行性

選挙は追記型(ledger/timeline は append 列)で、単一 conductor 運用が前提。ロック機構は導入しない(必要が実測されたら別 Issue — 新規機構最小化)。torn-write は tmp+rename で防止。

## Bolt 切り出しの参照(正本 = delivery-planning/bolt-plan.md)

Bolt 1 の U2 核 = create+load(0件確認選挙の完走に必要な最小面)。台帳・実体化・タイムラインの完全化は Bolt 3(io-record-transport)。

## エラー処理

fallible API は Result(exists/duplicate/not-found/io-error の判別)。I/O 失敗は握りつぶさず Result で返す(サイレント失敗なし — construction ガードレール)。
