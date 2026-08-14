# NFR Design 質問 — election-distribution-and-verification

## Context

NFR Requirements inputsはabsent-and-expected。build/test/norm evidenceのsupply-chain integrityを扱う。

## Q1: distribution controlは？

- A. canonical source only edit、deterministic isolated builds、source-only guard、projection equality
- B. generated dist直接編集
- C. one buildだけ
- D. manual copy
- E. checksum省略
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。正本と配布物のdriftを防ぐ）
