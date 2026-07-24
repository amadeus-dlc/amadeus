# NFR Design Questions — mirror-operation-lifecycle

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`で同期・非阻害・最大3 operation・CAS winner・prompt bindingが確定済みである。

## 確定済み回答

### Q1. background retryを行うか
[Answer]: 行わない。eligible boundaryまたはmanualだけで再評価する。

### Q2. completionを並行化するか
[Answer]: しない。create→final sync→closeをsuccess時だけ最大3回直列実行する。

### Q3. failureでworkflowを止めるか
[Answer]: 止めない。全結果を`workflowMayAdvance=true`へ包み、remote safetyだけをfail closedする。

## 曖昧性分析

prompt待ちでlock／processを保持せず、manualもsafe guardを緩和しない。
