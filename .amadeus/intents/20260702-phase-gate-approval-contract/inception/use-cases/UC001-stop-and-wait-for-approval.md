# UC001 Bolt 準備で停止して人間承認を待つ

## ユースケース

Agent が Bolt 準備で Task Generation Gate を `ready_for_approval` へ到達させ、停止して Maintainer の承認を待ち、承認を得てから `passed` にする。

## アクター

- ACT002 Agent
- ACT001 Maintainer

## 外部システム

- なし

## 事前条件

- 対象 Bolt の `tasks.md` が作成済みで、`taskGeneration.status` を更新できる。
- 対象 Intent の `state.json` を読み書きできる。

## 基本フロー

1. Agent は、Bolt 準備で `tasks.md` を実装へ渡せる粒度まで整え、`taskGeneration.status` を `ready_for_approval` にする。
2. Agent は、実装へ進まずに停止し、Maintainer に承認を求める。
3. Maintainer は、`tasks.md` と根拠成果物を確認し、承認または差し戻しを判断する。
4. 承認された場合、Agent は `taskGeneration.status` を `passed` にし、`evidence` へ `kind: approval` の項目を追加する。

## 代替フロー

| 条件 | 扱い |
|---|---|
| Maintainer が差し戻す。 | Agent は `tasks.md` を補修し、再び `ready_for_approval` にして承認を待つ。 |
| Maintainer が承認しない。 | `taskGeneration.status` は `ready_for_approval` のまま残り、実装へ進まない。 |

## 対応要求

- R001

## 未確認事項

- なし。
