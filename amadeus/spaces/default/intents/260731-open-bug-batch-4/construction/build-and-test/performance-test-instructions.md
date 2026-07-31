# Performance Test Instructions — 260731-open-bug-batch-4

上流入力(consumes 全数): code-generation-plan.md — fix-1797 の負荷スイープ設計(16並列 burst/steady)を性能検証の正本手順とした。code-summary.md — スイープ数表の所在(PR #1822 本文)と導出結果を本書へ転記した。

## 検査の比例選定(bt-proportional-selection 準拠)

本 intent で性能面に trace できる要件は FR-3(#1797、t259 の性能比 assert の flake)のみ。負荷試験の機械追加は行わない。

## fix-1797 の性能検証(実施済み・実測導出)

- **欠陥再現**: repo 外 scratch の 16並列 busy/idle バースト負荷下、現行逐次2プロセス設計で比 max 2.5179 > 閾値 2.5(Issue 報告値 2.5065 と同型)。steady では超えない = 窓間負荷変化が原因と確定。
- **新設計**: 交互計測で burst 下レンジ幅 0.748 → 0.087。閾値 2.5 据置き(FR-3b の維持分岐、実測から導出 — c1-benchmark-baseline-correlation-verify 準拠)。
- **落ちる実証**: parse 注入 3.9785 赤 / retain 注入 4.14 赤 → revert 後 緑(検出力保存)。
- **CPU 消費リスク自己是正**: 初版 RSS probe の2倍化(20.8s)を probe 短縮で 11.7s へ。

## 結果

t259: 2 pass / exit 0。フル CI の wall-clock drift 3件(t-codex-hooks-migration / t225 / t258)は declared=medium measured=large の advisory であり、いずれも本 intent 非接触・既知クラス(#1830 で t258 flake は起票済み)。
