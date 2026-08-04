# NFR Design: セキュリティ設計 — U1 tla-evidence-foundation

上流入力(consumes 全数): 本 unit の解決済み consumes は `business-logic-model.md`(U1 functional-design、READY 確定)。`security-requirements` / `tech-stack-decisions` は nfr-requirements SKIP による expected-absent(設計どおりの欠落 — 内容を発明しない)。

## 守る資産と完全性設計

U1 が守る資産は **evidence store(`specs/tla-evidence/`)の完全性と監査性**(NFR-002/NFR-003)。認証・認可・暗号化(秘匿)は本 unit の要件に存在しない — evidence は version 管理される公開 repo 内容であり、守るのは機密性ではなく**改竄検出と由来復元**である(常駐 service 向けの認証/暗号セレモニーを機械適用しない — cid:nfr-design:c1 の CLI/library 置換)。

| 資産 / 脅威 | 対策(`business-logic-model.md` の確定設計の NFR 面) |
|---|---|
| envelope の改竄(byte 変更) | content addressing — bundle digest は canonical 直列化全 bytes の SHA-256。verify がファイル名 = bytes digest を照合し `digest-mismatch` で検出(BR-U1-19) |
| 部分書込の観測 | `.tmp/` 隔離 + atomic rename。最終位置に部分 evidence は決して現れない(BR-U1-02/08) |
| 由来の偽装・喪失 | envelope が `generatedAt` / `generatedBy` / `predecessor` を digest 対象として保持(NFR-002)。系列先頭は明示 root marker(BR-U1-05) |
| 壊れた evidence の肯定的利用 | verify 通過の証明は `VerifiedBundle` ブランド型のみで運ぶ。corrupted は list が黙殺せず併記(BR-U1-22/23) |
| 書き手の多重化による整合崩壊 | 書き手は C4 単一(BR-U1-01)。並行 build は content addressing で無害(BR-U1-25) |

## 入力検証(システム境界)

- digest 文字列は `sha256:<hex64>` 形式のスマートコンストラクタ検証(`domain-entities.md` のブランド型)— 不正形式は型で拒否。
- envelope の読取は parse-don't-validate: schema 不整合は `missing-part` の全数列挙で fail-closed(BR-U1-20)。
- stable ID は閉じた文法(`FR|NFR|AC`-\d{3} / `ADR`-\d+)のみ受理(BR-U1-12)— 恣意的トークンの identity 混入を防ぐ。

## 権限・攻撃面

- 新規のネットワーク経路・秘密情報・環境変数依存はゼロ。I/O は repo 内 `specs/tla-evidence/` の読み書きのみ。
- CLI(`tla-authoring.ts identity` / `bundle`)の起動は argv のみで shell 展開なし(`services.md` 通信契約と同じ規律)。
- 監査面: 全 evidence は git 管理下(version 管理)に置く — 根拠は承認済み `decisions.md` ADR-3 可逆性節「誤登録は…通常 PR + revert で回復でき、`memory/project.md` の『version-controlled append-only 生成物は git revert で回復』規律に一致する」(git 管理が前提の裁定)および ADR-7(record dir でなく space 横断の evidence store を選んだ理由 = 後続 intent・監査者の横断参照)。既存 `specs/tla/` 配下(model-map・model receipt)が tracked である既習パターンとも一致する。

## 上流トレーサビリティ

- `construction/tla-evidence-foundation/functional-design/business-logic-model.md`(build/verify/list の確定設計)、`business-rules.md`(BR-U1 群)、`domain-entities.md`(ブランド型)
- `inception/requirements-analysis/requirements.md`(NFR-002、NFR-003)
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:52:32Z)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T22:57:16Z
- **Iteration:** 1
- **Scope decision:** none

セキュリティ設計は完全性/監査性に比例し常駐service儀式を排し、層構成もFDのBR群・coverage規律と整合、BLOCKERなし

### Findings

- FOLLOW-UP | security-design.md:27 — 「全 evidence が git 管理下に置かれ」という主張は business-logic-model.md / business-rules.md / domain-entities.md のいずれにも明示根拠がなく、evidence store の commit ポリシーは nfr-design で新規に導入された未検証の前提。実装着手前に根拠(既存 model receipt パターン等)の明記または FD への申告が必要。
- FOLLOW-UP | logical-components.md:11 — 「head 解決の集合演算」を純関数層に置く設計だが、domain-entities.md の EvidenceIndex.refs は EvidenceBundleRef(digest のみ)しか公開せず predecessor field を含まないため、head() が実際にどのデータ(digest のみ vs 各 envelope の predecessor 込みの内部表現)を入力に取るかが未確定で、実装者の推測に委ねられている。
- NIT | security-design.md:26 — 「services.md 通信契約と同じ規律」への参照は本レビューの許可読取範囲外のため独立照合ができない(欠陥の主張ではなく確認範囲の記録)。
