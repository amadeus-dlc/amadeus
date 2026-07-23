# サービス設計 — archived intent lifecycle

上流入力: `requirements`、brownfield `architecture` / `component-inventory`、`team-practices`。

## 配置判断

本変更はローカルCLI内の同期ファイル操作であり、ネットワークサービス、AWS resource、UI componentを追加しない。AWS PlatformおよびUX観点はN/Aで、根拠は外部runtime、画面、永続service、スケーリング要求が存在しないためである。

## Orchestration

Lifecycle Commandが同期orchestrationを所有する。

1. `withIntentLifecyclePreflight`がworkspace lock取得
2. lock内で未完了journal recovery
3. 対象statusとhuman-presence検証
4. journal作成
5. lifecycle audit commit
6. registry commit
7. archive時のみcursor clear
8. journal完了

各stepはoperationIdで相関する。イベント駆動choreographyは採用しない。単一process・単一workspace lockの既存モデルに対して不要な非同期性を導入するためである。

Intent Selector、Workflow Router、unpark、Audit Boundaryも同じpreflightへ入り、recovery後のcallback内でのみregistry/cursor/auditを読む。lockは非再入とし、callbackが呼ぶhelperは`LockedLifecycleContext`を受け取るlock内版に限定する。

## Lifecycle event

`INTENT_ARCHIVED`と`INTENT_UNARCHIVED`はarchived sealの明示例外とする。通常eventはstatusが`archived`または`complete`なら拒否する。lifecycle event payloadはIntent、From Status、To Status、Operation ID、User Input、Human Turn Timestampを必須とする。

## Utility delegation

utilityの公開形は`intent archive <selector>` / `intent unarchive <selector>`とする。utilityはpreflight lock内でselectorをdirNameへ解決したらlockを解放し、その後`bun .../amadeus-state.ts archive|unarchive <dirName> --project-dir <path>`へ委譲する。state subprocessは新しいpreflight lockを取得し、dirNameの存在・status・journalを再検証してから変更する。utility解決結果を権限証明として信用しないためTOCTOUは安全側の拒否になる。stdout/stderrとexit codeは変更せず返す。

## Migration service

移行はruntimeの通常起動時に暗黙実行せず、既存workspace migrationの明示ステップで1回実行する。対象行の一意照合、全registry validation、他行不変を確認してからatomic writeし、core修正後に6 harness配布物を再生成する。

## HUMAN_TURN consumption

未消費判定はlifecycle verb内だけでなくpresence-protected verb横断とする。候補HUMAN_TURNは、同じshardにある最新のresolution event（`QUESTION_ANSWERED`、`GATE_APPROVED`、`GATE_REJECTED`、委任/standing-grantの発行・取消、`INTENT_ARCHIVED`、`INTENT_UNARCHIVED`）より後の最新行でなければならない。journal reservation後のrecoveryは同じ`{shard,timestamp}`をoperationIdで再利用し、新しいturnへ差し替えない。
