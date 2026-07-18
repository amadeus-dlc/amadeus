# Performance Design — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- PD-1(PNR-1 の実現): `resolveDriver` は配列 lookup と等値比較のみで構成し、I/O を持たない純関数として実装(`business-logic-model.md` 決定表の直写像)。resolve CLI ハンドラは env 読み+関数呼び出し+JSON.stringify の3手のみ
- PD-2(PNR-2): 性能計測・ベンチは追加しない — 保証機構は「構成が I/O を含まない」ことの実装レビューとし、性能テストの機械追加をしない(build-and-test:c1 整合)

## 保証機構(層別)

- 純関数層: import に fs/subprocess が現れない(lint 目視+レビュー)
- CLI 層: 既存 main switch の他 case と同型の薄い写像(逸脱時はレビュー捕捉)
