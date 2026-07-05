# Code Quality Assessment — 260705-rulesdir-resolve

上流入力: [Issue #491](https://github.com/amadeus-dlc/amadeus/issues/491)

## 評価

- 欠陥の型: レイアウト変更（.claude/tools → .agents/amadeus/tools、Issue #445）に取り残された固定深さのパス仮定。無音の空配列化（fail-open）が被害を拡大した。
- 同型の既知事例: amadeus-runtime の memory_path（#457/#458）、learnings surface の phase 解決（project.md learning）。「path 解決は構造を根拠にする」という既存の learning に沿って修正する。
