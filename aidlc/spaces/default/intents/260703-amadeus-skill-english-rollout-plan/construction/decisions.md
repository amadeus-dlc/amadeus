# Construction Decisions：Amadeus skill 英語化実施計画

## 判断一覧

| ID | 判断 | 根拠 | 影響 |
|---|---|---|---|
| CD001 | Issue #399 の完了境界は、#395、#400、#401、#402 の完了証拠がそろい、親 Issue の最終 PR が merge されることとする。 | Ideation で、子 Issue の完了まで含める判断に変更した。R005 は子 Issue の完了証拠から #399 の完了判断を行うことを要求している。 | #399 は #402 の計画文書作成だけでは閉じず、全子 Issue の close を確認してから閉じる。 |
| CD002 | ci-pipeline は追加成果物なしで skip する。 | `.github/workflows/ci.yaml` は pull_request と main push で `npm run test:all` を実行している。`package.json` の `test:all` は typecheck、lint、契約検査、integration、e2e mock、examples、diff check を含む。 | Issue #399 用に CI の新設または大きな変更を行わない。既存 CI と各 Bolt の検証記録を完了証拠に含める。 |
| CD003 | #401 配下の #391、#392、#393、#394 は #401 の完了証拠に内包し、Issue #399 の直接完了条件へ広げない。 | R003 と D004 で、#401 配下 Issue は #401 の扱い整理として追跡すると決めている。 | 親 Issue #399 は #391 から #394 の個別 close を待たず、#401 の完了証拠で判断できる。 |
| CD004 | 残り skill の実際の英語化は Issue #399 の完了条件に含めない。 | #402 は残り skill の英語化単位、優先順位、検証コマンド、衝突回避を決める Issue であり、実際の英語化完了は後続 Issue の責務である。 | #399 は段階的実施計画と子 Issue 完了追跡の完了で閉じる。 |
| CD005 | Construction phase PR を Issue #399 の完了 PR と兼用する。 | 全 Bolt が完了し、ci-pipeline は skip 判定済みである。追加の実装 PRを分ける理由がない。 | final PR は `Closes #399` を含め、merge 後に親 Issue と Intent を完了状態にする。 |

