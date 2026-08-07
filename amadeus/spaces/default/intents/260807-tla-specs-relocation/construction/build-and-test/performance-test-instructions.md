# Performance Test Instructions — Intent 260807-tla-specs-relocation

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

## 適用判定

本 intent はパス正準化(self-refactor)であり、性能 NFR を持たない(requirements.md NFR-1〜4 に性能要件なし)。Comprehensive strategy は「applicable NFRs require them」の場合に性能テストを要求するため、本 intent では**新規性能テストは計画しない**。

## 既存性能面への影響確認

`code-summary.md` の「Files created / modified」で列挙された変更面、および `code-generation-plan.md` の変更クラス A〜F を走査した結果:

- 変更はパス解決(起動時・advisory 時の1回性処理)に閉じ、ホットループを持たない
- resolver の追加 I/O は `amadeus/active-space` カーソル1ファイルの read + legacy 検出の directory 走査1回(spec 解決時のみ)
- CI の wall-clock ベースの test-size drift 検査で性能退行のシグナルは観測されていない(CI Tests ジョブ pass)

## 実行

該当なし(既存 perf プロファイルは変更していない)。
