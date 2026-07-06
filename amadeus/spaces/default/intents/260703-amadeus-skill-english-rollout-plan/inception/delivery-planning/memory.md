# Memory：delivery-planning

## 解釈

Bolt は Unit 1 個ずつ束ねる。

B001 を walking skeleton として扱う。

順序付けは依存先行とする。

## 逸脱

実装、Task 分解、Construction phase の成果物は作成しない。

`PHASE_VERIFIED` の記録と Lifecycle Phase の遷移は、この stage では行わない。

## トレードオフ

Unit 1 個ずつの Bolt は、子 Issue の完了証拠と Bolt の完了証拠を対応させやすい。

一方で、B001 と B002 をまとめる場合より PR 数は増えやすい。

この Intent では、親 Issue の順序と依存関係を崩さないことを優先する。

## 未解決の問い

現時点では未解決の問いはない。
