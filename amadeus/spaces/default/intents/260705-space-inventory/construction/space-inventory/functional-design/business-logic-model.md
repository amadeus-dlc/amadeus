# Business Logic Model — space-inventory

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更のモデル

実行時ロジックは変更しない。D1〜D6 の文書修正を、要求の棚卸し表と 1:1 で適用する。
D5 のみ新規ファイル 3 件（phase 防護規定）で、graph compile 時に各 phase の rules_in_context へ載る（construction.md と同じ経路）。stage-graph.json の再生成は #494（rulesDir 修正）へ委ね、本 PR では行わない。
