# Reliability Requirements — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- RNR-D1(NFR-1 の文書面): 監査語彙の docs 記述(12-state-machine.md:367 / audit-format.md:202 の SWARM_DEGRADED 行)を三値後の事実へ更新し、audit enum・emit 実装と矛盾する記述を残さない(`business-logic-model.md` 写像表の C-1/M-1 是正行。受け入れ = 両行の grep で旧 =1 有効値記述 0)
- RNR-D2(NFR-2 / C-15): effort 証拠限界の開示を docs に明記 — 「実測済み」と読める表現の禁止(BR-D3。禁止フレーズは nfr-design で確定)
- RNR-D3(drift ゼロ): dist:check / promote:self:check green を受け入れの正とし、手編集での「見かけ同期」を許さない(受け入れ = 両 check exit 0 — 生成再現性が正)

## 検証

- NFR-4(retry identity)は非該当 — U2 FD で契約済み、docs は転記のみ — 根拠付き N/A
- NFR-6 は適用対象 — docs gate 系テスト(t174 等)と dist/promote check を green 維持
