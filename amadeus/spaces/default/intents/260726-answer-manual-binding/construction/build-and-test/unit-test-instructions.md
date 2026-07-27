# Unit Test Instructions — 260726-answer-manual-binding

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-answer-manual-binding/code-generation/ — 検証対象・実測 exit code・逸脱裁定の導出元)。

## 対象と実行

本修正の検証主面は integration(t282 — lifecycle を in-process 駆動する既習様式)。unit 層の新設はなし — coordinator/reducer の既存 unit 群(t278 系ほか)は run-tests.sh --ci に含まれグリーン維持(code-summary.md 検証表)。

## 判定

mirror suite(t275/t279/t280/t268/t278/t300)107 pass 0 fail(builder 実測、conductor はフル CI で包含確認)。
