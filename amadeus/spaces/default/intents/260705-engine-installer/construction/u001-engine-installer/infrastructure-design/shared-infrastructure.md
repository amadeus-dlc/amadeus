# Shared Infrastructure — u001-engine-installer（260705-engine-installer）

上流入力: [external-dependency-map.md](../../../inception/delivery-planning/external-dependency-map.md)

## 共有資産との接触

| 共有資産 | 接触 | 解消方法 |
|---|---|---|
| package.json scripts | 追記 2 行（amadeus:install、test:it:installer） | 追記型接触。並行 Intent と衝突しても union 解消可能（CON-8） |
| dev-scripts/evals/ | installer/ ディレクトリ新設 | 新規追加のみ、既存 eval に触れない |
| .agents/amadeus/（エンジン） | 読み取り専用（コピー元） | 変更しない（CON-7）。並行 Intent（#428 上流同期、#498/#499/#501 bug 束ね）のレイアウト変更は FR-2.5 が検知 |

## 適用判断

共有クラウドインフラ・共有環境は存在しない（不適用）。
