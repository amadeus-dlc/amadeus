# Integration Test Instructions — 260731-perf-ci-separation

上流入力(consumes 全数): code-generation-plan.md(U1〜U4 の実行計画 — 検証項目の出所)、code-summary.md(U1〜U4 の実装・検証実測 — 本書の対照元。いずれも construction/<unit>/code-generation/ 配下の4面)。

## 対象(本 intent が変更した integration 面)

- 分割残置4ファイル(t257/t258/t259/t292 の機能部分 — U1 code-summary.md の移設表)
- t222-ci-snapshot-branch(ci-success needs 8項の構造化 assert 新設 — U3 code-summary.md)
- t-formal-verif-ci-workflow(baseline 再生成)

## 実行と実測

`--ci` プロファイルに包含(上記 716 files green に含まれる)。CI 側: 4 PR 全て CI Success green + merge 後 main run 30665853396 success(head 150634197)
