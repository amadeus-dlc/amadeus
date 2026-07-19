# Reliability Design — election-transport(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md

## 配送信頼性の設計(中核)

reliability-requirements.md の信頼性境界を次で実現する:

- `DeliveryRecord` は「送信実行の記録」であり「到達の証明」ではない — 型ドキュメントコメントに明記し、record.provenance("spawn-exit" | "reported-by-conductor")が生成起点を運ぶ(単段生成の正本は **business-rules.md:10 BR-T2** — reviewer 是正: 帰属訂正。business-logic-model.md は同フローの記述)。到達確認を僭称する API(ack 待ち・到達フラグ)を設けない(検証劇場の回避 — tech-stack-decisions.md の却下判断と一体)
- 送信失敗: agmsg spawn exit 非0 → `TransportError("send-failed")` の Result 返却(fail-closed)。subagent 経路は send-failed 非到達(directive 生成のみ — business-logic-model.md エラーバリアント表)。**blind payload の型検査(security-requirements.md の構造排除)と逐次配信のステートレス(scalability-requirements.md)は本信頼性設計の前提** — 状態を持たないため failure 後の再実行が冪等に近く、記帳側(U2)の duplicate 検査が二重記帳を防ぐ
- fake send.sh(exit 0/1)注入で記録有無を assert+notify 戻り値に record 非含有+外部構築不能の型面 assert(business-rules.md:10 BR-T2 の3 assert — security-design.md の型境界と同一機構の検証)
- **BR-T4/T5 の carry**(business-rules.md:12-13 — reviewer Minor 是正): 両輸送の DeliveryRecord スキーマ同一性(transport 判別子と provenance 以外)は deep-equal テストで、部分成功(N 名中 k 名送達)の voter 別記録は混在 exit fixture で、それぞれ設計どおり code-generation 時に固定する

## 障害分類

- send-failed は回復可能(U5 が再送を指令で提示 — 記帳は失敗として残る)。回復不能経路なし(永続は U2 の責務)。observability は N/A(reliability-requirements.md — 可視性は U2 timeline の記帳列。performance-requirements.md の逐次実行が記帳順序を自然に保存)
