# R004 直列実行との整合

## 要求

wave を使わない場合の従来どおりの直列実行が維持され、wave 契約が既存の Construction 契約（内部プロセスの順序、Task Generation Gate、finalization）と矛盾しない。

## 背景

wave 並行は複数 worktree と複数エージェントを前提にするため、単一 worktree での作業では従来どおりの直列実行が既定であり続ける必要がある。
既存の e2e eval（mock）は直列実行の契約を前提にしており、非破壊の確認が必要である。

## 受け入れ条件

- wave 並行を使う条件（依存のない Bolt が複数あり、worktree 分離で実行できる場合）と、使わない場合の既定（直列実行）が読める。
- 内部プロセスの順序（Functional Design → Bolt 準備 → 実装 → 検証 → finalization）は Bolt ごとに維持される。
- 既存の標準検証と e2e eval（mock）が pass を維持する。

## 依存

R001、R002、R003。

## 対応する対象境界

- SC-IN-002
- SC-OUT-004（対象外制約: 新しい phase やゲートを追加しない）

## 未確認事項

- e2e eval（mock）の期待出力への影響の有無は Construction で確認する。
