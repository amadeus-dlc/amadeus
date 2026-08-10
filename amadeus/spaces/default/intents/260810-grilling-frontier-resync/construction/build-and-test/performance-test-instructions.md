# Performance Test Instructions

**Intent**: 260810-grilling-frontier-resync / **Stage**: build-and-test (3.6) / **Test Strategy**: Comprehensive

上流入力(consumes 全数): `code-generation-plan.md` / `code-summary.md` / `pr-convergence-report.md`(各 Unit の実装実績と検証実測)、`unit-of-work.md`(U1/U2/U3 の完了条件)、`requirements.md`(FR/NFR の受け入れ基準 — 本書の適用判定の正本)、`bolt-plan.md`(Bolt ごとの検証列)。

## 判定: 適用可能な NFR が存在しない(専用試験を作らない)

`requirements.md` の NFR は **NFR-1(骨格の忠実性)/ NFR-2(配布同一性)/ NFR-3(既存契約の非破壊)** 系であり、**合否を決める性能数値目標(スループット・レイテンシ・資源上限)は1件も宣言されていない**。本 intent の変更面は (a) prose/protocol の文書、(b) advisory センサーの述語追加、(c) docs 投影 に限られ、常駐サービス・要求処理経路・データ量スケールを持たない。

したがって本書は**実体のあるベンチマークを作らない**。目標なきベンチマークは org.md Forbidden の検証劇場に当たり、一方で無言の省略は黙示の欠落になるため、非該当をここに明示する(cid:build-and-test:c2-no-test-theatre-for-absent-nfr / cid:build-and-test:c4)。

## 代替として実在する担保面

| 面 | 実体 | 位置づけ |
|---|---|---|
| センサー実行時間 | `amadeus-sensor.ts fire` の `Duration ms`(本 intent の実測: 49-52ms) | 監査へ記録される実測値。閾値契約は無い(advisory センサーであり workflow を止めない) |
| フルスイート実行 | `bash tests/run-tests.sh --ci` の完走 | 退行の検出面。時間目標は無い |

## この判定を覆すべき条件

将来 requirements に **数値目標を伴う性能 NFR**(例: センサー1回あたりの上限時間、questions ファイル行数に対する計算量契約)が宣言された場合、本書を実体のある試験へ差し替える。閾値を置く場合は**対象コーパスへ実述語を適用した観測レンジの内側**に置き、両側(観測最小値 < 閾値 < 観測最大値)を契約テストで固定する(cid:code-generation:c1-threshold-inside-observed-range)。
