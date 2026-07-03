# Discovered Rules：Amadeus skill 英語化実施計画

## ルール候補

| # | ルール | 昇格先候補 | 状態 |
|---|---|---|---|
| 1 | Issue #399 配下の子 Issue は #395、#400、#401、#402 の順序で扱う。 | `aidlc/spaces/default/intents/260703-amadeus-skill-english-rollout-plan/inception/requirements-analysis/requirements.md` | 提案 |
| 2 | 子 Issue の完了証拠は、対応 PR の merge または明示的な Issue close とする。 | `aidlc/spaces/default/intents/260703-amadeus-skill-english-rollout-plan/inception/requirements-analysis/requirements.md` | 提案 |
| 3 | #401 配下の #391〜#394 は #401 の完了証拠として追跡し、直接完了条件にしない。 | `aidlc/spaces/default/intents/260703-amadeus-skill-english-rollout-plan/inception/requirements-analysis/requirements.md` | 提案 |
| 4 | skill 英語化 PR では、翻訳変更と意味変更の境界を PR 説明に記録する。 | `aidlc/spaces/default/intents/260703-amadeus-skill-english-rollout-plan/inception/requirements-analysis/requirements.md` | 提案 |
| 5 | skill 変更では source skill と昇格先 skill を昇格フローで同期する。 | `aidlc/spaces/default/memory/team.md` | 承認済み |
| 6 | PR 作成前に対象 Intent の validator と `npm run test:all` を実行する。 | `aidlc/spaces/default/memory/team.md`、`aidlc/spaces/default/memory/project.md` | 承認済み |

## 昇格判断

新しい memory 昇格はこの stage では行わない。

既存 memory に記録済みの開発プラクティスを、Issue #399 の requirements へ具体化する候補として扱う。
