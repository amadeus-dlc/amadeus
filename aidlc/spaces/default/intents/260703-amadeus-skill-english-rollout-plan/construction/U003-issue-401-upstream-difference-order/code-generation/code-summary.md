# Code Summary：#401 AI-DLC v2 差分対応順序

## 目的

Issue #401 の受け入れ条件に必要な、#391、#392、#393、#394 の対応順序と PR 境界をリポジトリ上で追跡できるようにした。

## 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `docs/amadeus/aidlc-v2-difference-response-plan.md` | #391、#392、#393、#394 の対応順序、分類、PR 境界、検証コマンド、#401 完了条件を追加した。 |
| `docs/amadeus/skill-language-policy.md` | 関連文書として差分対応計画へのリンクを追加した。 |
| `aidlc-state.md` | B002 完了、B003 開始、3.1 から 3.4 の skip、Code Generation 進行を記録した。 |
| `audit/audit.md` | B002 の `STAGE_COMPLETED` と `BOLT_COMPLETED`、B003 開始、3.1 から 3.4 の skip、Code Generation 開始を追記した。 |
| `construction/U003-issue-401-upstream-difference-order/code-generation/*` | Code Generation の計画、要約、memory を追加した。 |

## 対応した要求

| 要求 | 対応 |
|---|---|
| R001 | #401 を B003 として開始し、#400 の完了後に実行した。 |
| R002 | #401 の完了証拠は、B003 PR の merge または Issue #401 の明示的 close として後続で記録する。 |
| R003 | #391、#392、#393、#394 の扱いを #401 の完了証拠として追跡できる計画文書を追加した。 |
| R004 | 各 Issue の PR が英語化だけか意味変更かを明確に説明する要件を追加した。 |

## 順序

| 順序 | Issue | 分類 |
|---:|---|---|
| 1 | #391 reviewer 指定の対応 | 意味変更の判断 |
| 2 | #393 sensor と Learn の写像 | 意味変更の判断 |
| 3 | #392 Build and Test の失敗時処理 | 意味変更の判断 |
| 4 | #394 Operation phase の対象外理由 | 境界の明確化 |

## 検証

Build and Test で実行する。

Code Generation ではテスト実行結果を記録しない。

## 未完了

- B003 の Build and Test。
- B003 の Bolt PR 作成。
- PR merge または Issue #401 close による #401 完了証拠の確定。
