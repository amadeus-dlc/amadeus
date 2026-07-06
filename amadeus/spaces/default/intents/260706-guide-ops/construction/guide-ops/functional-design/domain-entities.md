# Domain Entities — guide-ops

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 照合台帳（620beb5e 基準、実測）

| 記載対象 | 実体（正） | 実測値 |
|---|---|---|
| agents | `.agents/amadeus/agents/`（隔離 workspace でも同一） | 14 ファイル = domain 11（architect / aws-platform / compliance / delivery / design / developer / devsecops / operations / pipeline-deploy / product / quality）+ reviewer 2（architecture-reviewer / product-lead）+ composer 1 |
| 質問モード | `skills/amadeus/references/question-rendering.md` の Mode selection | 実 4 択 = Guide me / Grill me / I'll edit the file / Chat（Grill me は harness 側で 2 番目に挿入、amadeus-grilling ブリッジへ委譲） |
| questions ファイル形式 | `stage-protocol.md`（Question flow） | `[Answer]:` タグ、選択肢 A〜E + X (Other)、ファイルが常に正 |
| CLI コマンド | `amadeus-utility.ts help` 実出力 | 全 50 行 = 4 節（Scopes 10 種（stage 数と depth 付き）/ Utilities 19 行（--status / compose / --new-scope / intent / space / space-create / codekb-path / --doctor / --stage / --phase / --scope / --depth / --test-strategy / --version / --help）/ Other（<description> による auto-detect と無引数 resume）/ Examples（実行例 9 行））。help-output.txt（全文再採取済み） |
| 章番号 | docs/guide/index の予定一覧 | 06 = Agents、07 = Interaction Modes、12 = CLI Commands（いずれも #568） |

## 様式の正（前 Intent の 4 対）

英語版 = 英語見出し、ja 版 = H1「English Title（日本語名）」+ 日本語見出し、H2 対一致、ja からは対訳実在分を `.ja.md` 参照。
