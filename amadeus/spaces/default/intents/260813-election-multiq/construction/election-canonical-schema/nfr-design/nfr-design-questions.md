# NFR Design 質問 — election-canonical-schema

## Context

[business-logic-model](../functional-design/business-logic-model.md)を入力とする。NFR Requirementsはscopeでskipされ、個別SEC/REL IDは存在しないため、上流RequirementsのNFR-1/3/4を再定義せず参照する。

## Q1: 主なsecurity boundaryは？

- A. untrusted JSON→strict versioned decoder→canonical typed value
- B. network firewall
- C. OAuth
- D. database ACL
- E. browser CSP
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。local CLIの実在するtrust boundary）

## Q2: logical decompositionは？

- A. shape/version classifier、strict decoders、canonical encoder、identity helper
- B.単一巨大parse関数
- C.外部service
- D. generated copyごと
- E. file pathごと
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。責務とtest seamを分ける）
