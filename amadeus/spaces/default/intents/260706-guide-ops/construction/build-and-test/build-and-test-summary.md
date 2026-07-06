# Build and Test Summary

Unit: guide-ops（Test Strategy: Minimal、refactor scope = docs 系）

## 要約

Issue #568（操作系 3 章）に対する検証を完了した。repo 標準検証（test:all = exit 0）、record 構造検証（validator pass）、ガイド固有の機械検査（help 無改変、逐語一致 0 件、リンク 198 broken 0、日本語残存 0、H2 全対一致）のすべてが pass である。

## 受け入れ条件との対応（#568 = #533 規範の継承）

| 規範 / 条件 | 検証結果 |
|---|---|
| 3 章の日英存在 + index 反映 | 3 対 + index 対を新設・更新（H2 対一致） |
| 実測駆動 | help 全 50 行の 5 block 分割掲載を二重照合。agents 14 / 4 択は実体照合 |
| 丸コピー禁止 | stage reviewer の上流突き合わせで逐語一致 0 件。構成・論法とも別物 |
| 上流ドリフト同型を作らない | 初見レビュー High 4 件（実体との不一致）を全件修正。派生で #582 を起票 |

## 残タスク

- draft PR 作成（恒常ルール）→ 3 条件で Ready → merge 依頼。
