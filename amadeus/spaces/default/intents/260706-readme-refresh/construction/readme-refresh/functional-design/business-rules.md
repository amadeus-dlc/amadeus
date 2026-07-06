# Business Rules — readme-refresh

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 照合の規則

- BR-1: README の記載は実体を正とする。skill 名は `.claude/skills/` / `.agents/skills/` の実在、scope は `.agents/amadeus/scopes/` の実在、ステージ数と phase は `.agents/amadeus/tools/data/stage-graph.json`、script 名は package.json の scripts を正とする（Issue #535 の Maintainer 指定。requirements.md の上流の位置づけ）。
- BR-5: リンクは相対パスの実在とアンカーの解決可能性を機械検査し、broken 0 件を PR 説明に転記する（NFR-1）。検査スクリプトはコミットしない（C-1）。
- BR-6: README 以外のファイル（AMADEUS.md、docs/amadeus/**、CONTRIBUTING.md 等）で見つけた乖離は本 Intent で修正せず、leader へ報告して Issue 候補として扱う（C-1、Scope Discipline）。

## 記載の規則

- BR-2: 英語 README.md が正であり、README.ja.md は同一内容の対訳として同一 PR で更新する（`docs/amadeus/language-policy.md` の同期規約、FR-8）。
- BR-3: 個別 skill 名の網羅列挙は、将来の乖離再発を防ぐため正準一覧（`skills/amadeus/references/stage-catalog.md`）への参照に委ねる。README に列挙するのは役割分類と少数の代表・固定名（scope shortcut、ユーティリティ、補助入口）に限る（[requirements-analysis-questions.md](../../../inception/requirements-analysis/requirements-analysis-questions.md) の Q2、FR-4.3）。
- BR-4: 定義元のない規範的な記述は README に残さない（skill-forge 段落の削除。[requirements-analysis-questions.md](../../../inception/requirements-analysis/requirements-analysis-questions.md) の Q1、FR-7.4）。
