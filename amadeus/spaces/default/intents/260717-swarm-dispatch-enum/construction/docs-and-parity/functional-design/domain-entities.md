# Domain Entities — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## エンティティ

本 unit は新規型を導入しない(文書・生成物のみ)。U1 の `DriverName` 三値が docs 上の語彙の正であり、docs は写しに徹する(語彙の単一始点 — C-06)。

## 不変条件

- docs の decision 表・値集合は U1 実装(DRIVER_VALUES)から転記し、独自の値・別名を導入しない
- dist ツリーの内容は正本からの純関数(生成)であり、本 unit の diff に dist 手書き行が現れない
