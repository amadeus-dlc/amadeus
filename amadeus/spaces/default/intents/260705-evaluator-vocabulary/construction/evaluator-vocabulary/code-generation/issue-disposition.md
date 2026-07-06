# Issue 対応方針 — unit: evaluator-vocabulary

## 対象 Issue

[#439](https://github.com/amadeus-dlc/amadeus/issues/439)

## close 提案

close を提案する。

R001〜R003 の対象範囲（team.md の判断基準行と検出境界節、validator SKILL の source/昇格先 2 箇所、eval fixture の追随更新、repo 全体の残存確認）をすべて実施した。
AC-1（実体のない evaluator を独立機構として指す記述が残っていない）、AC-2（分担記述が現行 sensors 基盤と整合している）、AC-3（promote 経由の同期で `npm run test:all` が pass する）は Step 5 の検証で確認済みである。

## 意図的な精緻化の記録

#439 の候補 1 は「evaluator への機械的な sensors 置換」という字面だった。

本 Intent では、この字面をそのまま適用しなかった。
sensors の `matches` glob（`.agents/amadeus/sensors/amadeus-required-sections.md` と `amadeus-upstream-coverage.md` の実際の設定）は Construction 設計成果物系の path だけを対象にし、PR 説明や team.md 自身は検査しない。
そのため、旧 evaluator 候補のうち「PR 説明の不足」「branch lifecycle の説明の矛盾」「後続確認先の欠落」は、実際の検出主体である PR レビュー（人間とレビューボット）へ帰属させた。
gate 時に stage 成果物を検査する候補だけを sensors へ帰属させた。

この帰属変更は、functional-design の業務ロジックモデルと業務ルールに事前記録済みであり、Step 1〜Step 3 の実装はその記録どおりに進めた。

## Skill Contract consumer role `evaluator` の改名要否

`skills/amadeus-validator/references/skill-contract.md` と `skills/amadeus-grilling/references/skill-contract.md`（source と昇格先の計 4 ファイル）、および `amadeus-contracts/catalog/skill-contract-consumer.ts` と `amadeus-contracts/catalog/skills.ts`、生成物 `amadeus-contracts/generated/skills.json` に定義された consumer role `evaluator` は、#240 の廃止機構とは別の生きた契約概念である。

本 Intent はこの role を変更しない。
requirements.md の R003 で「対象外（別概念・現行契約）」と判定済みであり、business-rules.md の変更禁止対象（Skill Contract）とも整合する。

この role 名を現行語彙（sensors、PR レビューなど）に合わせて改名すべきかどうかは、本 Intent のスコープ外の別議論として扱う。
改名する場合は、Skill Contract の consumer role 定義、catalog TS、生成物、双方の skill-contract.md（source と昇格先）を横断する変更になり、影響範囲の洗い出しと個別の Issue 化が必要になる。
