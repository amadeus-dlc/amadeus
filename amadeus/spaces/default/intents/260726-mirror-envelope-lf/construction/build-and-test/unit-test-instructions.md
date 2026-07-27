# Unit Test Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(fix-1498-envelope-lf)

## 対象テスト

`tests/unit/t272-amadeus-mirror-gateway.test.ts`(46 pass) — 実 gh 2.96.0 バイト列 fixture(採取コマンド記録済み)で parseHttpEnvelope の LF/CRLF 両対応・5 verb 経路・find のページ反復を検証。regression-first で修正前 10 fail を固定済み。

## 実行と落ちる実証

`bun test tests/unit/t272-amadeus-mirror-gateway.test.ts`。落ちる実証 = findLineEnd を CRLF 専用へ退行注入で 9 fail(PR #1537 本文に実測記録、復元は checkout 限定)。
