# NFR Design Questions — mirror-contract-policy

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を照合した。三層config、closed union、pure policy、versioned event identity、completion chainの境界は確定済みであり、追加の製品判断は不要である。

## 確定済み回答

### Q1. cache、queue、常駐workerを導入するか

[Answer]: 導入しない。configはboundaryごとに最大3層をreadし、C2は受け取ったvalidated snapshotだけを同期評価する。永続cacheやbackground retryはstale mode、cross-Intent混同、NFR-5のboundary-driven実行違反を生む。

### Q2. security boundaryをどこに置くか

[Answer]: filesystemとworkspace selectorはC1 adapterへ閉じ、C1 parserとC2 policyはplain immutable valueだけを受け取る。C2から`node:fs`、process環境、GitHub adapterをimportしない。pathとraw valueを含むdiagnosticはsecret-free allowlistへ投影する。

### Q3. failure時のdegradationは何か

[Answer]: config read／parse failureは全issueを返してoperation 0件とする。unknown unionはfail-fastする。GitHub障害は本Unitでretryせず、typed decision／contextをC7へ返し、後続Gateway／State／Lifecycleの非阻害warning契約へ委譲する。

### Q4. scale上限を超えた場合にparallel化するか

[Answer]: しない。3 config層、closed operation／boundary集合、current completion instance内receiptだけを対象とする。契約拡張時はunion、fixture、decision table、docsを同一変更で更新する。

## 曖昧性分析

- 「高速」「安全」ではなく、上流の時間、I/O回数、集合上限、fail-closed条件を設計へ割り当てた。
- C2のpure boundaryとC6の安全guardを混同していない。
- local libraryにservice availability、AWS resource、cache、circuit breakerを追加していない。
- manual operationのmode非依存と、全operationに対するdownstream safety guardを両立させた。
