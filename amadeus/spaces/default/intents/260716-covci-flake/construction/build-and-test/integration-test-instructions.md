# Integration Test Instructions — 260716-covci-flake

## 上流入力(consumes 全数)

`code-summary.md`(能動再現3試行)、`code-generation-plan.md`(ハーネス設計)。

## 再現ハーネスの再実行手順(将来の reopen 時)

Issue #1085 クローズコメントの再捕捉手順(uptime 記録+tee 全文+PIPESTATUS 非経由 exit)を使用。scratch は repo 外(scratch-script-discipline)。
