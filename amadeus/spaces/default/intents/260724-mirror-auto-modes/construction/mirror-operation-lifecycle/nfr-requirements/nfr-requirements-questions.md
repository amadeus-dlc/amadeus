# NFR Requirements Questions — mirror-operation-lifecycle

## 判定

`business-logic-model.md`と`business-rules.md`はboundary、prompt、operation順序、retry identity、failure mapping、audit、repairを確定している。`requirements.md`のNFR-1〜5と`technology-stack.md`の既存runtime seamから測定可能なNFRを導出できるため、追加質問はない。

## 確定済み回答

### Q1. GitHub failureでworkflowを停止するか

[Answer]: 停止しない。全Mirror結果を`workflowMayAdvance=true`へ写像し、pending／warning／safety-blockedとして追跡する。

### Q2. completionで何回まで自動実行するか

[Answer]: create→final sync→closeの最大3 operationを成功時だけ直列実行する。他boundaryとmanualは1 operationで終了する。

## 曖昧性分析

- Mirror非阻害と安全guard非阻害を混同せず、unsafe mutationはfail closedする。
- prompt承認は再policy評価せず保存済みbindingからexecuteへ進む。
- retryはbackgroundでなくeligible boundary／manualだけで行う。
