# Security Requirements — U7: callsite-migration

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 根拠 |
|---|---|---|
| redaction ポリシーの不変 | 移行後の emit 経路で fields は registry の required attributes に整形され、FR-DST-3/4/5 の二層 redaction 契約を素通りさせない。Adapter は属性を追加・書換え・素通ししない | BR-2、FR-DST-3 |
| guard allowlist の改竄耐性 | allowlist への site 追加を含む差分は CI で機械拒否する（ratchet は縮小のみ）。人間の手編集による迂回を許容しない | BR-8、VER-4 |
| drift guard 違反の顕在化 | registry 未登録 eventType は例外として顕在化させ、silent fallback・既定 event への丸め・旧 writer への迂回を禁止する | BR-3、VER-1 |

## 適用外とその理由

- 認証・認可・ネットワーク境界: 本 Unit はローカル静的検査とローカル emit 委譲のみで、外部通信・credential 取扱いを持たない（NFR-4 は Relay 側の責務）。audit JSONL・Signal Store の credential-free 検査（VER-2）は U1/U8 側ゲートに委譲し、本 Unit は emit 内容を変えないことでその検査結果を不変に保つ

## 制約

- guard 走査は読取専用とし、走査対象リポジトリへ一切書き込まない
- batch 変換 backup はリポジトリ内（git 管理対象）に限定し、外部送信しない
