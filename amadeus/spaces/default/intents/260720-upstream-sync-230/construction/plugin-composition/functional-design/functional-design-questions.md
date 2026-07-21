# Functional Design Questions — plugin-composition

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> E-OC1裁定: Aで進行可。裁定TS=`2026-07-20T14:22:47Z`。

## 既決事項

- public seamは`unit-of-work.md`の`inspectPlugin`、`planPluginComposition`、`applyPluginPlan`、`planPluginDrop`、`applyPluginDrop`、`diagnosePlugins`の6関数である。
- `discoverPlugins(sourceRoot, io)`はC4内部helperで、public seamではない。全signatureは`component-methods.md`へ完全一致させる。
- inspectはsame-name stage、malformed manifest、unknown seam、clobberを全数収集し、書込前に`ready | rejected`を返す。
- composeはno-clobber copy、宣言seam merge、宣言fragment spliceを計画し、temp treeでC1/C2 compile・sensorを通した後だけatomic commitする。
- dropはcomposition recordが所有するpathだけを対象にし、temp treeでcompile/doctor後だけatomic commitする。
- 失敗時はhost bytes、composition record、auditをすべて不変にする。
- U11はreference plugin/guide、U12は全体evidence/ledger集約を担う。

[Answer]: A。leaderのE-OC1裁定（`2026-07-20T14:22:47Z`）により、6 public seamと`discoverPlugins`内部helperの責務分離で進める。新たな正本矛盾、ownership、failure policy、atomicity意味論の未決を検出した場合は停止し、再付議する。

## Q1: shared fileのplugin寄与をどう所有しdropするか

[Answer]: A。E-USSU10FD1で3–0採用、GoA favor 3、裁定通知`2026-07-20T14:31:32Z`。`PluginRecord`へbase/precondition、plugin自身のcanonical contribution、適用順、期待post-stateを記録し、shared file全体の所有は禁止する。dropはcurrent一致を全mutation前に検証し、対象寄与を除いた残存寄与を決定的に再構築する。user edit、unknown drift、寄与identity不一致はhost/record/audit三面不変でloud rejectする。根拠: `leader/amadeus/spaces/default/elections/E-USSU10FD1/record.md`、同期元commit `69f2c06b8`。

## Q2: host/record/audit三面をcommit途中・crash時もどう原子的に扱うか

[Answer]: A。E-USSU10FD2で3–0採用、GoA favor 3、裁定通知`2026-07-20T14:31:32Z`。workspace lock下のdurable write-ahead journalへtransaction id、phase、三面の全write-set/preimageを記録し、最初のcanonical mutation前に`PREPARED`をdurable化する。三面完了後だけ`COMMITTED`へ進み、handled failureは即時pre-state復元、crashは次操作前に同じlock下で冪等回復する。未回復中の新規操作は禁止し、drift/corruptionは追加mutationなしでloud停止する。根拠: `leader/amadeus/spaces/default/elections/E-USSU10FD2/record.md`、同期元commit `69f2c06b8`。

## Ambiguity analysis

- 曖昧回答: なし。
- 回答間の矛盾: E-OC1裁定AとE-USSU10FD1/2裁定Aで解消済み。
- 必要情報の欠落: なし。
- 承認範囲外の具体化: 追加しない。
