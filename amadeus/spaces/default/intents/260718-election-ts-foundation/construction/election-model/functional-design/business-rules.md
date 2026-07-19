# Business Rules — election-model(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ルール一覧(テスト可能形)

| # | ルール | 由来 | テスト(unit 層 — fs 非依存純関数、unit-of-work 制約) |
|---|---|---|---|
| BR-1 | DistributionView の表示順は (electionId, voter) の決定的シードで、投票者2名の順序が異なりうる。票の内部 No 写像は全シャッフルで恒等に集計される | FR-1b 受け入れ | 固定シードで2 voter の順序差+表示番号→内部 No round-trip の恒等 assert |
| BR-2 | DistributionView 型は推奨・先行票・他者状況のフィールドを持たない(構造的 blind) | FR-1c、ADR 委任 | 型面: フィールド不在の compile 検査+生成値のキー全数 assert |
| BR-3 | 不正票5クラス(unknown-election/unknown-voter/goa-out-of-range/reservation-missing/parse-failure)は fail-closed で拒否され、拒否理由が型で返る | FR-3b | 5クラス各1ケース+境界(goa=0/9/非整数/"five") |
| BR-4 | U1 は AmendBallot/BallotRef 型を提供する(reject 判定の所有は C2 Store.appendBallot — AD 契約。テストは U2 integration 層) | FR-3b、ADR-5 | 型面: AmendBallot の判別・BallotRef 参照の構築 assert(unit) |
| BR-5 | tally: GoA 8 ≥1 で hold(block)/ 賛否同数で hold(tie)/ 賛成 1-3・6 vs 反対 7-8 の多数決 / 4 は不算入 | FR-4a/4b、norm (i)(iv)(v) | 全 GoA 分岐の決定表テスト |
| BR-6 | GoA 5 は賛否に数えず、2票以上で hold(discussion-needed)(Q1=A 裁定) | norm (iii)、FR-4a/4b | 5×1(素通り成立)/5×2(hold)の境界2ケース |
| BR-7 | quorum-short は有効票(賛成側+反対側)0 件のときのみ(Q2=A 裁定 — 全票 4/5 のケースを含む) | FR-4b | 有効票0(全棄権)/有効票1 の境界2ケース |
| BR-8 | canEarlyTally: 未着全数が反対側に回っても賛成側多数が不動のとき true。GoA 8 既着で false | FR-4c | 境界(残1票で覆る/覆らない)+8 既着ケース |
| BR-9 | classifyLate: 開票時刻より後の票は後着記録+GoA 8 は reexamRequired | FR-3d | 後着2ケース(8/非8) |
| BR-10 | 決定性: 同一入力→同一出力(shuffleView/tally/render 入力面) | NFR-3 | 同一入力2回実行の deep-equal |
| BR-11 | Date.now 等の環境時刻に tally/shuffle が依存しない(submittedAt/tallyTime は入力で受ける) | NFR-3 の系 | 時刻注入で純関数性を assert |

## 落ちる実証(NFR-2 — FR-3b/FR-4 の受け入れに内包)

BR-3(検証述語)と BR-5(側割当)の実行時消費行へ注入し赤→revert を実施(inject-runtime-consumed-lines、注入非コミット)。
