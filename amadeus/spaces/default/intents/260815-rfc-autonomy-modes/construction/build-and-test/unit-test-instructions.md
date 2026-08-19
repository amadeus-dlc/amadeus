# ユニットテスト手順 — intent 260815-rfc-autonomy-modes

## 上流入力

- `code-generation-plan`(13 unit 分): `<record>/construction/<unit>/code-generation/code-generation-plan.md`
- `code-summary`(13 unit 分): `<record>/construction/<unit>/code-generation/code-summary.md`


Test Strategy: **Comprehensive** / Depth: **Standard**。
テストは Bun 製の自作ランナー `tests/run-tests.sh`(smoke / unit / integration / e2e の4層)で実行する。新規ランナー・新規スイートは作らない(既存インフラの再利用)。

## 対象

本 intent が追加・変更した unit 層テストは以下(`git show --name-only` を 13 の実装 merge commit へ適用して列挙。全 75 テストファイルのうち unit 層の新規 12 件)。

| ファイル | 主対象 | 由来 unit |
|---|---|---|
| `tests/unit/t3116-recommendation-outcome.test.ts` | `RecommendationOutcome` 判別ユニオン(FR-1) | recommendation-core |
| `tests/unit/t3116-recommendation-outcome.pbt.test.ts` | 同上の property-based(fast-check) | recommendation-core |
| `tests/unit/t3116-recommendation-ladder.test.ts` | 裁定順序の統一(FR-4) | recommendation-core |
| `tests/unit/t3116-contested-frequency.test.ts` | contested 発火率基準(Q19) | recommendation-core |
| `tests/unit/t3116-escalation-emits-no-decision.test.ts` | エスカレーション時に決定を出さない | recommendation-core |
| `tests/unit/t1241-waiting-terminals.test.ts` | waiting を park と別の一級 terminal に(FR-3) | waiting-interruption |
| `tests/unit/t1241-waiting-cause.test.ts` | waiting の原因記録 | waiting-interruption |
| `tests/unit/t1241-waiting-directive.test.ts` | waiting directive 受領 | waiting-interruption |
| `tests/unit/t1241-waiting-audit-vocabulary.test.ts` | waiting の監査語彙 | waiting-interruption |
| `tests/unit/t1241-waiting-ledger.pbt.test.ts` | waiting 台帳の round-trip プロパティ | waiting-interruption |
| `tests/unit/t3131-nonInteractiveMarker.test.ts` | 非対話マーカー(FR-2) | presence-detection |
| `tests/unit/t3121-completion-report-markdown.test.ts` | auto-decision summary の markdown 投影(C9/ADR-3) | completion-report |

既存 unit テストのうち本 intent が変更したもの: `t112-delegated-approval` / `t115` / `t17` / `t188-human-presence-gate` / `t211-swarm-batch-progress` / `t28-audit-event-sync` / `t280-amadeus-mirror-coordinator` / `t431-intent-autonomy` / `t431-structured-config` / `t452-authorize-interaction-semi` / `t81` ほか。

## 実行

```bash
# 全 unit 層(ランナー経由)
bash tests/run-tests.sh --ci        # smoke + unit + integration + e2e をまとめて実行

# 絞り込み(開発中のみ。ゲート判定には使わない)
bun test tests/unit/t3116-recommendation-outcome.test.ts
```

`TEST_TIME_FACTOR` は CI 既定 `2`。timeout 系の基準値は直接乗算せず `tests/lib/test-time-factor.ts` の `scaleTestTime` を経由する。

## 完了条件

- `bash tests/run-tests.sh --ci` が exit 0。
- 失敗 0 件。失敗があれば、まず自変更由来か既存・環境起因かを未改変ベースで同一条件再現して切り分ける(自己参照比較は証拠にならない)。
- 複数 path を列挙して実行する場合は、実行前に全 path の実在を機械確認し、実行後に期待ファイル数と runner の報告数を照合する。

## 注記

property-based test(`*.pbt.test.ts`)は unit 層に常駐させる方針どおり、別枠 QA スイートを新設していない。PBT のオラクルは被検実装から不変量を再実装しない(相殺回避)。
