# Code Generation Plan — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `requirements.md`(FR-9/FR-10、NFR-2)、FD 4成果物(`business-logic-model.md` 文書写像表=単一台帳・`business-rules.md` BR-D1〜D6・`domain-entities.md` 語彙単一始点・`frontend-components.md` 読者契約)、ND 5成果物(`logical-components.md`・`reliability-design.md` RD-D1〜D3・`security-design.md` SD-D1/D2・`scalability-design.md` SCD-D1/D2・`performance-design.md` PD-D1)、`unit-of-work.md` U3。

## 検証方針

受け入れは BR-D1(16セル4列形状)・BR-D2(1行限定)・BR-D6(走査範囲2域+判定例)・SCD-D2(count-free grep)・RD-D3(drift check が正)に従う。

## 実施計画(worktree 隔離 builder — 実績)

1. swarm prepare batch 3(Bolt 1+2 着地済み base から fork)
2. builder ディスパッチ(c2・deviation-stop・同期完遂)
3. 対象: 写像表の全行(docs 13 対+audit-format.md)+dist/self-install 再生成
4. 全検証 → grep 群 → 16セル手動照合
