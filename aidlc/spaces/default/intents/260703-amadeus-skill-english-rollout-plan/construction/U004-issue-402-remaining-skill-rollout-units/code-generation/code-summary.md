# Code Summary：#402 残り展開単位

## 目的

Issue #402 の受け入れ条件に必要な、残り Amadeus skill の英語化単位、優先順位、検証コマンド、#391 から #394 との衝突回避をリポジトリ上で追跡できるようにした。

## 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `docs/amadeus/skill-englishization-rollout-plan.md` | 残り skill の英語化単位、優先順位、PR 分割、検証コマンド、preservation pass、衝突回避、#402 完了条件を追加した。 |
| `docs/amadeus/skill-language-policy.md` | 関連文書として展開計画へのリンクを追加した。 |
| `aidlc-state.md` | B003 完了、B004 開始、3.1 から 3.4 の skip、Code Generation 進行を記録した。 |
| `audit/audit.md` | B003 の `STAGE_COMPLETED` と `BOLT_COMPLETED`、B004 開始、3.1 から 3.4 の skip、Code Generation 開始を追記した。 |
| `construction/U004-issue-402-remaining-skill-rollout-units/code-generation/*` | Code Generation の計画、要約、memory を追加した。 |

## 対応した要求

| 要求 | 対応 |
|---|---|
| R001 | #402 を B004 として開始し、#401 の完了後に実行した。 |
| R002 | #402 の完了証拠は、B004 PR の merge または Issue #402 の明示的 close として後続で記録する。 |
| R004 | 残り skill の英語化単位、優先順位、検証コマンド、PR ごとの preservation pass を追加した。 |
| R005 | #395、#400、#401、#402 の完了証拠から #399 の完了判断へ接続できるようにした。 |

## 優先順位

| 優先 | Rollout Unit |
|---:|---|
| 0 | Representative foundation |
| 1 | AI-DLC v2 difference PRs |
| 2 | Core entrypoints and verification |
| 3 | Construction stage skills |
| 4 | Inception stage skills |
| 5 | Ideation stage skills |
| 6 | Supporting analysis and review skills |

## 検証

Build and Test で実行する。

Code Generation ではテスト実行結果を記録しない。

## 未完了

- B004 の Build and Test。
- B004 の Bolt PR 作成。
- PR merge または Issue #402 close による #402 完了証拠の確定。
- #399 完了判断。
