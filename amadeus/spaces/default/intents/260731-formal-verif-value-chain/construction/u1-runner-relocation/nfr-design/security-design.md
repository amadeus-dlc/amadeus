# Security Design — u1-runner-relocation

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## 境界の保存

- 移設(business-logic-model.md T1)は実行権限・入力検証の面を変えない — runner の入力(CLI 引数・EVIDENCE_ROOT)検証は移設元の実装のまま(I1 挙動不変)。
- model-map 複製(T2/T3)は読み取り専用データの複製であり、秘匿情報を含まない(domain-entities.md E2 — 公開リポジトリ内のハッシュ台帳)。
- 新規の外部入力・ネットワーク面・認証情報は導入しない(requirements NFR-3 の配布同期は既存パイプラインのみ)。

## fail-closed 契約

drift 検査(T3)は複製の byte 不一致で赤(business-rules.md BR-U1-2 の落ちる実証付き)— 改竄・手編集は機械検出される。
