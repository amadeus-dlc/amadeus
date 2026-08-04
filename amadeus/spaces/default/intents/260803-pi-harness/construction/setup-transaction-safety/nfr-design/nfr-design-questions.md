# Setup Transaction Safety — NFR Design Questions

## 回答方針

エンジンがこの Unit で解決した入力は `business-logic-model` のみである。条件付きの `security-requirements` と `tech-stack-decisions` は期待どおり非適用であり、再作成しない。IssueやFunctional Designの決定を再質問せず、local filesystem transactionのsecurity / component境界だけを確定する。

## Questions and Answers

### Q1. setup lockで一般のeditorや外部processも排他できると仮定するか

[Answer]: 仮定しない。lockは協調するsetup processのadmissionだけを排他する。非協調writerとの競合はcapture-first atomic rename、捕捉後検証、install/restore no-clobber、captured inodeの永続backup保持でデータを失わない。content digest CASをfilesystemが提供すると仮定しない。

### Q2. transaction journalやbackupに利用者file内容を保存してよいか

[Answer]: journal/auditには保存しない。journalはtarget-relative path、ordinal、digest、size、mode、state、opaque identityだけを持つ。rollback/commitに必要なoriginal bytesは、targetと同一filesystemだがcanonical working tree外のowner-only private installer rootにあるquarantineまたはcommitted backup inodeとして保持する。Git administrative rootまたはtarget parentのprivate sibling rootを使い、安全なworking-tree外rootを確保できなければcapture前にfail-closedする。diagnosticへ本文、private rootのpath、credentialを出さない。

### Q3. stale lockをPIDだけで回収してよいか

[Answer]: だめ。owner nonce、host identity、PID、lock file identityを照合し、same-hostでprocess不存在を確実に確認できる場合だけ回収する。host/permission/process stateが不明なら `transaction-busy` でfail-closedする。PID再利用時はnonce/lock identity不一致として回収しない。

### Q4. rollbackやrecoveryで未知contentを自動削除・上書きしてよいか

[Answer]: しない。known before/after/stage/quarantine digestとidentityに一致するstateだけを有限状態機械で処理する。未知content、複数journal、不明orphan、restore先occupiedはrecovery artifactを保持してblockedにし、read-only remediationを返す。

### Q5. Cloud/AWS infrastructureを追加するか

[Answer]: 追加しない。Bun/TypeScriptの短命CLIとlocal filesystem portだけで実装する。database、remote lock、queue、AWS resource、常駐daemonは不要である。

## 曖昧性分析

- material ambiguityはない。
- captured inodeを成功後も永続backupへ保持するのは非協調open-FD writerからbytesを失わないための必須契約であり、best-effort cleanup対象にしない。
- setup transactionはPi専用payloadを理解せず、全harness共通のtransaction safetyとして実装する。
- performance/scalability/reliability専用artifactはエンジンがpruneしており、本Unitでは生成しない。
