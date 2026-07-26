# Performance Test Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(fix-1498-envelope-lf)

## 比例選定の方針

承認済み NFR へ trace できる範囲のみ生成する。

## 対象と根拠

本 intent に性能 NFR なし — 負荷試験は生成しない。find の1ページずつ化はリクエスト数を O(pages) にするが、旧 --paginate も内部で同数のリクエストを発行しており実質不変(設計等価、code-summary 記載)。
