# Code Generation Plan：Inception stage skills 英語化

## 目的

RU004（Inception stage skills）として、`amadeus-inception-reverse-engineering`、`amadeus-inception-practices-discovery`、`amadeus-inception-requirements-analysis`、`amadeus-inception-user-stories`、`amadeus-inception-refined-mockups`、`amadeus-inception-application-design`、`amadeus-inception-units-generation`、`amadeus-inception-delivery-planning` の `SKILL.md` を英語化する。

Construction の入力成果物を作る phase として、stage 間の用語をまとめてそろえる。

## 実行境界

人間指示（PR #417 のリカバリ依頼、2026-07-03）により、B006〜B009 を単一リカバリ PR で実行する。

#391（reviewer 指定）と #393（sensor と Learn の写像）は未判断だが、本 Bolt は翻訳だけを行い意味を変えないため、後続判断と衝突しない。

## 変更対象

| 対象 | 変更内容 | 理由 |
|---|---|---|
| `skills/amadeus-inception-*/SKILL.md`（8 件） | 本文と frontmatter description を英語化 | Inception phase の語彙をそろえるため。 |
| `.agents/skills/amadeus-inception-*/SKILL.md` | `promote-skill.ts --replace` で昇格反映 | source skill と昇格先を同期するため。 |
| `dev-scripts/evals/amadeus-templates/check.ts` | `amadeus-inception-units-generation` の textContract needle を英語へ更新 | 契約検査を英語化後の本文と整合させるため。 |
| `examples/skill-provenance.json` | Inception 8 skill の entry に staleReason を追記 | real provider 再生成を後続 PR に送るため。md5 は書き換えない。 |

## 日本語維持

- templates 配下は変更しない。
- `未確認` リテラルと、生成成果物内の見出し名リテラルは保持する。

## Preservation Pass

Trigger boundary、Stage procedure、Artifact contract、Knowledge flow、Promotion flow、Metadata を、翻訳前後で変えない。特に units-generation の「トポロジだけを作る」境界を保持する。

## 検証方法

Code Generation ではテスト実行結果を記録しない。

テスト実行と結果記録は B008 の Build and Test で行う（日本語残存 grep、`test:it:amadeus-templates` の RED→GREEN、`promote-skill` 同期確認。全体 `npm run test:all` は B006〜B009 の統合実行として記録）。

## 対象外

- templates、references、evals の英語化。
- #391、#393 の意味差分判断（B005）。
- Issue #399 の close 判断（B010）。
