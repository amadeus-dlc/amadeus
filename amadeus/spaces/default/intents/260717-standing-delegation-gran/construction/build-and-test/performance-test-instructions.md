# Performance Test Instructions — standing-delegation-grant

上流入力(consumes 全数): `../standing-grant/code-generation/code-generation-plan.md`、`../standing-grant/code-generation/code-summary.md`

## NFR 対応(P-1 / P-2)

- P-1(受理検証コスト): findActiveStandingGrant は intent 数×シャード数の grep 規模(実測数百 KB)— 専用ベンチは持たず、**強制メカニズム由来の上限**(gate-start/approve の同期実行が体感遅延なく完了すること)で判定する
- P-2(挿入分岐のオーバーヘッド): humanActedSinceGate false 後のフォールバック位置のため、グラント不在時は追加走査ゼロ(構造保証 — 実行順テストでピン)

## 実行と回帰検出

- 専用負荷試験は比例原則により**作成しない**(nfr-requirements の performance-requirements.md どおり: 単発 CLI 実行の停止ガードであり service SLO 非該当 — observability-setup:c3 と同型の整理)
- 回帰検出は full CI の wall-clock drift ガード(`tests/run-tests.sh --ci` 出力の `wall-clock drift: 0 file(s)` — 実測 0)を代用する
