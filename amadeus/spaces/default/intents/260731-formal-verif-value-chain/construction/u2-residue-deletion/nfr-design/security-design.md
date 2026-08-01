# Security Design — u2-residue-deletion

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 攻撃面の純減

到達不能コード 30 ファイル(domain-entities.md E1)の削除は攻撃面・保守面の純減であり、新規の入力・権限・秘匿情報の面を持たない。

## fail-closed 契約

- 削除対象の列挙照合(BR-U2-1 — 30 件不一致で停止)が誤削除を防ぐ。
- 台帳の stale 検査(D3/D4)が削除漏れ・過剰削除を機械検出(requirements NFR-4)。
