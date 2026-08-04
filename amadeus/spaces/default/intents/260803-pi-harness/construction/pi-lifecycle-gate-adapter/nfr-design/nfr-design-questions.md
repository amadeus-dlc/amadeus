# Pi Lifecycle / Gate Adapter — NFR Design Questions

## 回答方針

エンジンがこの Unit で解決した入力は `business-logic-model` のみである。条件付きの `security-requirements` と `tech-stack-decisions` は期待どおり非適用であり、再作成しない。以下は承認済みFunctional Designをsecurity / logical componentへ落とすための設計判断であり、Issueに記載済みの機能を再質問しない。

## Questions and Answers

### Q1. `input.source=interactive` 以外のhuman provenance検証を追加するか

[Answer]: 追加しない。Pi 0.83.0以上の公開Extension APIがcallbackへ渡すclosed source enumをnative provenanceとし、exact `interactive`だけをhuman presence候補にする。`rpc`、`extension`、欠落、unknown、型不正はHUMAN_TURNをmintしない。本文、TTY、送信時刻、呼出元stackからhumanを推測しない。この境界はcaptured 0.83 fixtureで固定し、adapter自身のevent injection APIは公開しない。

### Q2. prompt、image、tool args/resultをjournalとauditへどう保存するか

[Answer]: auditとjournal metadataにはversioned event key、digest、relative workspace path、状態、receiptだけを置く。再開にraw payloadが必要な場合だけmachine-local private vaultへAES-256-GCMで暗号化し、repository外またはgitignore済みruntime rootのowner-only fileへ保存する。鍵欠落、AEAD不一致、symlink、owner不一致ではfail-closedし、digestから内容を復元・捏造しない。

### Q3. partial registrationやmandatory handler failureから自動復旧してよいか

[Answer]: partial registrationは有効化しない。全handler/commandの登録後にmodule-local `RegistrationGate`を一度だけopenする。最初のmandatory failureはdurable `ExtensionHealthLatch`をblockedへ遷移させ、同一session/epochのjournal、core receipt、outboxをsession start時に正常reconcileできた場合だけhealthyへ戻す。read-only status/doctor以外の自動縮退や「警告だけで継続」は行わない。

### Q4. continuation / mission recovery messageを権限tokenとして扱うか

[Answer]: 扱わない。CSPRNG delivery tokenは同一sessionへのmessage appendと、そのmessageを原因とするnative `agent_start`を対応付けるopaque correlation値にすぎない。stage routing、gate approval、human presenceを許可せず、coreがfresh stateから決めたdirective/missionだけを運ぶ。auditにはtoken digest、session binding、directive/mission digest、`entry-appended | turn-observed` receiptを置き、本文や絶対pathを置かない。entryが存在してもturn receiptがなければdelivered扱いにせず、自動再送もしない。

### Q5. Cloud/AWS infrastructureを追加するか

[Answer]: 追加しない。adapter、journal、vault、outbox、health latchはすべてBun/TypeScriptのlocal moduleとmachine-local filesystem portである。network service、database、remote queue、AWS resource、常駐daemonは必要ない。

## 曖昧性分析

- material ambiguityはない。
- Pi extensionは同一OS userで実行されるためsecurity sandboxではない。同一userがruntime自体を改ざんする攻撃は境界外だが、通常のRPC/extension入力、malformed event、replay、crash、filesystem tamperは境界内でfail-closedにする。
- lifecycle semantics、gate判定、sensor applicabilityはcoreが正本であり、adapterに複製しない。
- performance/scalability/reliability専用artifactはエンジンがpruneしており、本Unitでは生成しない。
