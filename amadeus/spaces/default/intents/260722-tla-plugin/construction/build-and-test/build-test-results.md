# Build and Test 実行結果

上流入力(consumes 全数): 5ユニットの `code-generation-plan.md` と `code-summary.md`

実行基準時刻: 2026-07-24T21:52:04Z

## Build結果

| コマンド | 結果 | 証拠 |
|---|---|---|
| `bun run typecheck` | PASS | exit 0 |
| `bun run lint` | PASS | exit 0、265 warnings、20 infos、error 0 |
| `bun run dist:check` | PASS | 6/6 harness OK |
| `bun run promote:self:check` | PASS | 4/4 project-local harness OK |
| `git diff --check` | PASS | whitespace error 0 |

## Test結果

| コマンド | Total | Passed | Failed | Skip/注記 |
|---|---:|---:|---:|---|
| `bash tests/run-tests.sh --ci` | 515 files / 7,202 assertions | 515 / 7,202 | 0 / 0 | Claude substrate、AWS liveのみ環境skip |
| `bun run coverage:ci -- -P 4` | 515 files / 7,202 assertions | 515 / 7,202 | 0 / 0 | `coverage/lcov.info`生成 |
| focused plugin tests | 81 tests / 319 assertions | 81 / 319 | 0 / 0 | lifecycle/index/performance含む |
| final focused subset | 49 tests / 212 assertions | 49 / 212 | 0 / 0 | 最終同期後 |

## Coverage結果

- Project gate: 82.5295%、baseline 40.9395%、delta +41.5900pp、PASS。
- Patch gate: measured added 0 / covered 0 / allowlisted 0 / uncovered 0、PASS。
- coverage allowlistのstale 5件は現行コードの同一分岐へ再固定済み。

## Performance結果

- `INT-U2-PLUGIN-PERF`: baseline中央値3.50825ms、treatment中央値3.69600ms、追加率5.3517%、PASS。
- 独立process 10/10 PASS、worst 18.1337%（上限20%）。
- 1,000 stage capacity最大7.3796ms（上限10秒）、fixture 4,096,000 bytes（上限64MiB）。
- TLC run `30078685585`: 全6回NOT_DETECTED、最大spawn 161,861.957ms、最大CLI 161,986.744ms、container残留0。

## Security結果

- plugin trust/index/body drift、symlink、path containment、TOCTOU、redaction、TLC network/mount/digest、model-map atomic updateの回帰テスト: PASS。
- 禁止layout `plugins/*/plugins/*/stages`: 0件。
- `bun audit`: FAIL（High 3 / Moderate 8 / Low 1）。全件は変更されていないtransitive dependency chainで、本intentのdependency差分は0。release readinessをCONDITIONALとする。

## Failure詳細

機能・ビルド・テスト・coverageのfailureは0。初回full CIで検出した4 assertionsは機械ratchet未更新が原因で、正規generator実行後に対象80 tests / 1,260 assertionsと再実行full CIの双方がPASSした。

dependency auditの既存findingは未修正である。依存更新はplugin構造修復と異なる変更目的であり、本intentへ無断で同梱していない。
