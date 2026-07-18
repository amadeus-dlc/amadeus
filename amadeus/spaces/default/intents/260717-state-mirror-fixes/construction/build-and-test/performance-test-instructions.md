# Performance Test Instructions — 260717-state-mirror-fixes

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(両 unit — fix-1170-retreat-guard / fix-1172-skip-denominator)

## 選定(build-and-test:c1 — 承認済み NFR への trace)

専用性能テストは**追加しない** — 反証可能根拠: 両 Bolt の性能 NFR(P-1/P-2 = ロック待ち有界性・ロック内最小 I/O、U2 P-1 = 線形走査)は既存機構の定数(withAuditLock 50×100ms)と diff 検分で担保され、実在する性能境界・SLO が存在しない(nfr-requirements の SLO 非設定判断を承継 — code-generation-plan.md 両 unit の検証列に性能退行の兆候なし)。戦略名だけで検査を機械追加しない(c1)。

## 代替担保

BR-3 並列 spawn テスト(integration)がロック競合時の完走(有界待ち)を実測している。
