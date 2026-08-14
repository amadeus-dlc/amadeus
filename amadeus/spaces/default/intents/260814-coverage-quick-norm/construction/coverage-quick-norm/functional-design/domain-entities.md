# Domain Entities — coverage-quick-norm

## InboxEntry
Learnings Inbox の1箇条。属性: 本文(日本語)、根拠(PR/Issue)、実測(コマンド・ref・値)、cid。

## AdvisoryApproximation
`coverage-patch-quick` の完了結果。exit 0。CI gate の正本ではない。

## BlockingCoverageGate
CI の Patch Coverage Gate と Project Coverage Gate。赤がマージを止める。

## FullCoverageRun
`bun run coverage:ci -- -P 4`。単独所有者。ゲート直前の最終確認に限る。
