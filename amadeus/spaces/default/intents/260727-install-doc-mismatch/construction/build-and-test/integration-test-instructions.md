# Integration Test Instructions — 260727-install-doc-mismatch

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

## 選定判断

Minimal 戦略のため新規 integration テストの下限は設けない。本 intent の検証対象はすべて既存 integration スイート(unit-test-instructions.md に列挙した t299/t302/t307/t310/t311/t328/t338)でカバーされる — `.amadeus-plugin-src` 配置での discovery 実証(t299 系)が「修正後の INSTALL.md の指示どおり配置すれば動く」ことの機械的裏付けとなる。
## 追加生成の判定

追加生成は根拠がないため行わない(cid:build-and-test:bt-proportional-selection)。
