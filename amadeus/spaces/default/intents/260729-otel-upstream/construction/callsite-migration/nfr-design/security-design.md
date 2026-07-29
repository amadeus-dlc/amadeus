# Security Design — U7: callsite-migration

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の目標（redaction 不変・allowlist 改竄耐性・drift guard 違反の顕在化）に対する設計。

## redaction 契約の不変設計

- Adapter は fields を registry の required attributes に整形するのみで、属性の追加・書換え・素通しを行わない。整形後の値は通常経路と同一の二層 redaction（write-time＋export 境界、FR-DST-3/4/5）を通るため、Adapter 経由であることを理由に redaction を素通りする経路を作らない（BR-2）
- emit 内容を変えないことで VER-2 credential-free ゲートの検査結果を不変に保つ（security-requirements.md § 適用外とその理由）

## allowlist の改竄耐性設計

- allowlist は committed JSON＋ratchet 判定（縮小のみ許可、追加を含む差分は CI 拒否）とし、既存の「committed baseline JSON＋--check 単調非減少」テンプレート（coverage ratchet・CCN baseline と同型）を踏襲する（tech-stack-decisions.md § 既存スタックとの整合）
- 人間の手編集による迂回を許容しない: allowlist 変更差分の機械検証を CI に置き、レビュー判断で追加を通す運用経路を作らない（BR-8、VER-4）

## drift guard 違反の顕在化設計

- registry 未登録 eventType は例外として顕在化させ、silent fallback・既定 event への丸め・旧 writer への迂回を禁止する（BR-3、VER-1）
- guard 走査は読取専用とし、走査対象リポジトリへ一切書き込まない。batch 変換 backup はリポジトリ内（git 管理対象）に限定し外部送信しない

## 適用外

- 認証・認可・ネットワーク境界は対象外（ローカル静的検査とローカル emit 委譲のみ。NFR-4 は Relay 側の責務）
