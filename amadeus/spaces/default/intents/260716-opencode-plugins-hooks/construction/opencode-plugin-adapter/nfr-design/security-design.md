# Security Design — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../nfr-requirements/security-requirements.md`(S-1〜S-5)、`../nfr-requirements/performance-requirements.md`(P-3 純関数境界)、`../nfr-requirements/scalability-requirements.md`(N/A 前提)、`../nfr-requirements/reliability-requirements.md`(RL-3 fail-closed)、`../nfr-requirements/tech-stack-decisions.md`(spawn 契約)、`../functional-design/business-logic-model.md`(決定木)。2026-07-17。

## 入力検証戦略: reconstruct 境界への集約(parse-don't-validate)

検証はすべて純関数 `reconstruct` の入口で完結し、spawn 層には**検証済みの値だけ**が `Reconstruction`(型が検証の証明)として渡る:

```
未検証: event(string), payload(unknown)
   │ reconstruct 境界(唯一の検証点)
   ├─ 語彙判定: 配線表に基づく event 判定+toolNameFor(S-2/R-2 — 未登録は reject)
   ├─ 構造判定: payload 必須フィールドの実在(S-1/R-3 — 欠落は fail-closed)
   ▼
検証済み: Reconstruction{ calls: CoreCall[] } — hookFile は写像側の静的リテラルのみ
```

- **spawn 層に検証コードを置かない**(検証の分散は片側実装の温床 — symmetric-pair-review)。spawn が受け取る `hookFile` は payload 由来文字列を含まない(S-2 の注入面不存在を型と配置で保証)
- 検証失敗は `{ error }` で返し呼び出し元が stderr 記録(RL-1)— 検証層自身は I/O を持たない(P-3)

## 対象実体なしの統制(S-4/S-5 踏襲 — 設計対象外の明示)

認証/認可アーキテクチャ・暗号化・security headers・コンプライアンス統制は、対象実体なし(ローカル単一信頼域・ネットワーク境界なし・credentials なし)につき設計を追加しない。新規の信頼境界を導入しないことが本設計のセキュリティ上の主契約。

## 監査整合性の防御(本 unit 固有の第一級資産)

- phantom HUMAN_TURN 封鎖は設計時判断(工程0 の表で mint 配線可否を確定 — ADR-5)であり、ランタイム防御に依存しない(fail-closed の配置がランタイムより手前)
- audit への書き込みは core hooks(ツール所有 emit)のみ — plugin は audit ファイルへ直接触れない(C-2 保存、blast radius を logical-components.md で明文化)
