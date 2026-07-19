# Logical Components — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 論理構成(変更後)

| 層 | コンポーネント | NFR 担当 |
| --- | --- | --- |
| model(純関数層) | Ballot.parse(6分類)/ resolveBallots / classifyLate(不変) | P-1/P-2、S-1(形式)、R-4 |
| store(I/O 層) | appendBallot(dup→unknown-ref→書込)/ writeStoreFile(不変) | S-1(実在)、S-3、R-1 |
| cli(境界層) | handleVote(エラー表示)/ handleVerify・handleRender(resolved 消費)| R-2、BR-4 適用点 #2/#3/#5 |
| transport(不変) | normalizeAt(恒等コメントのみ) | — |

## 構造保証の層別記述(nfr-design:c4 — 一枚岩の断定を避ける)

- model 層: ledger・FS への参照を持たない(ポート不保持)— 純関数性は import 構造で保証。
- store 層: 書込は writeStoreFile 単一 funnel(呼び出し順序契約 — 照合は書込前)。
- cli 層: resolveBallots の適用は handleVerify/handleRender の導出1行に集約(限定ポート)— 適用漏れは FR-4 テストが検出。
