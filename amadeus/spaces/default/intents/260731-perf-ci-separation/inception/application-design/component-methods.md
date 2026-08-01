# Component Methods — 260731-perf-ci-separation

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、stories(N/A — user-stories は本 scope(self-feature)の EXECUTE 集合で SKIP のため成果物不存在。ユーザー価値の導出は intent-statement 経由で requirements.md に固定済み)、team-practices(N/A — practices-discovery SKIP のため不存在。プラクティスは memory 層が ambient 適用 — requirements.md line 3 と同判断)

components.md の C-1〜C-7 の公開 seam・メソッド面。既存シンボルの引用は codekb(architecture.md / component-inventory.md の本 intent 節)の RE 実測、測定 ref = observed `da51af375`。

## C-1: run-tests.ts の変更 seam

| seam | 変更 | 契約 |
|---|---|---|
| `type Level`(:71) | `"perf"` 追加 | union 拡張のみ。既存4値の意味不変 |
| `ParsedArgs`(:74-87) | `runPerf: boolean` 追加 | 既定 false |
| `parseArgs`(:184-282) | `case "--perf":` 追加(runPerf=true、levelSelected=true)。`--all`/`--release` case へ runPerf=true 追加 | `--ci` case(:197-202)は**無変更**(FR-1b) |
| usage 文(:125 周辺) | `--perf` 行追加、`--ci` 説明は不変 | t05 が pin する既存文言を変更しない(FR-1d) |
| main フロー(:1161-1207) | perf 実行分岐を e2e 分岐(:1186-)と同型で追加: `runFilesPartitioned("perf", args.parallel, sizeCollector)` | perf は integration 同様 parallel 可(serial 強制は smoke/unit のみ :881 — 不変) |
| summary(`printSummary` :911-)| Tiers 表示へ perf を条件付き追加 | 既存プロファイルの出力 byte-identical(perf 非実行時は表示不変) |

TDD(NFR-3): 新規 unit テスト `tests/unit/t-run-tests-perf-tier.test.ts`(仮名)で (i) `--perf` が perf ディレクトリのみ選択 (ii) `--ci` が perf を含まない (iii) `--all` が含む — を parseArgs/levelFiles の in-process seam で Red→Green。

## C-2: 移設ファイルの公開面

- 分割新ファイルは元ファイルの `covers:` ヘッダを保持し、`// size: large`(spawn 支配)を正規 key で宣言
- 共有ヘルパ(`tests/helpers/lifecycle-transaction-benchmark-child.ts`、`guard-corpus-benchmark-child.ts`)は**無変更・無移動**(helpers はどの tier からも参照可能 — tier 走査は *.test.ts のみ :843-844)
- 残置側ファイルは perf describe 除去後も既存 covers: を保持(機能テストが同 unit を検証)

## C-3: perf.yml の job 面

| job | steps | timeout(実測導出 — NFR-2) |
|---|---|---|
| `perf-tests` | checkout → setup-bun(1.3.13)→ bun install --frozen-lockfile → `bash tests/run-tests.sh --perf` → test-size-report artifact upload(if always)→ 失敗時 STEP_SUMMARY | **25 min** — 導出: 2 × (per-test 上限の総和 250s(t258 新予算)+180s(t259 :121)+120s(t257 :260)+その他4面の実測余裕 ~60s + setup 実測 ~120s ≈ 730s ≈ 12.2min) ≈ 24.4 → 25 |
| `distribution-benchmark`(matrix 1-3) | ci.yml :224-253 の step 列移植 | **5 min** — 導出: 10 × max 実測 0.3min(main 成功 run 3 断面 30612356689 / 30610328352 / 30610135355 の replica job 実測 0.2〜0.3min、2026-07-31 gh api)= 3 → 最小慣例値 5 へ切上げ |
| `distribution-benchmark-aggregate` | needs 上記、:255-277 移植 | **5 min** — 導出: 10 × max 実測 0.2min = 2 → 同上 5 へ切上げ(現行 ci.yml は timeout 無宣言 — 移植時に新規付与) |

- `concurrency: group: perf, cancel-in-progress: false`(metrics-maintenance.yml の既習様式)
- 引用意味論の照合(citation-semantics-check): metrics-maintenance の GitHub App token は**移植しない** — perf.yml は書込を伴わない(checkout+実行のみ)ため既定 GITHUB_TOKEN 権限で足りる(意図的相違)

## C-4: ci.yml の削除面

- 削除 job 3: `distribution-benchmark` / `distribution-benchmark-aggregate` / `distribution-release-gate`
- `ci-success`(:648-659)の needs は不変(削除3 job はいずれも needs 非掲載 — RE 実測)

## C-5: timeout 定数

```
// Budget derivation (#1830 path A / #1835 cross-review, 22 CI sections):
// max observed = 122,147.12 ms (fail tail). budget = ceil(2 * max / 10^4) * 10^4
// = 250_000 ms (headroom ≈ 2.05x). t257 stays at 120_000 (measured 28.6 s = 24%).
}, 250_000);
```

## C-6: coverage 整合の操作列

1. `TEST_TIERS`(gen-coverage-registry.ts:600-605)へ `"perf"` 追加
2. `bun tests/gen-coverage-registry.ts --update`(または既存の再生成経路)→ `--check` green
3. 移設後の `coverage:ci` 実行 → `tests/coverage-project-gate.ts --update` で baseline 再カット(同一 PR)
4. `.coverage-patch-allowlist.json` の移設対象パスを新パスへ機械 remap → `coverage-patch-gate.ts --check` green

## C-7: docs 更新面(実装 Bolt 冒頭で grep 確定)

棚卸しキー(dual-key — cid:application-design:dual-key-consumer-inventory): 変数名/フラグ名(`--ci`、`--perf`、`test:ci`、`distribution:benchmark`)と展開後リテラル(`smoke + unit + integration`、`Intent Mirror benchmark` 等)の2系で grep。
