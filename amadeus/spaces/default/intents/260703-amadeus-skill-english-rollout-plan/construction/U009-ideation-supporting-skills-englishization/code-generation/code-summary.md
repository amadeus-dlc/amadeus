# Code Summary：Ideation and supporting skills 英語化

## 目的

RU005 と RU006 として、Ideation phase の 7 skill と補助分析・review 系の 7 skill の `SKILL.md` を英語化した。

## 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `skills/amadeus-ideation-{intent-capture,market-research,feasibility,scope-definition,team-formation,rough-mockups,approval-handoff}/SKILL.md` | 本文と frontmatter description を英語化した。`未確認` と `該当なし` の成果物向けリテラルは保持した。 |
| `skills/amadeus-grilling/SKILL.md` | 本文を英語化した。`# Grillings` の埋め込み成果物テンプレートと、session record の日本語項目名（`確認したいこと` など）は保持した。 |
| `skills/amadeus-domain-grilling/SKILL.md` | 本文を英語化した。ユーザーへ提示する skill 候補確認文と質問出力形式（日本語会話向け）は保持した。 |
| `skills/amadeus-domain-modeling/SKILL.md` | 本文を英語化した。ユーザーへ提示する日本語の対話例 4 箇所は保持した。 |
| `skills/amadeus-event-storming/SKILL.md` | 本文を英語化した。固定の初回質問文（日本語）と生成成果物の見出し名 `一覧` は保持した。phase 非前進境界を一対一で保持した。 |
| `skills/amadeus-decision-review/SKILL.md` | 本文を英語化した。成果物見出しリテラル（`未確定事項`、`未確認事項`）と固定記録句は保持した。 |
| `skills/amadeus-history-review/SKILL.md` | 本文を英語化した。読み取り専用境界と禁止事項を一対一で保持した。 |
| `skills/amadeus-learning-review/SKILL.md` | 本文を英語化した。分類 token を不変で保持した。 |
| `.agents/skills/`（同名 14 件） | `promote-skill.ts --replace` で昇格反映した。 |
| `dev-scripts/evals/amadeus-templates/check.ts` | decision-review、history-review、learning-review、domain-modeling、domain-grilling の textContract needle を英語本文と整合させた（RED を確認してから更新した）。 |
| `examples/skill-provenance.json` | Ideation 7 skill の全 snapshot entry に staleReason を追記した。md5 は書き換えていない。 |

## 対応した要求

| 要求 | 対応 |
|---|---|
| R005 | RU005 と RU006 を実行し、残り skill の英語化を完了した。 |
| R006 | 翻訳のみで意味を変えず、生成成果物、ユーザー向け質問形式、埋め込みテンプレートの日本語維持対象を変更していない。 |

## 検証

Build and Test で実行する。

Code Generation ではテスト実行結果を記録しない。

## 未完了

- B009 の Build and Test（統合実行として記録）。
- PR #417 merge による完了確定。
