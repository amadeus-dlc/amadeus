# Performance Design — metrics-observation

> NFR P-1〜P-3 の設計具体化。保証は層別に書く(nfr-design:c4 — 一枚岩の全称断定をしない)。

- **P-1(job timeout 5分)**: ci.yml の metrics-snapshot job に `timeout-minutes: 5` を宣言(U3)。保証機構 = GitHub Actions ランタイムの強制打ち切り。
- **P-2(PR クリティカルパス不変)**: 保証機構 = t222-ci-snapshot-wiring.test.ts の文字列アサート(ci-success.needs 非含有+if ガード存在+permissions)。**限界の明示**: 文字列検査は ci.yml の構造変更(job 改名・needs 書式変更)でメンテを要する(E-MO-NFR の e6 留保を設計注記として転記)— アサートは「行の存在」でなく「アンカー文字列の共起」で書き、偽陰性方向(検査が緩む)より偽陽性方向(構造変更で赤くなり人間が見る)へ倒す。
- **P-3(手動 10s)**: 統合テストの per-test timeout 10_000(t76 様式)。計測は CollectEnv 注入なしの実 collector で行う(実測であることが要件)。
