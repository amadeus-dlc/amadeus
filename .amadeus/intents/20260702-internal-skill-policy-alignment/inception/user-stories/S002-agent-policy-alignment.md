# S002: Agent の設定対象整合

## ストーリー

Agent として、README と暗黙起動ポリシー設定を同じ対象範囲で更新したい。

そうすることで、内部 skill の一覧と実行時の起動制御がずれないようにできる。

## アクター

- ACT002 Agent

## 対象要求

- R001
- R002
- R003
- R004

## 受け入れ状態

- README の Internal Skills 一覧を更新できる。
- 内部 skill と判定した対象に、暗黙起動ポリシーを適用できる。
- Codex と Claude Code の設定配置確認結果を残せる。

## 未確認事項

- Claude Code 側の同等設定が存在しない場合の記録先は Construction で確認する。
