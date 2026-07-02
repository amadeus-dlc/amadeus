# R002 wave 単位の実行と統合と検証の手順

## 要求

wave 単位の並行実行（worktree 分離）、wave 完了時の統合、検証、次の wave への進行の手順が Construction skill から読める。

## 背景

#334 の実装では、同一 worktree でのファイル競合と検証コマンドの競合を避けるために意図的に直列化しており、並行実行には worktree 分離を含む実行契約が必要という観察が得られている。
worktree 分離と同一 worktree での直列化、統合手順（追従、再生成、検証）は、対象 workspace の steering policy（並行運用の判断基準）として確立できることが分かっている。

## 受け入れ条件

- 同じ wave 内の Bolt を worktree 分離で並行実行し、同一 worktree 内は直列のままにする手順が読める。
- wave 内の全 Bolt の完了後に統合し、検証を通してから次の wave へ進む手順が読める。
- 対象 workspace に並行運用の steering policy がある場合はそれに従う、という一般形の参照になっている（特定 workspace の policy への固定参照ではない）。

## 依存

R001。

## 対応する対象境界

- SC-IN-002
- SC-IN-003
- SC-IN-004

## 未確認事項

- 手順の文言は Construction Functional Design で確定する。
