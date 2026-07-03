# G001：v2 完全準拠の要求境界

## 概要

- 状態: completed
- 対象: Intent `20260703-aidlc-v2-full-compliance` の Requirements Analysis
- 反映先: [requirements.md](../requirements-analysis/requirements.md)

受け入れ条件「v2 規定との差分ゼロ」の解釈を左右する 3 論点を確定した。

## 確定判断

| ID | 判断 | 状態 | 反映先 |
|---|---|---|---|
| GD001 | v2 規定の機械可読・構造的成果物（aidlc-state.md、intents.json、audit/、memory.md の構造）は、v2 の構造と英語ラベルをそのまま使う。記述系成果物（要求、設計、計画の本文）は日本語規範を維持する | active | [requirements.md](../requirements-analysis/requirements.md) の R003、R005 |
| GD002 | 自己開発 workspace の Space 名は `default` にする（v2 の自動生成既定に従い、独自色を出さない） | active | [requirements.md](../requirements-analysis/requirements.md) の R001 |
| GD003 | 旧 `.amadeus/` は完全移行して削除する。steering は `memory/` へ、`knowledge/codebase/<repo>/` は `codekb/<repo>/` へ、この Intent の record は `aidlc/spaces/default/intents/260703-aidlc-v2-full-compliance/` へ YYMMDD 化して移設する。旧構造は git 履歴に残す | active | [requirements.md](../requirements-analysis/requirements.md) の R001、R004 |

## 質問記録

### Q1

- 確認したいこと: v2 規定の機械可読・構造的成果物の言語と構造をどうするか。
- 確認が必要な理由: 受け入れ条件「v2 規定との差分ゼロ」の解釈に直結する。v2 のこれらは英語ラベルの固定構造であり、日本語化すると構造差分が残る。一方、現行規範は「成果物は日本語」である。
- 推奨回答: v2 の構造・英語ラベルのまま（記述系成果物は日本語維持）。
- 推奨理由: 機械可読層に独自色を持ち込まないという本 Intent の方針と一貫し、validator の照合を v2 定義のままにできる。
- ユーザー回答: v2 の構造・英語ラベルのまま。
- 確定判断: GD001

### Q2

- 確認したいこと: 自己開発 workspace の Space 名をどうするか。
- 確認が必要な理由: 移行後の全パスと、受け入れ条件の観測（record の位置）に効く。
- 推奨回答: `default`。
- 推奨理由: v2 は明示作成がない場合 `default` を自動生成する。1 チーム 1 Space の自己開発では既定で十分である。
- ユーザー回答: `default`。
- 確定判断: GD002

### Q3

- 確認したいこと: 旧 `.amadeus/` と既存 record（この Intent 自身）の移行をどうするか。
- 確認が必要な理由: 「workspace が aidlc/spaces/ 構造である」の完了判定と、進行中 Intent の record 移設手順に効く。
- 推奨回答: 完全移行（`.amadeus` 削除）。
- 推奨理由: 二重管理は drift の温床であり、旧構造は git 履歴で参照できる。
- ユーザー回答: 完全移行（`.amadeus` 削除）。
- 確定判断: GD003
