# Code Generation Plan：Construction stage skills 英語化

## 目的

RU003（Construction stage skills）として、`amadeus-construction-nfr-requirements`、`amadeus-construction-nfr-design`、`amadeus-construction-infrastructure-design`、`amadeus-construction-code-generation`、`amadeus-construction-build-and-test`、`amadeus-construction-ci-pipeline` の `SKILL.md` を英語化する。

代表 skill `amadeus-construction-functional-design` と同一構造の phase であり、B002 の英語化知見を直接再利用する。

## 実行境界

人間指示（PR #417 のリカバリ依頼、2026-07-03）により、B006〜B009 を単一リカバリ PR で実行する。

#392（Build and Test の失敗時処理差分）は未判断だが、本 Bolt は翻訳だけを行い意味を変えないため、#392 の後続判断と衝突しない。`amadeus-construction-build-and-test` の失敗時 halt-and-ask 挙動は翻訳前後で不変とする。

## 変更対象

| 対象 | 変更内容 | 理由 |
|---|---|---|
| `skills/amadeus-construction-{nfr-requirements,nfr-design,infrastructure-design,code-generation,build-and-test,ci-pipeline}/SKILL.md` | 本文と frontmatter description を英語化 | 代表 skill と同じ phase の語彙をそろえるため。 |
| `.agents/skills/amadeus-construction-*/SKILL.md` | `promote-skill.ts --replace` で昇格反映 | source skill と昇格先を同期するため。 |
| `examples/skill-provenance.json` | `amadeus-construction-code-generation` entry に staleReason を追記 | real provider 再生成を後続 PR に送るため。md5 は書き換えない。 |

## 日本語維持

- templates 配下は変更しない。
- `未確認` リテラルと、生成成果物内の見出し名リテラルは保持する。

## Preservation Pass

Trigger boundary、Stage procedure（checkbox、skip、resume、halt-and-ask）、Artifact contract、Knowledge flow、Promotion flow、Metadata を、翻訳前後で変えない。

## 検証方法

Code Generation ではテスト実行結果を記録しない。

テスト実行と結果記録は B007 の Build and Test で行う（日本語残存 grep、`test:it:amadeus-templates`、`promote-skill` 同期確認。全体 `npm run test:all` は B006〜B009 の統合実行として記録）。

## 対象外

- templates、references、evals の英語化。
- #392 の失敗時処理差分判断（B005）。
- Issue #399 の close 判断（B010）。
