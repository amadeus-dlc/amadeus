# Code Summary — U2 visualize-hardening

上流入力(consumes 全数): functional-design 4成果物、nfr-design、requirements.md

## 変更ファイル(Bolt 2)

| ファイル | 内容 |
|---|---|
| scripts/metrics-visualize.ts | +regressionClass / MAX_HTML_BYTES / --check(checkAgainstDisk)/ 凡例・強調スタイル |
| tests/unit・integration t298 | +19テスト(45 pass 計、落ちる実証: tampered/missing/over-ceiling/強調両側) |
| .github/workflows/ci.yml | Render metrics dashboard ステップ(:453 付近、権限変更なし) |
| docs/guide/23-metrics-dashboard(.ja).md + README 索引 | 日英ペア・相互リンク(t174 green) |
| metrics/index.html | 凡例+スタイル反映(546,594 bytes、--check up to date) |

## 検証(全実測 exit 0)

- t298 45 pass / t174 5 pass / typecheck / biome 0 diagnostics / complexity NEW_VIOLATION なし / dist・self-install 同期 / lcov DA0 なし / --write→--check 決定性 round trip
- §12a reviewer READY(未検証面 = AC-6 の main run 観測をマージ後確認として明示引き継ぎ — 条件付き)
