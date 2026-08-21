# Unit Test Instructions — 260821-fmc-retirement

上流入力: `code-generation-plan.md`、`code-summary.md`(追補 2 = 回復テストの設計)。

## フレームワークと実行

- ランナー: `bash tests/run-tests.sh --ci`(smoke / unit / integration / e2e の 4 層)。単層・単ファイルは `bun test <path>`
- フル: `bun run test:ci -- -P 4`(CI と同等並列度)

## 本 intent の unit 層対象(退役の検証面)

| 対象 | コマンド | 期待 |
|---|---|---|
| Coverage gate 拡張(retained basis、ADR-7) | `bun test tests/unit/coverage-project-gate.test.ts` | 54 pass(retained/aggregate 同値境界・削除通過・残存劣化捕捉・mismatch fail-closed・絶対条件非干渉) |
| describeBasis 両分岐 + t113 追加分 | `bun test tests/unit/t113.test.ts` | pass(Patch gate 行 522 の被覆源) |
| O-5 代替(`PluginStageError` / `amadeus-log advisory-decision`) | 対応テスト(code-summary 参照、TDD Red→Green 済み) | pass、regen 後 registry で coveredBy 非空 |

## カバレッジ目標(Comprehensive)

- Project Coverage Gate: 絶対 ≥90% AND merge-base 相対 ≤0.02pp 低下(**retained basis** — 削除ファイルは baseline から除外、残存劣化・新規未被覆は捕捉。ADR-7)
- Patch Coverage Gate: 追加行の未被覆 0(allowlist は意味的セレクタ)
- ratchet: shrink-only(87→88 で保持)

## テストデータ

- 合成 fixture: `tests/fixtures/conformance-fixture-plugin/`(plugin.json + stage + sensor + tool + advisories の完全形)— FMC 実ディレクトリの代替。unit/integration 双方の供給源
- unit allowlist に filesystem/process を追加しない(medium test は integration 層へ — 本 intent でも glob テストを integration へ移設済み)
