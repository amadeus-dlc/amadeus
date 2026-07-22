# Scalability Requirements — leader-sync-tool(U1)

上流入力(consumes 全数): requirements, business-logic-model, business-rules, technology-stack — 規模成長軸は requirements.md の滞留実測、分割は business-rules.md BR-5、走査実装は business-logic-model.md M1/M7 に依拠。

## 要求

- SC-1: elections 数の成長(現 55 → 単調増加)に対し、走査は O(n) の一次走査のみ(technology-stack.md の Bun FS API で十分 — インデックス等の新機構は導入しない)。
- SC-2: 滞留の上限は運用契機(FR-2 二重契機)で構造的に抑制 — tool 側は SYNC_SPLIT_FILE_LIMIT 超過時の分割提案(BR-5)で単一 PR の可レビュー性を守る。

## 検証

corpus sweep(BR-7)が現行全量規模での実行実証を兼ねる。
