# Business Rules — unit presence-closure(U6 / C13 / FR-12 / D7・D8)

## R-1(D7): `approve-batch` は presence 未検証時に必ず拒否する

`verifyBatchApprovalPresence(projectDir)` が presence なし(このセッションの監査シャードに直近解決以降の `HUMAN_TURN`/検証済み委任がない)と判定した場合、`handleApproveBatch` は state を一切編集せず、`GATE_APPROVED` を一切発行せず、非0 exit で拒否する。
- **トレース**: FR-12「`approve-batch` の presence 無検証…を塞ぐ」、ADR-11、component-methods.md C13「未消費 HUMAN_TURN を要求。欠くと approve-batch は state 編集・GATE_APPROVED 放出の前に refuse」。
- **落ちる実証**: presence なしの fixture(監査シャードに直近ゲート解決以降の `HUMAN_TURN` がない状態)で `handleApproveBatch` を呼び、現状では成功して `state_updated: true` を返す(Red)ことを実測し、是正後は拒否・`state_updated` に到達しないことを pin。

## R-2(D7): presence 検証は `withAuditLock` の内側・状態読取と冪等判定より先に行う

presence 検証(`verifyBatchApprovalPresence`)は `withAuditLock` の**内側**、コールバックの最初の操作として実行し、既存の状態読取・冪等ショートカット(既承認バッチの no-op 応答)・RMW・`GATE_APPROVED` emit のいずれよりも前段に置く。presence 検証をロック取得より前(ロックの外側)で行ってはならない。presence なしの呼出しは、対象バッチが既承認かどうかに関わらず一律拒否する。
- **トレース**: `amadeus-bolt.ts:1213` の既存契約(検証を発行より先に行う)の presence への拡張、`amadeus-bolt.ts:1216-1219`「read->decide->emit->write section runs under withAuditLock」という既存のロック区間設計への合流、functional-design-questions.md Q2(TOCTOU 排除根拠)。
- **落ちる実証**: 既承認バッチに対して presence なしで再呼出しした場合でも拒否されることを pin(「冪等だから許される」という抜け道がないことの反証)。加えて、presence 検証が `withAuditLock` の外側で行われていないこと(ロック取得前に単独で完了する経路が存在しないこと)を実装のコードパスから確認する — presence の read->decide と state の RMW が同一のロック獲得・解放の間に収まることの構造的検査。

## R-3(D8): ledger-absent は scope に関わらず一律 fail-closed

`resolveGatePresence` は `scanPresenceLedger` が `null`(ledger 不在・全シャード空)を返したとき、呼出しが active/legacy スコープか named record スコープかによらず `{ present: false, reason: "ledger-absent" }` を返す。現行の `intent === undefined` によるスコープ分岐(fail-open/fail-closed の使い分け)は廃止する。
- **トレース**: FR-12「ゲート presence 検査の active-scope fail-open を塞ぐ」、D8、component-methods.md C13。
- **落ちる実証**: 監査ディレクトリが存在しない(または空)フレッシュな fixture に対し、active/legacy スコープ(`intent` 省略)で `humanActedSinceGate` を呼び、現状は `true` を返す(Red、素通り)ことを実測し、是正後は `false` を返すことを pin。

## R-4(D8): 既存の正当経路は無退行

実 `HUMAN_TURN`(または検証済み委任)がシャードに存在し、直近のゲート解決より後に位置する場合、`resolveGatePresence`/`humanActedSinceGate` は引き続き `present: true` を返す。R-3 の是正はこの経路の判定結果を変えない。
- **トレース**: component-methods.md C13「既存の正当経路(実 HUMAN_TURN あり)の無退行テストを対で置く」。
- **落ちる実証**: R-3 の Red/Green ペアと対になる Green fixture(シャードに直近ゲート解決以降の `HUMAN_TURN` を実在させる)で、是正前後どちらでも `present: true` のまま変化しないことを pin。

## R-5: `humanActedSinceGate` の公開シグネチャは不変

`humanActedSinceGate(pd, verb?, intent?, space?): boolean` の型・引数は変更しない。D8 の是正は関数内部の ledger-absent 分岐のみに閉じ、`amadeus-state.ts` 側の 3 呼出し元(:3731 `assertHumanPresentForGateResolution` / :4581 `handleDelegateApproval` / :4670 `handleDelegateRejection`)はコード変更なしに新しい fail-closed 判定を継承する。
- **トレース**: unit-of-work.md owned files(`amadeus-bolt.ts` + `amadeus-lib.ts` のみ、`amadeus-state.ts` を含まない)、functional-design-questions.md Q4。
- **落ちる実証**: `amadeus-state.ts` の当該3関数の呼出しコード(`humanActedSinceGate(...)` の呼び出し式そのもの)が本 unit の変更前後でバイト同一であることを diff で確認する(型シグネチャ不変の直接証明)。

## R-6: presence 検証の判定述語は verb-less 一般形を再利用する

`verifyBatchApprovalPresence` は `humanActedSinceGate(pd)` の verb 省略形(直近の任意の解決以降の任意の人間行為を問う一般述語)を用いる。`approve-batch` 専用の新しい判定ロジックを別途実装しない。
- **トレース**: functional-design-questions.md Q1、project.md「意図ベースの重複排除」。
- **落ちる実証**: `verifyBatchApprovalPresence` の実装が `humanActedSinceGate` を呼んでいること(独自の `scanPresenceLedger` 直接呼出しや別述語を持たないこと)をコードレビューで確認する。

## R-7: presence 拒否は監査へ痕跡を残さない

presence 検証の拒否そのものは新しい監査イベントを発行しない(既存の `error()` による標準エラー出力+非0 exit のみ)。バッチ状態・`Swarm Gated Batch Approvals` フィールド・`GATE_APPROVED` イベントのいずれも書き込まれない。
- **トレース**: R-1 の帰結、`amadeus-bolt.ts:1251-1252`「Audit-first…so an audit failure aborts before the ledger diverges」の既存設計思想(検証失敗はどの書込よりも手前で止める)の presence への適用。
- **落ちる実証**: presence 拒否後の監査シャード・state ファイルのバイト内容が呼出し前と不変であることをテストで確認する。
