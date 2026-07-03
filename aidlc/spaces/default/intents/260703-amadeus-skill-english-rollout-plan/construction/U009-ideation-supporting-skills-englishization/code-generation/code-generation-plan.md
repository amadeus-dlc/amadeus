# Code Generation Plan：Ideation and supporting skills 英語化

## 目的

RU005（Ideation stage skills）として `amadeus-ideation-intent-capture`、`amadeus-ideation-market-research`、`amadeus-ideation-feasibility`、`amadeus-ideation-scope-definition`、`amadeus-ideation-team-formation`、`amadeus-ideation-rough-mockups`、`amadeus-ideation-approval-handoff` の 7 件、RU006（Supporting analysis and review skills）として `amadeus-grilling`、`amadeus-domain-grilling`、`amadeus-domain-modeling`、`amadeus-event-storming`、`amadeus-decision-review`、`amadeus-history-review`、`amadeus-learning-review` の 7 件の `SKILL.md` を英語化する。

## 実行境界

人間指示（PR #417 のリカバリ依頼、2026-07-03）により、B006〜B009 を単一リカバリ PR で実行する。

#391 と #393 は未判断だが、本 Bolt は翻訳だけを行い意味を変えないため、後続判断と衝突しない。

## 変更対象

| 対象 | 変更内容 | 理由 |
|---|---|---|
| `skills/amadeus-ideation-*/SKILL.md`（7 件） | 本文と frontmatter description を英語化 | Intent の入口から Inception へ渡す語彙をそろえるため。 |
| `skills/amadeus-{grilling,domain-grilling,domain-modeling,event-storming,decision-review,history-review,learning-review}/SKILL.md` | 本文と frontmatter description を英語化 | 補助分析と review 系の語彙をそろえるため。 |
| `.agents/skills/`（同名 14 件） | `promote-skill.ts --replace` で昇格反映 | source skill と昇格先を同期するため。 |
| `dev-scripts/evals/amadeus-templates/check.ts` | decision-review、history-review、learning-review、domain-modeling、domain-grilling の textContract needle を英語へ更新 | 契約検査を英語化後の本文と整合させるため。 |
| `examples/skill-provenance.json` | Ideation 7 skill の entry に staleReason を追記 | real provider 再生成を後続 PR に送るため。md5 は書き換えない。 |

## 日本語維持

- templates 配下は変更しない。
- `未確認` リテラルと、生成成果物内の見出し名リテラルは保持する。
- `amadeus-grilling` の `# Grillings` 埋め込みテンプレート、`amadeus-event-storming` の成果物構造記述など、生成成果物とユーザー向け出力の埋め込み構造は日本語のまま保持する。

## Preservation Pass

Trigger boundary、Stage procedure、Artifact contract、Knowledge flow、Promotion flow、Metadata を、翻訳前後で変えない。特に grilling の一問ずつ質問するプロトコル、decision-review と learning-review の Outcome 分類 token、event-storming の phase 非前進境界を保持する。

## 検証方法

Code Generation ではテスト実行結果を記録しない。

テスト実行と結果記録は B009 の Build and Test で行う（日本語残存 grep、`test:it:amadeus-templates` の RED→GREEN、`promote-skill` 同期確認。全体 `npm run test:all` は B006〜B009 の統合実行として記録）。

## 対象外

- templates、references、evals の英語化。
- #391、#393 の意味差分判断（B005）。
- Issue #399 の close 判断（B010）。
