---
name: amadeus-decision-review
description: >-
  Amadeus phase skill の起動時に、既存成果物と現在参照できる証拠から decision tree を再評価し、
  `amadeus-grilling` を起動すべきか、通常処理へ進めるか、構造補修へ戻すか、後続 Issue 候補として報告するかを判断する内部 skill。
  質問実行は行わず、必要な場合は `amadeus-grilling` への handoff を作る。
---

# amadeus-decision-review

## 目的

phase skill 起動時の意思決定を再確認する。

既存成果物、Issue、PR、作業ツリー、validator 結果、Skill Contract、信頼できる参照元を入力証拠として読み、判断ノードごとに次の処理分岐を選ぶ。

phase skill 起動時は、skill 供給元と実行環境の stage 前提も入力証拠として扱う。
source skill、昇格先成果物、host environment での利用可否を分けて確認する。
stage0、stage1、stage2、stage0 採用判断を確認し、stage2 を stage0 として扱う場合は人間による stage0 採用判断を証拠に含める。

この skill は判断ゲートである。
質問実行は `amadeus-grilling` に委譲する。

## 入力

- 対象 phase skill。
- 対象 Intent または成果物セット。
- 実行モード。
- ユーザー入力。
- 既存成果物。
- Issue、PR、作業ツリー。
- validator 結果。
- Skill Contract。
- 信頼できる参照元。
- skill 供給元と実行環境の stage 前提。
- source skill、昇格先成果物、host environment での利用可否。
- stage0、stage1、stage2、stage0 採用判断。

## 判断ノード

| ノード | 確認内容 | 主な入力 |
|---|---|---|
| DN001 | 対象 Intent または成果物セットを解決できるか。 | ユーザー入力、`aidlc/`、Issue |
| DN002 | phase gate または前段成果物が実行条件を満たすか。 | `aidlc-state.md`（Stage Progress、Phase Progress）、`audit/audit.md`、traceability、decisions |
| DN003 | skill 供給元と実行環境の stage 前提が成立しているか。 | source skill、昇格先成果物、host environment、stage0、stage1、stage2、stage0 採用判断 |
| DN004 | 既存成果物と現在参照できる証拠だけで判断できるか。 | 既存成果物、作業ツリー、Skill Contract |
| DN005 | 構造補修だけで解ける問題か。 | validator 結果、必須見出し、リンク、state |
| DN006 | 前段 phase または前段 stage の成果物不足が現在の成功条件を妨げているか。 | scope、requirements、acceptance、Bolt、Skill Contract、stage 前提 |
| DN007 | 現在 Intent の成功条件外の小さな課題か。 | scope、requirements、acceptance、Bolt |

## Outcome

| outcome | 用途 | 次の処理 |
|---|---|---|
| `grill_required` | 人間判断が必要で、既存成果物や作業ツリーだけでは解消できない。 | `amadeus-grilling` へ handoff する。 |
| `no_grill` | 既存成果物と現在参照できる証拠から判断できる。 | 通常処理へ進む。 |
| `repair_only` | 成果物構造の補修だけで解ける。 | 対象 phase skill の `repair` へ進む。 |
| `upstream_feedback_required` | 前段 phase または前段 stage の成果物不足、矛盾、粒度誤りが現在 Intent の成功条件を妨げている。 | 該当する phase skill または内部 stage skill へ戻す。 |
| `follow_up_issue_candidate` | 現在 Intent の成功条件外だが、後続 Issue 候補として扱える。 | 人間承認後に Issue 化する。 |

## 決定論的 grilling トリガー

phase skill 起動時の decision review では、次の決定論的トリガーを裁量判断より先に評価する。

前段 phase の必須成果物にある `未確定事項` と `未確認事項` 見出しのうち、「<現在 phase> で判断する」を含む項目が 1 件以上残っている場合は、outcome を `grill_required` とする。
該当項目は、呼び出し元 phase skill が `amadeus-grilling` の作法で一問ずつ確認する。

調査（既存成果物、実データの確認）で解消できる項目は、解消した根拠を記録すれば質問を省略できる。
残った項目だけを一問ずつ確認する。

この判定を成立させるため、後続 phase へ送る未確定事項は「〜は <phase> で判断する。」の形で書く。

## Grilling Handoff

`grill_required` の場合だけ、次を呼び出し元 phase skill へ返す。

- 一問。
- 確認理由。
- 推奨回答。
- 推奨理由。
- 反映先候補。
- 判断ノード。
- 根拠となる入力証拠。

`amadeus-decision-review` は質問を表示しない。
呼び出し元 phase skill が `amadeus-grilling` の質問作法に従って一問だけ質問する。

## 境界

所有するもの:

- 入力証拠の分類。
- 判断ノードの再評価。
- outcome の分類。
- `amadeus-grilling` へ渡す handoff 項目の選定。
- skill 供給元と実行環境の stage 前提確認。

所有しないもの:

- `amadeus-grilling` の質問作法。
- Grilling Decision Trail の配置変更。
- validator による内容承認。
- evaluator の品質評価。
- 既存 Intent 成果物の一括移行。
- host environment の自動検出。
- stage0 採用判断の自動化。
- GitHub Issue の自動作成。

## stage 前提確認

phase skill 起動時は、次の証拠を分けて確認する。

| 証拠 | 確認内容 | 不成立時の主な分類 |
|---|---|---|
| source skill | `skills/amadeus-*` に対象 skill または内部 skill が存在するか。 | `upstream_feedback_required` |
| 昇格先成果物 | `.agents/skills/amadeus-*` に source skill の内容が反映されているか。 | `repair_only` または `upstream_feedback_required` |
| host environment | 現在の実行環境で対象 skill を利用できるか。 | `upstream_feedback_required` |
| stage0 | 作業開始時点で build workspace から利用可能な skill、validator、開発用スクリプトか。 | `no_grill` または `upstream_feedback_required` |
| stage1 | target workspace にある作業中の source skill と検証結果か。 | `no_grill` または `repair_only` |
| stage2 | target workspace の昇格先成果物、example、validator がそろって通った状態か。 | `follow_up_issue_candidate` または `upstream_feedback_required` |
| stage0 採用判断 | stage2 を次回 stage0 として扱う人間判断があるか。 | `upstream_feedback_required` |

stage2 は stage0 採用判断なしに次回 stage0 として扱わない。
validator や CI の成功は stage0 採用判断の証拠候補であり、判断そのものではない。
配布対象 skill では、特定リポジトリの Issue 番号を前提にした説明ではなく、source skill、昇格先成果物、host environment、stage 前提の一般説明として扱う。

## 検証境界

validator の `pass` は、実行時に参照できる最低限の構造条件を満たすという意味であり、内容承認ではない。
evaluator の結果は品質評価であり、採用先は phase skill または人間判断で分類する。
Skill Contract は入力証拠と境界情報であり、decision review の結果そのものではない。

## 禁止事項

- 質問を実行しない。
- 複数の質問を並べない。
- Grilling Decision Trail の構造を変更しない。
- validator の `pass` を質問不要の根拠として単独採用しない。
- 現在 Intent の成功条件外の課題を、現在成果物へ混ぜない。
