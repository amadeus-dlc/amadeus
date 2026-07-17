# Performance Test Instructions — 260716-covci-flake

## 上流入力(consumes 全数)

`code-generation-plan.md`(変更目録 = ゼロ)、`code-summary.md`(閉包表)。

## 適用判断(N/A、根拠付き)

承認済み性能 NFR なし+コード変更ゼロ(裁定 A)— build-and-test:c1 により選定対象外。負荷計測(16コア飽和・coverage:ci 並走)は再現条件の生成手段であり性能契約ではない。
