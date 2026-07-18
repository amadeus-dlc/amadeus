# Security Requirements — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- SNR-D1(NFR-5 / C-24): docs・生成物に token/credential を含めない — NFR-5 の対象語彙のまま、由来のない基準を追加しない(受け入れ = 変更 docs の目視+既存 secrets 検査の枠内)
- SNR-D2(C-14 開示): sandbox unrestricted 実測条件の開示を docs へ正確に転記 — 無条件の安全確約を書かない(`business-rules.md` BR-D3 の隣接面。禁止フレーズ語彙は U2 NR(SNR-W2)の候補と同一集合を nfr-design で確定(canonical = U1 driver-contract-core ND の RD-4。参照経路 = unit-of-work-dependency.md の Cross-unit 決定欄 CU-1)。受け入れ = 禁止フレーズ 0 の grep)

## 検証

- 認証・認可は対象外(本 unit は文書・生成物のみで権限境界を導入しない。constraint-register に auth/authz 制約は不在 — U2 NR と同一の不在根拠)— 根拠付き N/A
