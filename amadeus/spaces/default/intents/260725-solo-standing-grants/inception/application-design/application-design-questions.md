# Application Design Questions

## Q1. routeからcommitへ選択済みGrant Idを運ぶ公開契約をどの形にしますか？

`gate`はgateの有無だけを表し続け、authorization carrierを別fieldにする。team modeの既存directiveを変更しないことを優先する。

- A. `run-stage.standing_grant_id?: string`と`report --standing-grant-id`を追加する（推奨。最小で明示的、fieldの存在自体がstanding-grant認可候補を表す）
- B. `run-stage.gate_authorization?: { kind: "standing-grant"; grant_id: string }`と対応するJSON report carrierを追加する（domain表現は強いがnested schemaとCLI transportが増える）
- C. human・delegation・grantを含む汎用`authorization_source` unionを全modeへ追加する（将来拡張性は高いがteam modeのdirective契約まで変更する）
- D. opaque authorization tokenを発行して運ぶ（改ざん耐性は表現できるが、同一process内の監査台帳再検証には過剰）
- E. Grant Idを運ばずcommit時に再探索する（route/commit相関を満たさない）
- X. Other (please specify)

[Answer]: A（E-1466-AD-Q1 user ruling 2026-07-25T05:38:50Z）— `run-stage.standing_grant_id?: string`と`report --standing-grant-id`を採用する。`gate`とteam modeのdirective出力は変更しない。（**Mode:** guided）

Architecture Review Iteration 1の指摘により、差替え防止用の相関field `standing_grant_route_id`を同じoptional carrierへ追加する。これはopaque authorization tokenではなく、protected route receiptのidentityであり、Grant Idを運ぶという選択Aの補強である。

## Q2. route後にgrantが失効・取消・対象外になった場合、reportは何を返しますか？

fallbackは通常の競合結果であり、`ERROR_LOGGED`、非zero終了、stderr文字列判定を使わず、stage body・reviewerを再実行させない必要がある。

- A. 新しい汎用`await-approval` directiveを返し、stageと理由だけを持たせる（推奨。既存gateを再提示するprompt-only契約で、standing grant専用gate値を作らない）
- B. `run-stage`へ`resume_at: "approval"`を追加して再発行する（directive種類は増えないが、stage実行directiveに部分再開の意味が混ざる）
- C. `done` directiveへ`approval_required: true`を追加する（terminal完了と未完了が同じkindになり意味が衝突する）
- D. state CLIの専用exit codeをreportが判定する（stderr文字列には依存しないが、process transportにdomain outcomeが漏れる）
- E. 通常の`error` directiveを返す（受け入れ条件に反する）
- X. Other (please specify)

[Answer]: A（E-1466-AD-Q2 user ruling 2026-07-25T05:42:49Z）— 汎用`await-approval` directiveを採用する。prompt-onlyで既存human gateを再提示し、stage body・reviewerを再実行しない。（**Mode:** guided）

## Q3. grant探索・gate適格性・exact-ID再検証の所有境界をどこに置きますか？

新しい永続modelや外部serviceを作らず、team modeのdelegation経路を変更しないことを前提とする。

- A. `amadeus-lib.ts`のaudit-derived grant domainへsolo選択とexact-ID照会を追加し、`orchestrate`はroute、`state`はlock内commitだけを所有する（推奨。既存責務を保つ最小の3境界）
- B. 新しい`standing-grant-service.ts`へ発行・探索・gate・commitを集約する（分離は明瞭だが単一featureのための大きなserviceとなり、state transactionを跨ぐ）
- C. team modeの`delegate-approval`をsoloでも呼び出す（コード量は減るがleader不在と`DELEGATED_APPROVAL`禁止に反する）
- D. grant選択と再検証をすべて`orchestrate`へ置く（routeは単純だがstate lock外でcommit判定するためTOCTOUを閉じない）
- E. grant snapshot全体をdirectiveへ運び、commitで監査台帳を読まない（失効・取消raceを検出できない）
- X. Other (please specify)

[Answer]: A（E-1466-AD-Q3 user ruling 2026-07-25T05:43:27Z）— `amadeus-lib.ts`がaudit-derived grant domain、`amadeus-orchestrate.ts`がroute、`amadeus-state.ts`がlock内commitを所有する。新serviceとdelegation再利用は行わない。（**Mode:** guided）
