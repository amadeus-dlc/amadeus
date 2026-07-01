# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Inception の境界を固定する。 | 採用 | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | Unit のコンテキストとして BC001 自己開発運用を参照する。 | 採用 | D001 | [D002-bc001-self-development-governance.md](decisions/D002-bc001-self-development-governance.md) |
| D003 | Unit と Bolt を `dry-run` 契約と同期検証に分ける。 | 採用 | D001, D002 | [D003-unit-bolt-granularity.md](decisions/D003-unit-bolt-granularity.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Inception 成果物の対象境界を固定する判断であるため。 |
| D002 | D001 | 対象境界が確定してから既存 Bounded Context の参照を判断するため。 |
| D003 | D001, D002 | 境界とコンテキストが確定してから Unit と Bolt の粒度を判断するため。 |

## 採用した判断

- Issue #272 は、`amadeus-discovery dry-run` を読み取り専用 mode として定義する作業として扱う。
- Issue #259 は参照元として扱い、実作業対象にはしない。
- Issue #277 の `amadeus-history-review` と `amadeus-learning-review` は、`dry-run` の入力候補として扱う。
- `dry-run` は過去分析と学習分類を所有しない consumer として扱う。
- `dry-run` は `.amadeus/` 更新、GitHub Issue 作成、Intent Record 作成、`amadeus-ideation` 自動実行を行わない。
- Unit は U001 と U002 に分け、Bolt は B001 と B002 に分ける。
- すべての Unit は Domain Map の `BC001 自己開発運用` を参照する。

## 置き換えられた判断

なし。

## 再確認条件

- `dry-run` が過去分析または学習分類を直接所有する判断になった場合。
- `dry-run` が `.amadeus/` 成果物や GitHub Issue を作成する判断になった場合。
- `scaffold-only` を読み取り専用 mode として再定義する判断になった場合。
- text contract だけでは読み取り専用性を十分に検証できない場合。
