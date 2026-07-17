# Build & Test Results — answer-evidence-sensor(Bolt 1)

上流入力(consumes 全数): `../answer-evidence-sensor/code-generation/code-generation-plan.md`・`../answer-evidence-sensor/code-generation/code-summary.md`

測定 ref: 本線 mirror 後 HEAD(mirror コミット 7edd8072b = bolt/922-answer-evidence-sensor head 669c82ff6 の content-identical 反映、bolt head は origin/main 3cefa07d2 へ rebase 済み)。実行日時: 2026-07-17T00:4xZ、実行者: e4(conductor、inline)。

## ビルド(exit code 実測)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun .claude/tools/amadeus-runner-gen.ts check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |

## テスト(件数は runner 出力からの転記)

| スイート | 結果 |
|---|---|
| `bash tests/run-tests.sh --ci`(フル) | **Test files: 365 / Failed files: 0 / Failed assertions: 0 / RESULT: PASS**(exit 0) |
| `tests/integration/t-answer-evidence-sensor.test.ts`(単独) | 20 pass / 0 fail(28 expect、exit 0) |

## 性能(P-1/P-2 — 比例選定)

- manifest 実測: `timeout_seconds: 5`・`matches: "**/*-questions.md"`(grep 確認)— 強制メカニズムと発火面限定は manifest 由来
- 新規テスト20件は 40ms 級で完走(ランナー予算内)

## セキュリティ(S-1〜S-3 — grep 実測)

| 検査 | ヒット数 | 判定 |
|---|---|---|
| fs 書込み API(writeFileSync/appendFileSync/mkdirSync/rmSync/renameSync) | 0 | PASS |
| ネットワーク・子プロセス・env 読取(fetch/node:http/node:net/spawn/execSync/process.env) | 0 | PASS |
| import 行の全数 | 2(node 系+`./amadeus-lib.ts` — 期待面のみ) | PASS |

## 落ちる実証(code-generation からの継承+本ステージ確認)

- 赤側: dist の failed() 反転注入で 5テスト赤 → 再生成復元 20 pass(code-generation で実測、注入 head 非残存)
- 白側: pass 4 reason+skip 2形をテスト内 fixture で恒久化(本ステージのフル CI で再実行 green)

失敗詳細: なし(Failed files 0)。
