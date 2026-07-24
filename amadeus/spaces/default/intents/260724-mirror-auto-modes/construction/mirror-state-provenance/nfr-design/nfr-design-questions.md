# NFR Design Questions — mirror-state-provenance

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`により、atomic commit、audit outbox、capacity、repair challenge、marker codecは確定済みである。

## 確定済み回答

### Q1. stateとauditをtwo-file transactionにするか
[Answer]: しない。business stateと完全なaudit outboxを同じstate commitへ含め、directory fsync後にidempotent audit appendし、失敗時は次operation前にdrainする。

### Q2. capacity超過時に古いactive dataを削除するか
[Answer]: しない。warningはcoalesce、challengeはexpiredをaudit proof付きpruneする。active data枯渇時はremote mutation前にfail closedする。

### Q3. CAS conflictを自動retryするか
[Answer]: しない。actual revision付きconflictを返し、callerが最新stateから判断をやり直す。

## 曖昧性分析

- rename前failure、rename後directory fsync failure、audit append failureを別outcomeにした。
- no-op、invalid、conflictではwrite 0件とした。
- repair、marker、state parserに上限とcanonical encodingを固定した。
