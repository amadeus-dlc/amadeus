# Business Logic Model — election-store(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ストアレイアウト(ADR-2 — space レベル elections/)

```
amadeus/spaces/<space>/elections/<選挙ID>/
  election.json        # 定義(Election の直列化)+ **state フィールド(ElectionState の明示永続 — 正本。E-ETF-FD2 (3) 承認: component-methods C2『選挙状態の読取』を正とし導出でなく保存)**
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
Store.appendBallot(ballot):       election.json の state を読取 —
                                  **全経路共通の先頭検査**: 同一 voter の既受理(非 amend、late 区画含む)→ reject("duplicate")
                                    (二重票拒否は全期間適用 — FR-3b。reviewer iter2 #5 是正: 後着経路の迂回を封鎖)
                                  state が tallied 以降 → **後着経路**: U1 classifyLate(tally.json の開票時刻, ballot) を U2 が呼び、
                                    LateBallot(reexamRequired 含む)を ledger の late 区画へ追記+timeline late 記帳(ballots/ 本集計は不変)
                                  それ以外 → 通常経路: amend → 原票保持のまま追記(ADR-5)。受理 → ledger 追記+timeline 記帳(reviewer F4 是正 — 分岐と呼出主体を明記。duplicate 検査は上の共通先頭検査で実施済み)
Store.materialize(tallyResult):   ledger 全票 → ballots/ へ一括ファイル化+tally.json 書込(開票時点の票集合固定)
Store.load / Store.status:        読取のみ。status = 投票済み/未着一覧(voters − ledger 受理者)— FR-3c
Store.appendTimeline(event):      配信・票・開票・後着の4イベント種いずれも、**対応する操作の実行結果からのみ**呼ばれる
                                  (結果を伴わない記帳経路を持たない — reviewer F3 是正で4種全体へ拡張。
                                   FR-2b が要求するのは配信記帳の実行結果由来であり、その受け入れは U4 統合テストで固定。
                                   票=appendBallot 受理時 / 開票=materialize 時 / 後着=後着受付時が各起点)
```

## 並行性(単一書込主体 — D-09 既決からの導出、E-ETF-FD2 (1) leader 承認 2026-07-19T03:22:09Z)

**store の書込主体は選挙 conductor(team モードでは leader)ただ1つ** — D-09(票は leader 宛私秘→開票時一括ファイル化)により、メンバーは elections/ を書かず、票は agmsg で conductor へ還流し conductor が `vote` verb を代行実行する。solo モードも conductor 1名。したがって複数プロセスの並行書込は構造的に発生せず、ロック機構は導入しない(lost-update の前提条件が成立しない)。torn-write は tmp+rename で防止。git マージ面も単一書込者のため通常の checkpoint コミットで足りる。

## Bolt 切り出しの参照(正本 = delivery-planning/bolt-plan.md)

Bolt 1 の U2 核 = create+load(0件確認選挙の完走に必要な最小面)。台帳・実体化・タイムラインの完全化は Bolt 3(io-record-transport)。

## エラー処理

fallible API は Result(exists/duplicate/not-found/io-error の判別)。I/O 失敗は握りつぶさず Result で返す(サイレント失敗なし — construction ガードレール)。
