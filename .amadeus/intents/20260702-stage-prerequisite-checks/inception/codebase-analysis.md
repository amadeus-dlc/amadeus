# 既存コード分析

## 対象コード

| 対象 | 種別 | 確認内容 |
|---|---|---|
| `skills/amadeus-decision-review/SKILL.md` | source skill | decision review の入力証拠、判断ノード、分岐分類を確認した。 |
| `.agents/skills/amadeus-decision-review/SKILL.md` | 昇格先成果物 | host environment で使う decision review の現状を確認した。 |
| `skills/amadeus-decision-review/references/skill-contract.md` | Skill Contract | decision review の事前条件、不変条件、事後条件、feedback 条件を確認した。 |
| `skills/amadeus-ideation/SKILL.md`、`skills/amadeus-inception/SKILL.md`、`skills/amadeus-construction/SKILL.md` | source skill | phase skill 起動時の decision review 参照を確認した。 |
| `.agents/skills/amadeus-ideation/SKILL.md`、`.agents/skills/amadeus-inception/SKILL.md`、`.agents/skills/amadeus-construction/SKILL.md` | 昇格先成果物 | host environment で使う phase skill の現状を確認した。 |
| `dev-scripts/amadeus-contracts.ts`、`dev-scripts/evals/amadeus-contracts/check.ts` | 開発用スクリプト | Skill Contract の生成と確認入口を確認した。 |
| `dev-scripts/evals/amadeus-templates/check.ts` | eval | phase skill 文書や分類語彙を text contract として確認する入口を確認した。 |
| `.amadeus/steering/policies.md`、`.amadeus/glossary.md` | steering layer | stage0、stage1、stage2、stage0 採用判断、workspace 分離の方針を確認した。 |

## 既存能力

- `amadeus-decision-review` は、既存成果物、Issue、PR、作業ツリー、validator 結果、Skill Contract、信頼できる参照元を入力証拠として扱える。
- `amadeus-decision-review` は、`grill_required`、`no_grill`、`repair_only`、`follow_up_issue_candidate` に分岐できる。
- phase skill は、起動時の判断材料として `amadeus-decision-review` を参照している。
- Skill Contract は、事前条件、不変条件、事後条件、読み取り境界、書き込み境界、委譲、feedback 条件を表現できる。
- steering layer は、source skill、昇格先成果物、host environment、stage0、stage1、stage2、stage0 採用判断を分けて扱う語彙を持つ。
- eval は、phase skill 文書に必要な分類語彙や説明が含まれることを確認する入口を持つ。

## 統合点

- `skills/amadeus-decision-review/SKILL.md` と `.agents/skills/amadeus-decision-review/SKILL.md` に、stage 前提確認の判断ノードを追加できる。
- `skills/amadeus-decision-review/references/skill-contract.md` に、skill 供給元と実行環境の stage 前提を入力証拠として追加できる。
- `skills/amadeus-ideation/SKILL.md`、`skills/amadeus-inception/SKILL.md`、`skills/amadeus-construction/SKILL.md` に、phase skill 起動時の確認観点を追加できる。
- Skill Contract 生成物と eval に、source skill、昇格先成果物、host environment の区別を確認する観点を追加できる。
- steering layer の stage 方針を、配布対象 skill では Issue 番号に依存しない一般例として参照できる。

## ギャップ

- decision review の判断ノードは、skill 供給元と実行環境の stage 前提を明示的な入力証拠として扱っていない。
- source skill、昇格先成果物、host environment での利用可否を、phase skill 起動時に区別して確認する項目が不足している。
- stage2 を次回 stage0 として扱うには stage0 採用判断が必要であることを、phase skill 起動時の前提確認として明記できていない。
- 前提不成立を `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` へ分ける条件が、stage 前提確認の文脈で不足している。
- repo 内 Issue 番号を代表例として使う説明と、配布対象 skill に入れる一般化説明の境界が明記されていない。

## リスク

- stage 前提確認を phase skill だけに書くと、Skill Contract や eval の確認対象から漏れる。
- Skill Contract だけに書くと、phase skill 起動時の実行順序として読まれにくい。
- repo 内 Issue 番号を配布対象 skill の一般説明に混ぜると、ユーザー環境で参照できない前提が生まれる。
- source skill と昇格先成果物の同期を、host environment での利用可否と同じ状態として扱うと、前提不成立を見落とす。

## Inception への入力

- 要求は、skill 供給元の証拠、stage 前提確認、decision review と Skill Contract の配置、前提不成立分類、repo 内代表例の扱いに分ける。
- Unit は、stage 前提確認の入力証拠契約と、前提不成立時の分類および配布対象 skill 境界に分ける。
- Bolt は、decision review の判断ノード、Skill Contract と phase skill 反映、分類と代表例の境界確認に分ける。
- Construction では、source skill と昇格先成果物の両方を更新し、昇格は `dev-scripts/promote-skill.ts` を使う。
- Construction では、配布対象 skill に repo 内 Issue 番号前提の説明が混入しないことを eval または text contract で確認する。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| file | `skills/amadeus-decision-review/SKILL.md` | decision review の現状確認。 |
| file | `.agents/skills/amadeus-decision-review/SKILL.md` | host environment で使う decision review の現状確認。 |
| file | `skills/amadeus-decision-review/references/skill-contract.md` | decision review の Skill Contract 確認。 |
| file | `dev-scripts/amadeus-contracts.ts` | Skill Contract 生成入口の確認。 |
| file | `dev-scripts/evals/amadeus-contracts/check.ts` | Skill Contract 確認 eval の確認。 |
| file | `dev-scripts/evals/amadeus-templates/check.ts` | phase skill 文書確認 eval の確認。 |
| file | `.amadeus/steering/policies.md` | stage と workspace 方針の確認。 |
| file | `.amadeus/domain-map.md` | Unit の参照先 Bounded Context の確認。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | `9698f0c584e12cc6eabc4d7ced0290fe0c16b257` |
| analyzedAt | `2026-07-01T15:14:57Z` |
| freshness | current |

## 未確認事項

- Construction で追加する eval を `amadeus-contracts` 側に寄せるか、`amadeus-templates` 側に寄せるかは Functional Design で確定する。
