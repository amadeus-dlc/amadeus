# NFR Validation Matrix — eoc1-gate-check

## 上流入力(consumes 全数)

`../../construction/eoc1-gate-guard/nfr-design/performance-design.md`(O(n) 2KB)、`../../construction/eoc1-gate-guard/nfr-requirements/reliability-requirements.md`(RR-2)、`../../construction/build-and-test/build-test-results.md`、load-test-results.md、`../observability-setup/dashboards.md`(観測 N/A 根拠)。

| NFR | 検証 | 結果 |
|-----|------|------|
| SR-1〜3(読み取り専用・eval なし・パス固定) | reviewer 実装直読(CG 記録) | PASS |
| RR-1(fail-closed loud) | 変異注入3種+M-1/M-2 テスト | PASS |
| RR-2(規模 — 全行走査上限なし) | corpus 130ファイル実駆動 | PASS |
| RR-3(state 非破壊) | 拒否テストで checkbox 非遷移 assert | PASS |
| RR-4(OS 非依存) | 正規表現 ASCII+全角括弧のみ・join 使用(実装直読) | PASS(CI Linux で追認見込み — #1106 merged) |
