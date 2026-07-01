# 既存コード分析

## 対象コード

| 対象 | 種別 | 理由 |
|---|---|---|
| `README.md` | docs | Internal Skills 一覧の英語版を確認するため。 |
| `README.ja.md` | docs | Internal Skills 一覧の日本語版を確認するため。 |
| `skills/amadeus-*` | source skill | source skill 側の `amadeus-*` skill 構成を確認するため。 |
| `.agents/skills/amadeus-*` | 昇格先成果物 | 昇格済み skill 側の `amadeus-*` skill 構成を確認するため。 |
| `.agents/skills/skill-forge/references/openai_yaml.md` | 参照文書 | Codex の `agents/openai.yaml` と `policy.allow_implicit_invocation` の意味を確認するため。 |
| `.agents/skills/skill-forge/scripts/quick_validate.py` | 検証入口 | `policy.allow_implicit_invocation` の型検証が存在することを確認するため。 |
| `.agents/skills/skill-forge/agents/openai.yaml` | 設定例 | 既存の Codex metadata 配置例を確認するため。 |
| `CLAUDE.md` | agent 指示 | Claude Code 側の共通指示を確認するため。 |
| `package.json` | 検証入口 | validator、diff check、標準検証の入口を確認するため。 |

## 既存能力

- README には、Phase Skills、Cross-Cutting Support Skills、Internal Skills の分類がある。
- 現在の README の Internal Skills は `amadeus-grilling` と `amadeus-domain-modeling` だけを列挙している。
- `skills/` と `.agents/skills/` には同じ `amadeus-*` skill ディレクトリが存在する。
- `skill-forge` は Codex 向けの `agents/openai.yaml` を任意 metadata として扱う参照文書を持つ。
- `skill-forge` の参照文書は、`policy.allow_implicit_invocation` が `false` の場合に Codex の暗黙起動を抑えると説明している。
- `skill-forge` の `quick_validate.py` は、`policy.allow_implicit_invocation` が boolean であることを検証する。
- `package.json` は `validate:workspace`、`diff:check`、`test:all` を検証入口として持つ。

## 統合点

- README の Internal Skills 一覧は、内部 skill 判定結果を反映する入口である。
- `skills/amadeus-*` と `.agents/skills/amadeus-*` の対応は、source skill と昇格先成果物の差分確認入口である。
- Codex 向けの暗黙起動設定は、各 skill の `agents/openai.yaml` が配置候補になる。
- Claude Code 側の暗黙起動抑制に相当する設定は、既存ファイルからは確定できない。
- Inception では、Claude Code 側の設定有無を未確認事項として Construction へ渡す必要がある。

## ギャップ

- README の Internal Skills 一覧は、Issue #284 に列挙された内部 skill 群に追従していない。
- Issue #284 に列挙された内部 skill 以外にも、`amadeus-decision-review`、`amadeus-history-review`、`amadeus-learning-review` などの内部 skill が存在する。
- `amadeus-*` skill には、Codex 向けの `agents/openai.yaml` がまだ確認できない。
- Claude Code 側で `policy.allow_implicit_invocation = false` と同等の設定があるかは未確認である。
- `skill-forge` 監査と `SKILL.md` 英語化は、今回の Intent では対象外に分ける必要がある。

## リスク

- 内部 skill 判定を README だけで行うと、source skill と昇格先成果物の実態からずれる。
- Codex 向けの設定だけを追加すると、Issue #284 の「Claude Code も考慮する」条件が追跡できなくなる。
- `SKILL.md` 英語化は現行の日本語記述ルールと衝突するため、同じ Construction slice に混ぜると判断境界が曖昧になる。
- `policy.allow_implicit_invocation` の生成または配置方法を確認せずにファイルを作ると、skill-forge の strict validation と矛盾する可能性がある。

## Inception への入力

- Internal Skills 一覧は、公開入口 skill、横断的補助 skill、内部 skill の分類基準に従って更新する。
- 暗黙起動ポリシーは、内部 skill と判定した対象にだけ適用する。
- Codex 向けには `agents/openai.yaml` と `policy.allow_implicit_invocation` を設定候補にする。
- Claude Code 向けの同等設定は、Construction で確認する未確認事項として残す。
- `skill-forge` 内容監査と `SKILL.md` 英語化は、別 Intent 候補として扱う。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| GitHub Issue | [Issue #284](https://github.com/amadeus-dlc/amadeus/issues/284) | README 反映、暗黙起動設定、Codex と Claude Code 考慮の根拠。 |
| file | `README.md` | 英語版 Internal Skills 一覧。 |
| file | `README.ja.md` | 日本語版 Internal Skills 一覧。 |
| file | `skills/` | source skill の `amadeus-*` 構成。 |
| file | `.agents/skills/` | 昇格先成果物の `amadeus-*` 構成。 |
| file | `.agents/skills/skill-forge/references/openai_yaml.md` | `policy.allow_implicit_invocation` の参照説明。 |
| file | `.agents/skills/skill-forge/scripts/quick_validate.py` | `policy.allow_implicit_invocation` の型検証。 |
| file | `package.json` | 検証コマンド。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | `584db2d3694557187fa64e357c3a6f0ea6cb86cb` |
| analyzedAt | `2026-07-01T18:39:21Z` |
| freshness | current |

## 未確認事項

- Claude Code 側で内部 skill の暗黙起動を抑える同等設定が存在するか。
- `agents/openai.yaml` を `amadeus-*` skill へ追加する場合、source skill と昇格先成果物のどちらを生成元として扱うか。
- `skill-forge` の生成スクリプトを使う場合、生成結果の source hash と昇格手順をどう記録するか。
