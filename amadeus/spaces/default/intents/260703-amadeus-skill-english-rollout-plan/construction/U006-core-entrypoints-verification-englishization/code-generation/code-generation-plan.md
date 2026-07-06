# Code Generation Plan：Core entrypoints and verification 英語化

## 目的

RU002（Core entrypoints and verification）として、`amadeus`、`amadeus-steering`、`amadeus-validator` の `SKILL.md` を英語化する。

以後の stage skill 英語化が参照する単一公開入口、Space 初期化、検証の語彙を先にそろえる。

## 実行境界

人間指示（PR #417 のリカバリ依頼、2026-07-03）により、B006〜B009 を単一リカバリ PR で実行する。

#394 の Operation phase 境界判断は未完了だが、本 Bolt は翻訳だけを行い意味を変えないため、#394 の後続判断と衝突しない。#391〜#394 は B005 として open のまま残す。

## 変更対象

| 対象 | 変更内容 | 理由 |
|---|---|---|
| `skills/amadeus/SKILL.md` | 本文と frontmatter description を英語化 | 単一公開入口の語彙を先にそろえるため。 |
| `skills/amadeus-steering/SKILL.md` | 本文と frontmatter description を英語化 | Space 初期化の語彙を先にそろえるため。 |
| `skills/amadeus-validator/SKILL.md` | 本文と frontmatter description を英語化 | 検証の語彙を先にそろえるため。 |
| `.agents/skills/{amadeus,amadeus-steering,amadeus-validator}/SKILL.md` | `promote-skill.ts --replace` で昇格反映 | source skill と昇格先を同期するため。 |
| `dev-scripts/evals/amadeus-templates/check.ts` | `amadeus-validator` の textContract needle を英語へ更新 | 契約検査を英語化後の本文と整合させるため。 |
| `examples/skill-provenance.json` | 該当 entry に staleReason を追記 | real provider 再生成を後続 PR に送るため。md5 は書き換えない。 |

## 日本語維持

- 生成成果物と埋め込みテンプレート（validator の結果報告形式など）の日本語構造は保持する。
- `未確認` リテラルと、生成成果物内の見出し名リテラルは保持する。

## Preservation Pass

Trigger boundary、Stage procedure、Artifact contract、Knowledge flow、Promotion flow、Metadata を、翻訳前後で変えない。

## 検証方法

Code Generation ではテスト実行結果を記録しない。

テスト実行と結果記録は B006 の Build and Test で行う（`test:it:amadeus-templates` の RED→GREEN、日本語残存 grep、`promote-skill` 同期確認、全体 `npm run test:all` は B006〜B009 の統合実行として記録）。

## 対象外

- templates、references、evals の英語化（Skill Language Policy の日本語維持対象または対象外）。
- #391〜#394 の個別 close と意味差分対応（B005）。
- Issue #399 の close 判断（B010）。
