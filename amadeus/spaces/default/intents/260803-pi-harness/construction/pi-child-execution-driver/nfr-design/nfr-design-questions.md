# Pi Child Execution Driver — NFR Design Questions

## 回答方針

エンジンがこの Unit で解決した入力は `business-logic-model` のみである。条件解決により不在の `security-requirements` と `tech-stack-decisions` は非適用であり、再作成しない。以下は Functional Design の既決 contract を security / component designへ落とすための確認であり、Issueや上流の決定を再質問しない。

## Questions and Answers

### Q1. Child Pi processをsecurity sandboxとして扱うか

[Answer]: 扱わない。childはparentと同じOS user、workspace、provider環境で動く信頼済み実行主体である。専用process groupはlifecycle containmentであって権限sandboxではない。強い隔離が必要な利用者はOS/container境界を外側に置く。

### Q2. Provider credentialをchildへどう渡すか

[Answer]: Piが通常使用するprocess environmentへ委譲する。driverはcredential値をparse、copy、hash、persist、auditしない。argv、guardian manifest、RPC correlation fieldへsecretを置かず、stderr/audit/emergency diagnosticはbounded redactorを通す。

### Q3. Pending terminalの成功outputをrestart後にどう保護するか

[Answer]: audit terminal factはoutput digestだけを持ち、replay用raw resultはmachine-local private vaultへAEAD暗号化して分離保存する。鍵はrepository外の0600 machine-local file、recordごとの鍵はHKDF、cipherはAES-256-GCM、AADはschema/key/result digestで束縛する。鍵欠落・認証失敗は`replay-payload-unavailable`でfail-closedする。

### Q4. Guardianとmanifestの改ざんをどう防ぐか

[Answer]: owner-only runtime directory、regular-file / no-follow検査、0600 temporary write、fsync、same-directory atomic rename、CSPRNG nonce、PID/PGID/nonceのcontrol-pipe照合を必須にする。さらにguardianがephemeral signing keyを作り、public keyをaccepted handleへGO前に永続化する。guardianはprocess-group leaderとしてgroup extinctionまで生存し、driver/recoveryはchallenge-responseで同じguardianを認証したowner-only control socket経由でだけsignalを依頼する。GOはacceptance commit後に一度だけ送る。PID/PGIDだけではsignalせず、identityを証明できないstale recoveryはfail-closedする。

### Q5. Cloud/AWS componentは必要か

[Answer]: 不要。追加componentはすべてBun/TypeScriptの短命local processまたはfilesystem portであり、network service、database、queue、AWS resource、常駐daemonは作らない。

## 曖昧性分析

- material ambiguityはない。
- secretをchildから隠す要件と、provider/authをchildへ委譲する機能要件を混同しない。保証するのは永続化・診断・argvへの漏洩防止であり、同一user processからの完全隔離ではない。
- performance/scalability/reliability artifactはエンジンがpruneしており、本Unitでは生成しない。
