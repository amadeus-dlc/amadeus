# 既存コード分析

## 対象コード

- `skills/amadeus-ideation/SKILL.md`
- `skills/amadeus-inception/SKILL.md`
- `skills/amadeus-construction/SKILL.md`
- `skills/amadeus-validator/SKILL.md`
- `.agents/skills/amadeus-ideation/SKILL.md`
- `.agents/skills/amadeus-inception/SKILL.md`
- `.agents/skills/amadeus-construction/SKILL.md`
- `.agents/skills/amadeus-validator/SKILL.md`
- `skills/amadeus-discovery/SKILL.md`
- `.agents/skills/amadeus-discovery/SKILL.md`
- `dev-scripts/evals/llm-templates/check.ts`
- `dev-scripts/evals/amadeus-templates/check.ts`
- `.amadeus/intents/20260701-skill-execution-reporting/ideation/scope.md`
- `.amadeus/intents/20260701-skill-execution-reporting/ideation/ideation.md`
- `.amadeus/domain-map.md`
- `.amadeus/context-map.md`

## 既存能力

- 公開 skill は、親 skill が成果物を直接作らず内部 skill へ委譲する境界を持つ。
- 公開 skill は、成果物作成後に `amadeus-validator` で構造を検証する流れを持つ。
- `amadeus-validator` は、成果物が実行時に参照できる最低限の構造条件を満たすかを `pass`、`fail`、`blocked` で報告する。
- `amadeus-validator` は、`pass` を gate 通過や内容承認として扱わないことを説明している。
- `amadeus-discovery` は、GitHub Issue、会話、docs 点検、validator 結果、example 検証、CI 結果を入力テーマとして整理できる。
- `dev-scripts/evals/llm-templates/check.ts` は、公開 skill と内部 skill の end-to-end 期待を持つ。
- `dev-scripts/evals/amadeus-templates/check.ts` は、skill テンプレートと昇格先成果物の構造契約を確認する。

## 統合点

- `amadeus-ideation`、`amadeus-inception`、`amadeus-construction` は、公開入口として実行中に見つけた問題や懸念の報告契約を置きやすい。
- `.agents/skills/amadeus-*` は配布先で参照されるため、source skill の更新後に昇格手順で同期する対象になる。
- `amadeus-validator` は、報告先そのものではなく、validator または evaluator 後段で検出すべき観点を報告項目へ渡す統合点になる。
- `dev-scripts/evals/llm-templates/check.ts` は、報告契約を skill 実行の期待として検証する入口になる。
- `dev-scripts/evals/amadeus-templates/check.ts` は、source skill と昇格先 skill に同じ文言構造が存在するかを確認する入口になる。

## ギャップ

- 公開 `amadeus-*` skill には、実行中に見つけた問題や懸念を現在の Intent に含めるか、後続 Issue 候補に切り出すかの共通判断基準がない。
- 報告内容の最低項目が skill 契約として定義されていない。
- 現在の Intent 成果物へ混ぜない問題を、会話だけで終わらせず、Issue 候補として提示する手順が共通化されていない。
- 新しい内部 skill を作る場合の起動条件と、各公開 skill へ共通節を置く場合の責務差が未整理である。
- validator または evaluator が検出すべき観点と、人間が判断すべき Issue 化の境界が明示されていない。

## リスク

- 実行中の懸念を現在の Intent に混ぜると、Intent の対象境界と traceability が崩れる。
- 軽い感想まで成果物化すると、Maintainer の判断対象が過剰になる。
- GitHub Issue を自動作成すると、人間の優先度判断を飛ばす可能性がある。
- 新しい内部 skill を先に作ると、公開 skill からの呼び出し条件が増え、最小変更で報告契約を共有する目的から外れる可能性がある。
- validator の `pass` を内容承認として扱うと、構造検証と内容判断の境界が曖昧になる。

## Inception への入力

- 要求は、報告先判断、対象分類、最低項目、人間承認、検証後段への接続に分ける。
- User Story は、Maintainer が現在の Intent と後続 Issue 候補を分けて判断できる価値として扱う。
- Use Case は、懸念検出、分類、報告、レビュー、後段検証候補化の相互作用として分ける。
- Unit は、報告契約の定義と、代表 skill への反映および検証に分ける。
- Bolt は、共通契約の文書化と、代表 skill と eval の整合確認に分ける。
- 初期 Construction slice では、新しい内部 skill を追加せず、公開 `amadeus-*` skill が共有する共通契約として始める。
- 内部 skill 化は、共通契約の重複や分岐が Construction で大きくなった場合の後続 Issue 候補にする。

## 証拠

- `skills/amadeus-ideation/SKILL.md`
- `skills/amadeus-inception/SKILL.md`
- `skills/amadeus-construction/SKILL.md`
- `skills/amadeus-validator/SKILL.md`
- `.agents/skills/amadeus-ideation/SKILL.md`
- `.agents/skills/amadeus-inception/SKILL.md`
- `.agents/skills/amadeus-construction/SKILL.md`
- `.agents/skills/amadeus-validator/SKILL.md`
- `skills/amadeus-discovery/SKILL.md`
- `.agents/skills/amadeus-discovery/SKILL.md`
- `dev-scripts/evals/llm-templates/check.ts`
- `dev-scripts/evals/amadeus-templates/check.ts`
- `.amadeus/domain-map.md`
- `.amadeus/context-map.md`
- commit `33d2a0b9aeb6ec37667ae91eaf7b0904de51a952`

## 鮮度

- analyzedAt: `2026-07-01T10:12:46Z`
- freshness: current

## 未確認事項

- 代表 skill の最小対象を `amadeus-ideation`、`amadeus-inception`、`amadeus-construction` の3つに留めるか、`amadeus-discovery` まで同時に含めるかは Construction で差分規模を見て確定する。
- evaluator 後段をどの eval に接続するかは、Construction の実装差分を見て確定する。
