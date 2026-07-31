# Code Summary — fix-1742-sensor-scope

上流入力(consumes 全数): requirements.md(当該 FR の充足対照)。functional-design 系は self-fix の SKIP により設計どおり不在。

## 結果
- PR: https://github.com/amadeus-dlc/amadeus/pull/1758 — **マージ済み**(ユーザー承認)、#1742 クローズ。着地 grep: amadeus-sensor-invocation.ts 実在+hook の invocation 参照 8 件。
- 受入条件との突き合わせ: t94/t95 の期待値更新・recursion/pre-init guard 非回帰・linter/type-check 対象維持は PR 本体の CI(17 pass)で担保。収束時実測: CLEAN・未解決スレッド 0。
