# Scope Definition 質問票

## 回答方法

Chat。上流の`intent-statement`で確認された「Issue記載を正本とし、抜け漏れ・矛盾以外はIssueどおりに実行する」という前提から回答案を作成した。新しい仕様は補っていない。

## Q1. 価値を届ける最小スコープは何か

**回答案:** [#2095](https://github.com/amadeus-dlc/amadeus/issues/2095)の汎用Loop Monitor Core、[#2096](https://github.com/amadeus-dlc/amadeus/issues/2096)のfirst-party Quality Repair Loop Plugin、[#2067](https://github.com/amadeus-dlc/amadeus/issues/2067)のIntent-scoped autonomy統合を、単一Intent内の独立検証可能な成果として順番に完成させる。#2067がblockerとする[#1717](https://github.com/amadeus-dlc/amadeus/issues/1717)は、現行5harnessに必要な共通live E2E policyとadapter capabilityだけを本Intentへ含め、Kiroを含むIssue全体は含めない。

## Q2. Must-haveとnice-to-haveは何か

**回答案:** 3件のIssueに明記された受け入れ条件はすべてMust-haveとする。Nice-to-haveは設けない。Issue本文の「対象外」「非目標」と、#2067のRelated / non-blockingはWon't-haveとする。ただし、受け入れ条件を成立させるために必要な既存contractとの接続はMust-haveである。

## Q3. capability間の依存関係は何か

**回答案:** #2095の内部contribution SPIとLoop Monitor contractを土台に、#2096が品質固有contributionを実装し、#2067が`semi` / `full`への自動有効化、grant、自動裁定、停止・再開UXへ統合する。#1672のEvent Registry / OTel射影は導入済み基盤として再利用する。#1717は5harness live verificationに必要な部分だけを#2067統合の検証前提とする。

## Q4. 実装順序の優先方針は何か

**回答案:** dependency-firstを採用し、`#2095 → #2096 → #2067統合`の順を維持する。各成果は独立検証可能にし、後続成果が前段の公開済みcontractだけへ依存するようにする。

## Q5. 固定期限はあるか

**回答案:** Issue本文に固定期限はない。時間・費用・再起動回数の上限は外部runner / schedulerの運用制約であり、grantや品質進捗判定へ混ぜない。

## Scope分析で維持する未決事項

Intent Captureで検出した9件は、Issue記載の抜け漏れ・矛盾としてbacklogへ残す。Scope Definitionでは解決案を創作せず、後続のRequirements Analysis / Application Designで承認済みcontractへ解消する。

## 確認

上記回答案を、Issueどおりに進めるためのScope Definition入力として確認する。

**leader 承認:** 2026-08-03T04:02:47Z（ユーザー回答「1」）

## 次回への追加学習

- **質問:** Anything to add for next time?
- **回答:** 追加なし（ユーザー回答「1」）
