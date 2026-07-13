# Interaction Spec — metrics-observation

## CLI verbs(既習の2値運用: 成功=exit 0 / 失敗=exit 1)

| verb | 挙動 | exit |
|---|---|---|
| `--write` | 全 collector 実行 → アトミックに snapshot 書き込み(temp→rename)→ OK 1行 | 0 / 1(失敗名明示・非生成) |
| `--check` | dry-run(全 collector 実行可能性の検証、書き込みなし) | 0 / 1 |
| (無引数) | usage を表示して exit 1(mutating 既定を作らない — scope-definition:c1 / no-help-probe-on-mutating-verbs の教訓: --help 相当は引数なしエラー出力で担う) | 1 |

## workflow との相互作用(FR-3)

1. main push → snapshot workflow 発火(concurrency: 直列、後着優先はしない — 各コミットに1 snapshot)
2. `--write` 成功 → `metrics/*.json` を GITHUB_TOKEN でコミット・push(非再トリガー前例)
3. `--write` 失敗 → workflow 赤(既存 CI 可視化経路で通知)
4. 冪等性: 同一コミットへの再実行は同値 snapshot を新ファイルで生成(captured_at が異なる)— 上書きなし

## エラー分類(error-classification 適用)

- collector 失敗 = fault(環境起因が主)→ loud fail・リトライなし(workflow 再実行で回復)
- 書き込み失敗 = fault → 同上。部分書き込みは temp→rename で構造的に不可能
