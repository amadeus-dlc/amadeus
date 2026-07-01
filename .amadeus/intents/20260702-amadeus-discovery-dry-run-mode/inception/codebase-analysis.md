# 既存コード分析

## 対象コード

- `skills/amadeus-discovery/SKILL.md`
- `.agents/skills/amadeus-discovery/SKILL.md`
- `skills/amadeus-history-review/SKILL.md`
- `.agents/skills/amadeus-history-review/SKILL.md`
- `skills/amadeus-learning-review/SKILL.md`
- `.agents/skills/amadeus-learning-review/SKILL.md`
- `dev-scripts/evals/amadeus-templates/check.ts`
- `dev-scripts/promote-skill.ts`
- `.amadeus/intents/20260701-feedback-learning-loop/**`
- `.amadeus/intents/20260701-history-learning-review-skills/**`
- `.amadeus/domain-map.md`
- `.amadeus/context-map.md`

## 既存能力

- `amadeus-discovery` は、既存 Discovery と既存 Intent を確認し、課題粒度、重複、既存 Intent との関係、Intent 化方針を整理する skill として存在する。
- `amadeus-discovery` は、`guided`、`self-development`、`scaffold-only`、`repair` の mode を説明している。
- `amadeus-discovery` は、`dry-run` が `amadeus-history-review` の過去分析結果と `amadeus-learning-review` の学習分類結果を入力にできることを、入力境界として説明している。
- `amadeus-discovery` は、`dry-run` が `.amadeus/` 成果物を更新せず、GitHub Issue を作成せず、`amadeus-ideation` を自動実行しないことを説明している。
- `amadeus-history-review` は、`.amadeus/` の過去成果物を読み取り専用で分析し、後続候補を抽出する内部 skill として存在する。
- `amadeus-learning-review` は、過去分析結果や検証結果を学習先へ分類する内部 skill として存在する。
- `dev-scripts/evals/amadeus-templates/check.ts` は、`amadeus-discovery` の text contract として `dry-run` の入力境界を検出している。
- `dev-scripts/promote-skill.ts` は、source skill を昇格先成果物へ反映する入口として使える。

## 統合点

- `skills/amadeus-discovery/SKILL.md` の mode 説明に `dry-run` を追加し、既存の入力境界説明と接続できる。
- `dry-run` の出力項目は、Issue #272 の受け入れ条件と Ideation の `scope.md` から要求化できる。
- `dry-run` と `scaffold-only` の差分は、既存の `scaffold-only` 説明に対する読み取り専用 mode の説明として整理できる。
- `amadeus-history-review` と `amadeus-learning-review` は既に存在するため、`dry-run` は結果を入力にできる consumer として扱える。
- text contract は、`dry-run` mode、出力項目、副作用禁止、`scaffold-only` との差分を検出する観点へ拡張できる。

## ギャップ

- `amadeus-discovery` の `入力` と `実行モード` には、`dry-run` が mode として列挙されていない。
- `dry-run` が表示する入力テーマ、既存 Discovery との関係、既存 Intent との関係、Intent 候補、分類、根拠、未確認事項、判定案、推奨次アクションが、skill 本文の出力契約としてまだまとまっていない。
- `single_intent`、`multi_intent`、`existing_intent_update`、`research_only`、`no_intent`、`undecided` の判定案を `dry-run` が表示することが、mode 説明としてまだ明記されていない。
- `multi_intent` の場合に recommended 候補を1件示すことが、`dry-run` の出力契約としてまだ明記されていない。
- `dry-run` と `scaffold-only` の違いは Issue #272 にはあるが、skill 本文ではまだ mode 差分として十分に整理されていない。
- text contract は `dry-run` の入力境界を検出しているが、出力項目と `scaffold-only` 差分までは検出していない。

## リスク

- `dry-run` を `scaffold-only` と混同すると、候補確認だけの場面で Discovery 成果物を作成してしまう。
- `dry-run` が過去分析や学習分類を直接所有すると、`amadeus-history-review` と `amadeus-learning-review` の責務と重複する。
- `dry-run` が GitHub Issue 作成、Intent Record 作成、`amadeus-ideation` 自動実行を行うと、読み取り専用 mode の前提が崩れる。
- source skill と昇格先成果物の同期を手動で行うと、host environment で利用できる内容と target artifacts の追跡が弱くなる。
- validator の `pass` だけを内容承認として扱うと、構造検出と採用判断が混ざる。

## Inception への入力

- Requirement は、読み取り専用 mode、入力と出力、副作用禁止、過去分析と学習分類との consumer 境界、同期検証に分ける。
- User Story は、Maintainer と Agent が成果物を作る前に Intent 候補を確認できる価値として扱う。
- Use Case は、候補表示、過去分析と学習分類結果の利用、source skill と昇格先成果物の検証に分ける。
- Unit は、`dry-run` の候補表示契約と、source skill、昇格先成果物、text contract の同期検証に分ける。
- Bolt は、`amadeus-discovery` の `dry-run` mode 契約更新と、promote-skill と text contract による同期検証に分ける。

## 証拠

- `skills/amadeus-discovery/SKILL.md`
- `.agents/skills/amadeus-discovery/SKILL.md`
- `skills/amadeus-history-review/SKILL.md`
- `.agents/skills/amadeus-history-review/SKILL.md`
- `skills/amadeus-learning-review/SKILL.md`
- `.agents/skills/amadeus-learning-review/SKILL.md`
- `dev-scripts/evals/amadeus-templates/check.ts`
- `dev-scripts/promote-skill.ts`
- `.amadeus/intents/20260701-history-learning-review-skills/inception/codebase-analysis.md`
- `.amadeus/domain-map.md`
- commit `cd5a09337d7d2410e3fb81fc7e20fc9c90ba73df`

## 鮮度

- analyzedAt: `2026-07-01T16:53:37Z`
- freshness: current

## 未確認事項

- `dry-run` の出力を人間向け Markdown だけにするか、機械向け JSON も含めるかは Construction で確認する。
- `dry-run` が `amadeus-history-review` と `amadeus-learning-review` を直接起動するか、呼び出し元から結果を受け取るだけにするかは Construction で確認する。
- `dry-run` の読み取り専用性を eval でどこまで検出するかは Construction で確認する。
