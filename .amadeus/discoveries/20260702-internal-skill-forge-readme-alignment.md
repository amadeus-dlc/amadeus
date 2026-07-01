# 内部 skill の skill-forge 確認と README 反映 Discovery Brief

## 入力テーマ

- [Issue #284](https://github.com/amadeus-dlc/amadeus/issues/284) の「amadeus 内部スキルの skill-forge 確認と README 反映を行う」。

## 確認した前提

- 入力元は GitHub Issue である。
- Issue #284 は、`amadeus-*` skill の `skill-forge` 確認、問題修正、`SKILL.md` の英語化、`README*.md` の Internal Skills 更新、内部 skill の `policy.allow_implicit_invocation = false` 設定を求めている。
- Issue #284 は、Codex だけでなく Claude Code も考慮することを求めている。
- 対象分類は Amadeus 実装である。
- 変更対象領域は skill、docs、eval、昇格手順である。
- `README.md` と `README.ja.md` の Internal Skills は、現時点で `amadeus-grilling` と `amadeus-domain-modeling` だけを列挙している。
- `.agents/skills/` と `skills/` には、Issue #284 の追加候補に含まれる内部 skill 以外に `amadeus-decision-review`、`amadeus-history-review`、`amadeus-learning-review` も存在する。
- Issue #284 は `SKILL.md` の英語化を求めているが、現行ルールは `.amadeus/**/*.md`、`skills/**/*.md`、`.agents/skills/**/*.md` を日本語で書くことを求めている。
- 既存 Discovery に同じテーマはない。

## 判定

multi_intent

## 判定理由

- Issue #284 は、skill 品質確認、問題修正、言語方針変更、README 一覧更新、暗黙起動設定の複数領域にまたがるため、単一 Intent として扱うには大きい。
- README の Internal Skills 一覧と現在の skill ディレクトリには差分があり、先に内部 skill の対象範囲を確定しないと、監査対象と設定対象が揺れる。
- `SKILL.md` の英語化は現行ルールと衝突するため、skill 監査や README 更新とは分けて判断する必要がある。
- 既存 Intent は内部 skill の一部追加、Skill Contract、Construction 内部 skill の案内補正を扱うが、Issue #284 全体を対象にしていない。
- 最初に進める候補は、後続の skill 監査と英語化の前提になる内部 skill の対象範囲と暗黙起動ポリシーの整合である。

## Intent Draft

該当なし

## Intent 候補

| 候補 | 状態 | Intent | 課題 | 成功状態 | 除外範囲 | 依存 |
|---|---|---|---|---|---|---|
| 内部 skill の対象範囲と暗黙起動ポリシーを揃える | intent_record_created | [20260702-internal-skill-policy-alignment](../intents/20260702-internal-skill-policy-alignment.md) | README の Internal Skills 一覧が現在の内部 skill 構成に追従しておらず、`policy.allow_implicit_invocation = false` を設定する対象も確定していない。 | 内部 skill として扱う対象が整理され、`README*.md` の Internal Skills と暗黙起動設定が同じ対象範囲を参照している。 | `skill-forge` による内容監査、`SKILL.md` の英語化、skill 本文の大規模修正は含めない。 | なし |
| `amadeus-*` skill を `skill-forge` で確認する | waiting | 未作成 | `amadeus-*` skill が `skill-forge` の観点で確認されておらず、Codex と Claude Code の両方で問題がないか未確認である。 | 確認対象、確認結果、修正要否、スコープ外判断が Issue コメントまたは PR 説明で追跡できる。 | README 一覧更新、暗黙起動設定、全 `SKILL.md` の英語化は含めない。 | 内部 skill の対象範囲を確定してから扱う。 |
| `SKILL.md` の言語方針を確定し、必要な英語化を行う | waiting | 未作成 | Issue #284 は英語化を求めているが、現行ルールは skill Markdown を日本語で書くことを求めている。 | 言語方針の変更要否が明示され、必要な場合は対象 `SKILL.md` と関連ルールが同じ方針を示している。 | skill の責務変更、README 一覧更新、暗黙起動設定は含めない。 | 内部 skill の対象範囲を確定し、言語方針の扱いを Ideation または Inception で確認してから扱う。 |

## 候補判断

- recommended は「内部 skill の対象範囲と暗黙起動ポリシーを揃える」である。
- この候補は、Issue #284 の後続作業で監査対象と設定対象を固定する前提になる。
- `skill-forge` 確認は、内部 skill の対象範囲が確定した後に扱う。
- `SKILL.md` の英語化は、現行ルールとの衝突を解いた後に扱う。

## 既存 Intent との関係

- [20260701-history-learning-review-skills](../intents/20260701-history-learning-review-skills.md) は、`amadeus-history-review` と `amadeus-learning-review` の追加を扱う既存 Intent である。
- [20260701-skill-contract-catalog](../intents/20260701-skill-contract-catalog.md) は、Skill Contract の生成参照を扱う既存 Intent であり、全 skill の一括適用は含めていない。
- [20260702-construction-internal-next-skill-parent-routing](../intents/20260702-construction-internal-next-skill-parent-routing.md) は、Construction 内部 skill の次工程案内だけを扱う既存 Intent である。
- Issue #284 は、これらの既存 Intent の単純な更新ではなく、新規 Intent 候補群として扱う。

## 推奨次アクション

- recommended 候補「内部 skill の対象範囲と暗黙起動ポリシーを揃える」を `amadeus-ideation` に渡す。
