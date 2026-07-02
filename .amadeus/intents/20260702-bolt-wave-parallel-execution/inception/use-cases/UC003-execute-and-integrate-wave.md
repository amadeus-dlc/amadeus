# UC003 wave を並行実行して統合する

## ユースケース

Agent が承認済みの wave 内の Bolt を worktree 分離で並行実行し、wave 完了時に統合と検証を行ってから次の wave へ進む。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- wave 内の Bolt の Task Generation が承認済み（`passed`）である。
- 対象 workspace に並行運用の判断基準（steering policy）がある場合は参照できる。

## 基本フロー

1. Agent は wave 内の各 Bolt を、Bolt ごとに分離した worktree で並行実行する。同一 worktree 内は直列のままにする。
2. wave 内の全 Bolt の実装と検証が完了したら、並行 branch を統合する。
3. 統合後に共有成果物を整合させ、標準検証を通す。
4. 検証の pass を確認してから、次の wave の Bolt 実行準備へ進む。

## 代替フロー

| 条件 | 扱い |
|---|---|
| wave 内の 1 つの Bolt の検証が失敗した。 | 失敗した Bolt を修正して検証を通すまで、wave の統合を完了させず、次の wave へ進まない。 |
| 統合で衝突が起きた。 | 対象 workspace の統合手順（追従、再生成、検証）に従って解消する。 |

## 対応要求

- R002
- R004

## 未確認事項

- なし。
