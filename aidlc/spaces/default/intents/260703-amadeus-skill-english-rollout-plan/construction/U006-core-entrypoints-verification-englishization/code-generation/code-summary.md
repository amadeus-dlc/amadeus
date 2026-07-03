# Code Summary：Core entrypoints and verification 英語化

## 目的

RU002 として、単一公開入口、Space 初期化、検証の 3 skill の `SKILL.md` を英語化し、以後の stage skill 英語化が参照する語彙をそろえた。

## 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `skills/amadeus/SKILL.md` | 本文と frontmatter description を英語化した。scope 推定の日本語キーワード（入力照合用リテラル）、`未確認`、生成成果物の見出し名リテラル（`概要`、`依存`、`目標プロファイル`、`Domain Map と Context Map への反映候補`）は保持した。 |
| `skills/amadeus-steering/SKILL.md` | 本文と frontmatter description を英語化した。生成成果物（memory、knowledge、intents 索引）の日本語見出し名リテラルと `未確認`、固定文言 `現時点ではなし。` は保持した。 |
| `skills/amadeus-validator/SKILL.md` | 本文と frontmatter description を英語化した。ユーザー向け結果報告の埋め込みテンプレート（`# Amadeus Validator 結果` 以下）と Grilling Decision Trail の記録項目名は日本語のまま保持した。 |
| `.agents/skills/{amadeus,amadeus-steering,amadeus-validator}/SKILL.md` | `promote-skill.ts --replace` で昇格反映した。 |
| `dev-scripts/evals/amadeus-templates/check.ts` | `amadeus-validator` の textContract needle を英語本文と整合させた（RED を確認してから更新した）。 |
| `examples/skill-provenance.json` | `skills/amadeus/SKILL.md` と `skills/amadeus-steering/SKILL.md` の全 snapshot entry に staleReason を追記した。md5 は書き換えていない。 |

## 対応した要求

| 要求 | 対応 |
|---|---|
| R005 | 残り skill 英語化の RU002 を実行し、#399 の完了境界（全面英語化）へ前進した。 |
| R006 | 翻訳のみで意味を変えず、生成成果物とユーザー向け文言の日本語維持対象を変更していない。 |

## 検証

Build and Test で実行する。

Code Generation ではテスト実行結果を記録しない。

## 未完了

- B006 の Build and Test（統合実行として記録）。
- PR #417 merge による完了確定。
