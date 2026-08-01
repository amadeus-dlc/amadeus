# Reliability Design — issuance-guard(U2)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- 信頼性は `business-logic-model.md` の3値判定(ok/redirect/violation)の全域定義に接地する。

## 信頼性設計

- 判別 union で無音 false を型的に排除 — 7 return-false サイトの全カテゴリが verdict へ写像され、列挙外は violation(fail-closed 既定)。
- redirect(autonomy 未設定×幅≥2)はラダープロンプトへの正規誘導 — エラーで止めず正しい決定点へ運ぶ(可用性を落とさない fail-closed)。
- guardMessage は canonical 1定義(ADR-4)— メッセージ様式の分裂による誤誘導を構造的に防ぐ。

## 検証形

- FR-1 の AC(1a/1b/1c)と FR-6 corpus sweep が引き受ける(専用検査の新設なし)。
