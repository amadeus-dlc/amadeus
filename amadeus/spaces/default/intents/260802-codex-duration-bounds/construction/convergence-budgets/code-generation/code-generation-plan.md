# Code Generation Plan — convergence-budgets

## 入力とトレーサビリティ

本計画は `unit-of-work.md` の Unit 2、`unit-of-work-story-map.md` の S3・S4、`requirements.md` の FR-02・FR-03・FR-04A・FR-06〜08、同Unitの `functional-design`、`nfr-requirements`、`nfr-design` を入力とする。対象Issueは [#1998](https://github.com/amadeus-dlc/amadeus/issues/1998)。Test StrategyはComprehensiveである。

## 実施計画

- [x] **Step 1 — 共有Convergence Policyを実装する**: 6種類のcounter、default／hard cap、versioned retry allowlist、closed termination reasonをpure decisionとして定義する。FR-02、FR-03へ対応。
- [x] **Step 2 — C2 atomic reserveを拡張する**: policy snapshot、counter、reservation、exhaustionをcanonical auditへ原子的に永続化し、同一idempotency keyを二重消費しない。FR-02、FR-04Aへ対応。
- [x] **Step 3 — Stop continuationを耐久予算へ接続する**: interactive=2、autonomous／gated=8、absolute=10とし、audit noise、resume、stage pivot、parked境界を決定的に扱う。S3、AC-02へ対応。
- [x] **Step 4 — recoverable retryを共有判定へ接続する**: default=2、absolute=3、v1 exact 4-row allowlistとし、非許可／unknown effectを予算非消費のtyped refusalへ落とす。S4、AC-03へ対応。
- [x] **Step 5 — swarm retry authorityを有限化する**: convergence check失敗だけで再spawnせず、共有policyが `continue` を返した場合だけ既存retry経路を進める。FR-03へ対応。
- [x] **Step 6 — partial finalize recoveryを実装する**: state／audit／runtime metadata mergeの部分成功後、正規証拠が一意一致する場合だけ再開し、重複・不一致・tamperはfail-closedにする。回復可能エラーでworkflowを停止し続けない要件へ対応。
- [x] **Step 7 — harness手順を同期する**: Codex専用gateを設けず、Claude、Codex、Cursor、Kiro、Kiro IDE、OpenCode、Kimiへ同じcore semanticsと有限retry authorityを生成する。FR-06、FR-07へ対応。
- [x] **Step 8 — unit／integration testを作成する**: cap-1／cap／cap+1、audit noise、process restart、policy mismatch、allowlist matrix、sticky refusal、partial metadata recoveryを検証する。Comprehensive strategyへ対応。
- [x] **Step 9 — package／self-install生成物を同期する**: 正本から7 harness packageと影響するself-install面を生成し、直接編集を行わない。FR-06へ対応。
- [x] **Step 10 — convergence gateを実行する**: lint、typecheck、full test、package、promote、coverage、complexity、diff checkを実行し、refereeでは60秒以内の対象test＋typecheckを再検証する。全受入条件へ対応。

## 非該当

question／follow-up／review adapterへの配線はUnit 3、FIFO queue／active slot／dependency-aware continuationはUnit 4の所有である。approval、GitHub mutation、release／publish、任意toolを新しい自動retry対象へ追加しない。API endpoint、database、UI、deployment artifact、新規dependencyは追加しない。
