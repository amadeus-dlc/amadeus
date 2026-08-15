# TLA+ Authoring — 適用性評価

入力は [requirements](../../inception/requirements-analysis/requirements.md)。経路は **not-applicable**(終端)。author-new / revise-model には進まない。

## 検査した識別子

FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, NFR-1。

## 判定

「並行または再開可能なアクターが状態を共有し、無音の安全性違反が残りうる」subject に該当する識別子はない。

- FR-1(subprocess stdout の完全読み取りリトライ)/ FR-2(spawn error の fail-closed 検査)は単一呼び出し内の読み取り・正規化ロジックで、共有状態機械を導入しない。安全性は fail-closed throw として loud であり、無音違反クラスではない
- FR-4(pi driver の settle 済み child の timeout 除外)は単一プロセス内の Promise.race 分岐是正で、登録済み 4 モデル(BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate)のいずれの reachable behaviour にも触れない(変更ファイル `amadeus-pi-driver.ts` は model-map.json の implPath に不在 — code-generation で実測済み)。決定的なタイミングシームのテスト2系(settle 後遅延 close / 真のハング)で両分岐を固定済み
- FR-3 / FR-5 / FR-6 はテスト基盤の変更で、プロトコル spec の変更を含まない
- team.md の二層検証態勢どおり、形式検証の追加は「並行プロトコルの spec 変更時のみ」であり本 intent は非該当。なお登録 4 モデルの TLC 完全探索は本 intent の advisory 対応で全件 NOT_DETECTED を実測済み(runs 65ea5489 / ac2f2a6e / 934e0c98 / 68284060、2026-08-15)

## この判定を覆す条件

pi driver の guardian/child 間プロトコルに複数プロセス間の共有状態不変量(例: 多重 dispatch の相互排除)を導入する変更が要求された場合、その識別子を選定して author-new へ進む。
