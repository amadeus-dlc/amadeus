# NFR Design 質問 — election-record-transport

## Context

[business-logic-model](../functional-design/business-logic-model.md)を入力とする。

## Q1: confidentiality strategyは？

- A. view key whitelist、voter固有path、short notification、no peer signal
- B.全ballotを通知
- C. shared view
- D. network encryption新設
- E. recommendation追加
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。blind contractを構造で守る）

## Q2: verification isolationは？

- A. rendererとverifierを分け、独立sourceを比較
- B.同じstringを比較
- C. verification省略
- D. transportがverify
- E. recordがstate更新
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。verification theatreを防ぐ）
