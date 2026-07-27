# Reliability Requirements — solo-election-core (U1)

上流入力(consumes 全数): business-logic-model.md(tally 2体分岐・個数照合)、business-rules.md(BR-U1-1〜8 の検証列)、requirements.md(NFR-01〜03 の正本)、technology-stack.md(Bun/TS/ESM・テスト4層の実行環境)。

## 信頼性要件

| ID | 要件 | 合否基準 | 出典 |
|---|---|---|---|
| U1-REL-01 | 2体分岐の全組合せ(15通り — レビュー検算済み)が決定的に判定され、未定義組合せが存在しない | t234 追加ケースが15組合せの代表7通り(FF/FA/FQ/FD/BQ/QD/DD)+3体境界を被覆。7通りで15通りを被覆できる根拠: 優先度カスケード(block 最優先→discuss→abstain→split/勝者)により block 系5通り・discuss 系4通り・abstain 系3通りは各カテゴリ内で同一判定へ収束する(business-logic-model.md の全組合せ表と同値) | business-logic-model.md(全組合せ)、business-rules.md BR-U1-1〜4 |
| U1-REL-02 | 落ちる実証: {5,1}/{4,1}/{1,7} が修正前 established になることをテストで実証してから修正する(偽の落ちる実証の禁止) | 修正前 red 実証の記録(コミット順 or テストコメント)+修正後 green | requirements.md FR-05 AC、bolt-plan の順序 |
| U1-REL-03 | TLA 2体モデルの TLC 完全探索が完走し、NOT_DETECTED 主張は completion marker+state 統計を伴う | TLC ジョブの完走ログ(部分探索・timeout は HARNESS_ERROR 扱い) | business-logic-model.md(TLA 対応)、cid:application-design:finite-exploration-not-detected-proof |
| U1-REL-04 | 実選挙スケルトンで subagent 票2票が store に固定され、2-0 即採用/1-1 エスカレーションの両分岐が実測される | elections store の実データ(voterKind: "subagent" 2票)+両分岐の record | business-rules.md BR-U1-8、requirements.md FR-01 AC(ballots 2/tally.json/record.md の固定)・FR-05 AC と Traceability M-06(1-1 エスカレーション分岐の実証) |

## 障害時の挙動境界

tally は純関数のため障害モードは「不正入力の parse 拒否」(U1-SEC-01)と「hold への正常縮退」のみ。リトライ・フォールバック分岐は設けない(要求外の互換レイヤー禁止 — org.md Forbidden)。
