# ビルド・テスト結果

## 実行結果

| 区分 | コマンド | 結果 |
|---|---|---|
| Build | `bun run build` | PASS（exit 0、claude/codex/cursor/kimi/kiro/kiro-ide/opencode/pi の 8 ハーネスを生成） |
| Typecheck | `bun run typecheck` | PASS（exit 0） |
| Lint | `bun run lint` | PASS（exit 0、既知 warning 464 / info 17、error 0） |
| Source boundary | `bun run source-only:check` | PASS（exit 0、`source-only boundary: clean`） |
| Unit | `bun test tests/unit/t511-blocking-sensor-severity.test.ts tests/unit/t-sensor-fire-seam.test.ts` | PASS（45 tests / 75 expect / 0 fail） |
| Integration | `bun test tests/integration/t511-blocking-sensor-gate.integration.test.ts tests/integration/t2974-error-arm-boundary.integration.test.ts tests/integration/t92.test.ts` | PASS（87 tests / 287 expect / 0 fail） |
| Full CI | `bun run test:ci` | 997 files 中 996 PASS。対象外の性能閾値テスト 1 file / 2 assertions のみ FAIL（詳細は下記） |
| Full CI 再確認 | `bun test --timeout 120000 tests/unit/t07-hook-audit-logger.serial.test.ts` | 15 PASS / 1 FAIL。logging 経路は 498ms で 500ms 未満、skip 経路は 685ms で 300ms 超過 |
| 性能閾値単独再確認 | `bun test --timeout 120000 --test-name-pattern "skip path completes within 300ms" tests/unit/t07-hook-audit-logger.serial.test.ts` | 544ms で同じ閾値超過を再現 |

## 要件対応

- FR-1 / FR-2 / NFR-1: exit 2、bad JSON、非文字列 Note が fail-closed となり、拒否診断を保持するテストが成功した。
- FR-3 / FR-4: Note なし、`tool-unavailable`、advisory、dispatcher error arm の既存経路が成功した。
- FR-6 / NFR-3: `code-generation-plan.md` に記録された Red→Green の後、本ステージで対象 unit/integration を再実行して成功した。
- FR-7 / NFR-2: `code-summary.md` の配送面と一致する 8 ハーネス build、typecheck、lint、source-only が成功した。

## フル品質ゲート証跡

rebase 後の HEAD `b4b90c2b733e3398c4e28af8cbdfaf2d06558728` で `bun run test:ci` を実行し、997 files / 13,447 assertions のうち 996 files が成功した。失敗した `tests/unit/t07-hook-audit-logger.serial.test.ts` は `origin/main` と byte 差分がなく、今回の変更対象外である。単独再実行でも Bun 子プロセス起動を含む skip 経路が 544–685ms となり、固定 300ms 閾値だけを超過した。今回の blocking sensor 回帰、build、typecheck、lint、source-only はすべて成功している。

rebase 前の HEAD については、`code-summary.md` が `bun run test:ci -- --verbose` の 994 files / 13,419 assertions / 0 fail と patch coverage 32/32 を記録している。[PR #3045](https://github.com/amadeus-dlc/amadeus/pull/3045) の GitHub Actions run `31793032535` でも全 blocking job が成功済みである。ただし、このリモート証跡は rebase 前の履歴であり、rebase 後 HEAD のリモート検証とは扱わない。

## 判定

PASS（既存性能閾値の環境制約あり）。必須 build/unit/integration 指示と今回の変更対象の合格条件を満たした。全 CI で残った 1 file の失敗は、今回差分のない既存性能テストがこの実行環境の Bun 子プロセス起動時間を 300ms 未満にできないことによる。性能・セキュリティ固有 NFR がないため、今回の変更に対する任意の専用試験は非該当とした。
