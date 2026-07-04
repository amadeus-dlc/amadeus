# ドメインエンティティ — unit: skill-quality-repair

本 unit が扱う概念と関係を定義する。実装のデータ構造ではなく、監査・補修・契約整備の判断単位を表す。
上流入力は requirements.md であり、unit-of-work と application-design 系成果物は scope refactor により不在（設計どおり）である。

## エンティティ一覧

| エンティティ | 説明 | 主な属性 |
|---|---|---|
| Skill | 監査対象の amadeus-* skill。source（`skills/`）と昇格先（`.agents/skills/`）の対で存在する | 名前、種別（ステージ / 非ステージ）、source path、昇格先 path |
| AuditFinding | 1 skill × 1 観点の判定結果 | 対象 skill、観点、判定（pass / fail / n-a / 未確認）、根拠、分類（修正対象 / parity 内修正 / parity 逸脱・後続 Issue 候補） |
| AuditReport | AuditFinding を束ねた監査記録。`construction/skill-quality-repair/audit-report.md` | 判定表、要約、#340 へのコメント文 |
| GrillingTrailContract | Grilling Decision Trail の生成規約。テンプレートと規約記述の対 | 置き場所（amadeus-grilling references）、grillings.md 必須列、session 必須項目 |
| InputReferenceContract | GitHub Issue 短縮参照の入力契約 | 適用 skill 一覧、等価規則（#nnn ≡ URL）、明示形式（owner/repo#nnn）、曖昧時停止規則 |
| IssueDisposition | 対象 Issue の後始末判断（主に #341） | 対象 Issue、判定（消化済み / 残作業あり）、根拠、提案（close / 継続） |

## 関係

```
Skill 1--* AuditFinding *--1 AuditReport
AuditFinding（言語 policy 観点）--> IssueDisposition（#341）
GrillingTrailContract --> Skill（生成側 skill が参照）
InputReferenceContract --> Skill（Issue 入力 skill が契約を持つ）
AuditReport --> GitHub Issue #340（要約コメント）
```

<!-- Text fallback: Skill は複数の AuditFinding を持ち、AuditFinding は 1 個の AuditReport に集約される。言語 policy 観点の AuditFinding は #341 の IssueDisposition の入力になる。GrillingTrailContract と InputReferenceContract は、それぞれ生成側 skill と Issue 入力 skill から参照される。AuditReport の要約は #340 にコメントされる。 -->

## AuditFinding のライフサイクル

```
detected（WF1 で検出）
  --> classified（3 分類のいずれか）
        +--> repairable         --> repaired（WF2 で修正・promote 済み）
        +--> parity-limited     --> repaired（parity 契約内で修正済み）
        +--> deferred           --> recorded（後続 Issue 候補として記録）
```

- すべての finding は、`repaired` または `recorded` のどちらかで終端する。未処理のまま Bolt を完了しない。
- `deferred` の finding は AuditReport に後続 Issue 候補として残し、本 Intent の受け入れ条件から外す。

## 契約エンティティの不変条件

- GrillingTrailContract の形式定義は 1 箇所だけに存在する（複製禁止）。validator の要求形式と矛盾しない。
- InputReferenceContract は、適用対象の skill を明示的に列挙できる（暗黙の全 skill 適用をしない）。
- Skill の source と昇格先は、promote 手順を経由した同期状態を保つ。
