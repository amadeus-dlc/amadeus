# Reliability Design — u6-impl-only-path

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 障害モードと回復(FD の I1〜I4 を表内で全数カバー)

| 障害 | 挙動 | 根拠 |
|---|---|---|
| model/cfg 変更の偽装(--impl-only 誤用) | identity 比較で必ず拒否+従来経路を案内 | business-logic-model.md I1 / P1 |
| 無フラグ経路の挙動汚染 | 成功形バイト不変(第3 union メンバー新設 — domain-entities.md E1。既存2枝は不変)+既存テスト green | I2 / P5 |
| u1 未着地(loader パス不在) | u6 テストは移設後パスを踏む — 未着地では実行前提が成立せず fail | I3 / edge block |
| 監査記録のハードコード | 実 publish の戻りから導出+t380 が固定(検証劇場 Forbidden) | I4 / P5 |
| drift 判定の二重実装化 | check 経路の evaluateEntries+diffModelMap を再配線(第3実装禁止) | P1 の配線規定 |

## 回復経路

--impl-only の失敗は無副作用(publish 前に判定)— 再実行が冪等。誤更新は git revert が回復経路(P2 の git 層)。
