# Scalability Requirements — fix-1170-retreat-guard(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要件

| # | 要件 | 根拠 |
|---|---|---|
| SC-1 | 並行書き手数の増加(サブエージェント・並行 builder の set-status 多重発火)に対し、ロック直列化で lost-update ゼロを維持する — 並行度の上限は設けない(待ちは P-1 のリトライ上限で bound) | FR-1d/A-2(直列化の副次効果)、requirements A-2 |
| SC-2 | state ファイルサイズ増(ステージ数増)への感度は parseCheckboxes の線形走査のみ — 既存 engine RMW と同特性で新規スケール懸念なし | ADR-4(既存関数再利用) |

分散・水平スケール要件は N/A(反証可能根拠: 単一リポジトリのローカルファイル RMW であり、リモート共有 state は存在しない — architecture.md の CLI+hook 構成)。

## 前提(technology-stack 由来)

technology-stack.md の単一マシン・ローカルファイル構成が SC-1/SC-2 の分析前提(分散 state なし)。
