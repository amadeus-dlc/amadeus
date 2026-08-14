# NFR Design 質問 — formal-election-multiq

## Context

NFR Requirements inputsはabsent-and-expected。formal receipt/model-mapのintegrity controlだけを設計する。

## Q1: trust controlは？

- A. source identity、model-map completeness、completion marker、NOT_DETECTEDの全一致
- B. stdout文字列だけ
- C. exit codeだけ
- D.手書きhash
- E. partial run許可
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。verification receiptをfail-closedにする）
