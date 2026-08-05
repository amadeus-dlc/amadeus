# Functional Design Questions — autonomy-review-observability

## 上流入力

`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`を照合した。

## 確認結果

初稿レビューで、completed Intentのsealへ`HUMAN_TURN`を追加できない一方、reviewには新しいreal human turnが必要という上流契約の抜けが判明した。

人間選択は「active Intent参照」で確定した。completed reviewでは現在のactive Intentへreal `HUMAN_TURN`をcanonical commitし、completed target / decision / choice / command occurrenceへ束縛したreceiptをtargetの`AUTO_DECISION_REVIEWED`から参照する。completed sealのappend例外は広げない。

fresh reviewでsource auditの信頼境界が未決と判明し、人間選択は「M07直接read」で確定した。callerはaudit配列、commit receipt、lifecycleを渡さず、M07自身がcanonical storeからactive source、real human turn、commit receiptを取得・再検証する。

次のreviewer上限で主体生成元が未決と判明し、人間選択は「人間principal兼actor」で確定した。review principal / actorはreal human principalの同一safe referenceとし、decision eventにsafe主体fieldがなければdecision principal / actorはnull / withheldとする。

上記以外に人間へ追加確認すべきIssue外の矛盾・抜け漏れはない。

- active / completed Intentのdecision list / detailを明示target Intentで取得する。
- queue対象はsolo election / agent recommendationの`unreviewed`だけとし、policy / norm / history / gate decisionは履歴表示だけにする。
- `accept / flag`はreal `HUMAN_TURN`を必須とし、`AUTO_DECISION_REVIEWED`をcanonical auditへ記録する。
- completed Intentではこのeventだけをprotected post-seal appendとして許可し、過去event、成果物、workflow lifecycle、completion sealを変更しない。
- `flag`はrollbackせず、既存contract不備なら`self-fix`、仕様追加・変更なら`self-feature`を提案するだけで、新Intentを自動作成しない。
- raw credential / evidence / host payloadは表示・保存せず、redacted valueまたはsafe digestだけを使う。

## Optional artifact判断

`frontend-components.md`は生成しない。U4のsurfaceは既存CLI status / replay / read commandとmachine-readable projectionであり、新規frontend componentを含まない。
