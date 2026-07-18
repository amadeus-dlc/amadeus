# Application Design — Questions(260717-state-mirror-fixes)

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

モード: チームモード — エージェント間選挙(election-protocol)

## E-OC1 証跡

質問 2 問(上流が明示的に設計へ委任した未決判断のみ)。選挙不要判定(3段): 申告 23:41:40Z 頃(E-SMF-AD 選挙依頼に同梱、1問1行)→ **leader 承認 2026-07-17T23:43:55Z(agmsg)** → 本記載。判定内容: 後退判定述語(対象 stage の現 checkbox ∈ {[x], [?]} → 後退)= FR-1a の両条件から機械導出(set-status は Current Stage と checkbox を同一 stage に書くため単一述語で被覆)/ checkbox 読取ヘルパーの in-process seam 化 = NFR-4(T4)から導出 / 検証コマンド列・dist 同期 = NFR-2・制約節の既決。

## Q1. 後退ガードの設置位置(requirements Open Question 1 の確定)

FR-1d の順序要件(lock→read→compare→write、withAuditLock 参加)を満たすガードをどこに置くか。

A. **handleSetStatus 内**(amadeus-utility.ts)— 本体を withAuditLock でラップし、ロック内で再 read→比較→write/no-op。withAuditLock は amadeus-utility.ts へ import 済み(:91 実測)。setCheckbox(amadeus-lib.ts:3785)は純変換のまま不変 = エンジン経路(FR-1e)に構造的に波及しない
B. **setCheckbox 側**(amadeus-lib.ts)— 共有純変換関数に後退拒否モードを追加。エンジンの正当な後退遷移(reject の [R] 化等)まで影響しうる(FR-1e 違反リスク)+呼び出し元全数の挙動再検証が必要
C. **両方** — 二重ガード。責務重複と検証面の倍加
X. Other (please specify)

[Answer]: A(E-SMF-AD 開票 2026-07-17T23:45:12Z 通知、3/3 全票 GoA 1・留保 0。共通根拠: setCheckbox は共有純変換でエンジン正当後退(reject/revise 等、呼び出し10〜17箇所実測)を巻き込む B は不利、ガードは欠陥書き手に局所化が surgical)

## Q2. FR-3(mirror-issue-tool record の state 修復)の実施単位(R4 の確定)

A. **実装 PR と別の record チェックポイントコミット** — 工程記録(amadeus/ ツリー)はチェックポイントコミットで本線へ流し実装 PR を肥大化させない(team.md Way of Working 既決)に整合。修復は audit シャード実測値からの転記で、コード変更と独立に検証可能
B. **実装 PR へ同梱** — 着地が単一で、修復後 state での 18/18 実測(A-3)を同 PR の検証エビデンスにできる。ただし record 差分が PR レビュー面を肥大させ、レビュー観点も混在する
X. Other (please specify)

[Answer]: A(E-SMF-AD 開票 2026-07-17T23:45:12Z 通知、3/3 全票 GoA 1・留保 0。工程記録 checkpoint 既決に整合、実装 PR 非同梱)
