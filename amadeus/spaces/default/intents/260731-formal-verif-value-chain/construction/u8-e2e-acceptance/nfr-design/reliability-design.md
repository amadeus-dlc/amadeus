# Reliability Design — u8-e2e-acceptance

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 障害モードと回復(FD の I1〜I3 を表内で全数カバー)

| 障害 | 挙動 | 根拠 |
|---|---|---|
| 証跡の演出混入(手書きイベント) | 検証劇場 Forbidden — audit shard は実行由来のみ、転記は verbatim+seq(shard 真正性は既存 hook 基盤) | business-logic-model.md I1 / BR-U8-2 |
| 前提 unit 未着地(S1〜S3 が貫通不能) | 2層で保証: (a) engine の edge block は**成果物生成順序**のみ強制(unitCovered はディスク実在判定)(b) 実コードの main 着地は人間承認境界(no-AI-merge)— u8 の実測開始前に conductor が u4/u5/u7 の**マージ着地**を実測確認する(層を混同しない — nfr-design:c4) | I2(層別化 — reviewer Minor 反映) |
| 貫通失敗を完了扱いする早期完了 | S1〜S3 全貫通が workflow 完了の前提(state 前進と実体完了を同一視しない) | I3 / bt-workflow-completion-substance-gate |
| glue 修正のスコープ逸脱 | 3値判定(FR 範囲内/Issue 化/Won't 記録)— 迷えばエスカレーション | business-rules.md BR-U8-3 |

## 回復経路

実測失敗は原因 unit への差し戻し(glue か Issue 化かは BR-U8-3)。記録の誤りは record 修正のみで実装面に波及しない。
