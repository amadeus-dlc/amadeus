# Practices Discovery — Discovered Rules(260719-ballot-failclosed-amend)

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md

## 新規ルール候補

**0件。** evidence.md の全5面が affirm 済み team.md / project.md の既存ルールで完全にカバーされており、本 intent(選挙 CLI の受理境界修正)は新しいプラクティスを要求しない。既存ルールとの差分ギャップなし(practices-discovery:c1 の差分質問方式 — ギャップ 0 のため質問も 0 件)。

## 適用確認(本 intent が従う既決ルール)

- ADR-5(original 非上書き・amend 共存)— store.ts:122-124 コメントで実装済み既決。amend 経路はこれを保つ(constraint-register C-7)。
- 検証劇場 Forbidden — 落ちる実証(ISO 風 NaN 非該当文字列)・閉包テストの要求は org.md Mandated と一致。
- parse-don't-validate(construction ガードレール)— #1252 の修正方向そのもの(検証済みであることを型で運ぶ)。
