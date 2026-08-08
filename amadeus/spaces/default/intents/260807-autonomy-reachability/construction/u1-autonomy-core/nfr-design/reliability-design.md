# Reliability Design — u1-autonomy-core

上流入力(consumes 全数): business-logic-model.md(フロー1 の原子性契約・エラー分類)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)— 信頼性の親は requirements.md NFR-1(fail-closed 維持)。

## 失敗様式と回復(フロー1: canonical 書込)

| 失敗点 | 挙動 | 回復 |
|---|---|---|
| audit commit 前の検証失敗 | fail-closed(既存) | 呼び出し前バイトのまま — 副作用なし |
| audit commit 失敗 | fail-closed、state 未書込 | 再実行(冪等 — transaction 未成立なので新規 commit) |
| audit 成立後の state 書込失敗 | loud error(BR-U1-3) | 再実行が projectionRevision 一致を検知し、transaction を重複発行せず state のみ書いて収束 |
| refusal emit 失敗 | fail-open 警告(BR-U1-6 — 唯一の fail-open) | 観測欠落のみ・認可は不変。次回 occurrence で再度 emit 機会 |

- failure injection: 上記4点それぞれをテストで固定(audit-batch-before-state-atomicity の要求)。ENOENT 注入は不在パス、ディレクトリ注入は dangling symlink(bun-readfilesync-dir-platform-divergence)
- Git 管理資産の復元は Git 履歴で行い、埋め込み fallback を持たない(cid:nfr-design:c3)

## 6読み手の一貫性(FR-2d)

書込1箇所化により「audit と state の乖離」という現行の恒常故障(finding 5)を構造的に除去 — 過渡状態は「audit 先行・state 追従」の1方向のみで、再実行収束が保証する。
