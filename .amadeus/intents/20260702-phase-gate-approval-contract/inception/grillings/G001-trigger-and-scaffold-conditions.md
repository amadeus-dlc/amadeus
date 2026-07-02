# G001: grilling トリガーの判定形式と scaffold-only の許可条件

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [requirements.md](requirements.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | grilling 起動トリガーは、前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出しのうち「<現在 phase> で判断する」を含む項目が 1 件以上残っていれば `grill_required` と判定する。後続 phase へ送る未確定事項は「〜は <phase> で判断する。」の形で書く記録規約も同じ契約に含める。 | active | [requirements/R002-deterministic-grilling-trigger.md](requirements/R002-deterministic-grilling-trigger.md) | なし |
| GD002 | scaffold-only の許可条件は、GitHub Issue の確定判断、Grilling Decision Trail、Discovery Brief の確定済み判定と候補判断の 3 種への参照が入力に存在し、Ideation の判断項目がそこから導けることとする。 | active | [requirements/R003-scaffold-only-recorded-decisions.md](requirements/R003-scaffold-only-recorded-decisions.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: grilling 起動の決定論的トリガーが読む「前段成果物の未確定事項」の対象範囲と判定形式をどうするか。
- 確認が必要な理由: Requirement の中核であり、Unit の責務境界（どの成果物のどの見出しを読むか）に直結するため。
- 推奨回答: 前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出しのうち、「<現在 phase> で判断する」を含む項目が 1 件以上残っていれば `grill_required` とする。書き手側の記録規約も同じ契約に含める。
- 推奨理由: 既存成果物は既に「〜は Inception で判断する。」の形式で書かれており、新規規約なしで機械判定できる。文言を問わず全項目を対象にすると「Construction で判断する」項目でも Inception で grilling が起動し、過剰な質問になる。
- ユーザー回答: 推奨回答どおり採用する。

### Q002

- 確定判断: GD002
- 確認したいこと: `amadeus-ideation` の auto 判定で scaffold-only を許可する「確定判断の記録」として認める入力の種類と確認方法をどうするか。
- 確認が必要な理由: 迂回路を塞ぐ要求でありながら、認める記録の種類が狭すぎると正当な scaffold-only まで塞ぐため。
- 推奨回答: (1) GitHub Issue の確定判断、(2) Grilling Decision Trail、(3) Discovery Brief の確定済み判定と候補判断の 3 種とし、確認方法は入力にこれらへの参照が存在し、Ideation の判断項目がそこから導けることとする。
- 推奨理由: Grilling Decision Trail だけに限定すると、十分に確定した Issue 起点の作業でも毎回 grilling が必要になり、cycle 往復コスト削減という親 Issue #314 の目的と衝突する。例示のまま契約化すると「など」の解釈余地が残り、迂回路を塞ぐ目的に対して弱い。
- ユーザー回答: 推奨回答どおり採用する。
