# RE Developer Code Scan — 260726-t258-p95-flake (Issue #1511)

read-only scan。base=`f9a0fb86a`(直前 intent 260726-mirror-state-split observed、祖先)→ observed=`09c669901`(現 HEAD 実測)。

## 0. 差分リフレッシュ区間(実測)

- `git rev-list --count f9a0fb86a..HEAD` = **2**。
- `git diff --name-only f9a0fb86a HEAD` = **32ファイル全て `amadeus/` 配下**(codekb 差分リフレッシュ + 260726-mirror-state-split record + `intents.json` + `memory/project.md`)。source/test/CI ファイルの変更は区間内に **ゼロ**。
- 対象面(`tests/`, `packages/`, `.github/`)は base 時点から不変 → RE は本 intent の実装面を現 HEAD で直読して確定した。

## 1. t258 の構造と絶対予算 assert

ファイル: `tests/integration/t258-lifecycle-transaction.test.ts`(467行、`// @test-size medium` :2)。

- **性能契約テスト本体**: `describe("intent lifecycle transaction performance contract")` :435-467、単一 test `"records 100-child p95 and paired incremental RSS with provenance"` :436、timeout `120_000`(:466)。
- **被測定の回し方**: warmup 10ラウンド(archive/recovery/noop 各1、:437-441)→ 本測定 archive×100 / recovery×100 / noop×100(:442-444)。各 `benchmarkChild(mode)` は `spawnSync` で child helper を **1プロセス起動**(:422-428)。
- **p95 集計**: `p95()` :430-433 は nearest-rank `sorted[Math.ceil(len*0.95)-1]`。len=100 なら `sorted[94]`(95番目)。→ 上位5サンプルが予算超過しても pass、**6件以上超過で初めて fail**。
- **絶対予算 assert(問題箇所、verbatim)**:
  - :461 `expect(result.archiveP95Ms).toBeLessThanOrEqual(500);`
  - :462 `expect(result.recoveryP95Ms).toBeLessThanOrEqual(750);`
  - :463 `expect(result.rssDifferenceP95MiB).toBeLessThanOrEqual(96);`(RSS は noop 差分ベース、下記)
- **provenance 出力行**: :460 `console.log(\`LIFECYCLE_TRANSACTION_BENCHMARK ${JSON.stringify(result)}\`);`。`result` は samples/warmups/archiveP95Ms/recoveryP95Ms/rssDifferenceP95MiB/fixtureSha256/gitSha/bunVersion/runnerImage/cpuModel(:448-459)。
- **RSS だけが baseline 相対**: :445-447 `rss = archive.map((s,i) => Math.max(0, s.rssDeltaBytes - noop[index].rssDeltaBytes))` — RSS は archive と noop の **差分** p95。**latency(archive/recovery)は baseline 相対でなく素の絶対値**。これが本欠陥の核。
- **タイミングシームの有無**: なし。予算は `500`/`750` のハードコード数値(named constant でも env でもない)。child 内 elapsed も `performance.now()` 実測のみで短縮シーム不在。

## 2. 被測定実装(archive/recovery が何のコードか)

child helper: `tests/helpers/lifecycle-transaction-benchmark-child.ts`(引数 `size mode`、本測定は size=**10000**)。

- fixture: registry 10,000行 + audit 10,000 SESSION_STARTED 行 + 1 HUMAN_TURN を tmpdir に実 FS 書き込み(:44-49 相当)。
- **被測定コード**(elapsed 計測区間 = `started`〜`elapsedMs`):
  - `mode!=="noop"` のとき `withIntentLifecyclePreflight(projectDir, "default", append, cb)` を呼ぶ。
  - archive: cb 内 `recovery.kind==="none"` なら `runIntentLifecycleTransactionLocked(context, intentDir, "archive", "benchmark", append)`。
  - recovery: 事前に `.amadeus-intent-status-transaction.json`(FFF journal, auditCommitted/registryCommitted/cursorCommitted 全 false)を書いておき、`withIntentLifecyclePreflight` が journal を検出して前進回復する経路。
  - noop: preflight を呼ばず measure だけ(RSS/latency の baseline)。
- 実体は `packages/framework/core/tools/amadeus-lib.ts` の `withIntentLifecyclePreflight` / `runIntentLifecycleTransactionLocked`。処理内容は **10,000行 registry の read/parse + 10,000行 audit の read + lock 取得 + audit/registry/cursor の durable write**。→ CPU よりも **FS I/O 律速**。CI 共有ランナーの IO 競合でスパイクしやすい。
- **決定的検証(counter/round)への置換可能性**: latency は「10,000-entry O(n) を実時間で測る」構造。project.md `cid:build-and-test:bt-timeout-verification-shape` / `cid:build-and-test:wtfbt-c3`(タイミングシームでの決定的検証優先)が適用候補だが、archive/recovery は round 数のような離散量でなく実 I/O 経過時間なので、**counter 化より baseline 相対(noop 比)+ noise floor 化**が同型先例に整合(§3)。事実確定に留め、方式選定はしない。

## 3. 予算導出の根拠(500/750 はどこから来たか)

- **導入コミット**: `2e157d7fe`「archived intent statusと誤resume防止を導入 (#1424)」。500/750/96 は t258 追加と同一コミットで導入(`git log -S "archiveP95Ms"` / `-S "toBeLessThanOrEqual(500)"` とも 2e157d7fe のみ)。導入時からコメント/rationale なしの裸マジックナンバー(現行も :461-463 に説明コメントなし)。
- **決定の出所**: intent 260723-archived-status-guard の nfr-requirements。audit `j5ik2o-mac-studio-lan-add286b804a1.md`:
  - :12910 `**Decision**: lifecycle-transaction latency budget` / :12911 `**Options**: 500ms/750ms,1s/2s,N/A,Other` / :12925 `**Details**: 1 — archive/unarchive p95 500ms、3-step recovery p95 750ms`。
  - → **ユーザーが選択肢 A(500/750)を選んだ round-number 予算**。CI ジッタや noise floor から導出されたものでは **ない**。
  - `construction/lifecycle-transaction/nfr-requirements/nfr-requirements-questions.md:19` A案(推奨)= 500/750、B案 = 1s/2s。
- **実測との乖離**(同 intent code-summary):
  - `construction/lifecycle-transaction/code-generation/code-summary.md:25`「最終full CI実測: archive p95 **41.177ms**(上限500ms)、FFF recovery p95 **29.314ms**(上限750ms)、noop差分RSS p95 **45.984MiB**(上限96MiB)」。
  - → 予算 500/750 は実測 p95 の **約12〜25倍**。ヘッドルームは広いが、**絶対 ceiling** のため CI 負荷スパイク時に個別サンプルが容易に 500ms を跨ぎ、6件/100 超で fail する。

## 4. フレーク機序(#1511 実測と整合)

- Issue #1511 本文(実測): main push run 30193617264 で t258 と plugin discovery gate の2件 failure、`--failed` 再実行でも片方再発。PR #1504 の diff は t258 コード/テストと **非交差**、同 PR の pull_request run はフル green → **共有ランナー負荷依存の相対タイミング契約クラス**(fanout-load-settle-before-integration / rerun-red-reattribution 準拠で帰属)。類例 30185062036(#1493)。
- 機序: child 内 elapsed は transaction のみ(spawn は含まない)だが、10,000行 I/O が `bun run test:ci -- -P 4`(§5)の**並列4テスト同時実行**下で IO/CPU 競合しスパイク。絶対 ceiling 500/750 に対し nearest-rank p95(top-5 許容)を **6件以上**が超えると偽赤。ラベル bug/P2/S3-MAJOR(可視赤・回避策=再実行・機能影響なし)。

## 5. t258 の宣言 size と CI 実行面

- size: `// @test-size medium`(:2)。配置 `tests/integration/`。
- CI: `.github/workflows/ci.yml:162` `- name: Tests - smoke + unit + integration` → `run: bun run test:ci -- -P 4`。`package.json:19` `"test:ci": "bun tests/run-tests.ts --ci"`。→ **integration tier に含まれ、単一 CI ジョブ内で並列度4で走る**(専用 perf ジョブ・リトライ・負荷分離は無し)。

## 6. 同型先例(修正様式の参照点)

### (a) `tests/lib/plugin-discovery-overhead-gate.ts`(#1525 の fix、PR #1535、現在の tree に実在・3723 bytes)
- **予算述語を計測ループから分離**して in-process 駆動可能に(コメント :1-11:「the integration test can only exercise whatever the host happens to produce」がフレーク源)。
- **SHAPE = 相対比 AND 絶対 noise floor**: `exceedsDiscoveryOverhead(baseline, treatment)` = `additionalMs/baseline > DISCOVERY_OVERHEAD_RATIO_LIMIT(0.2)` **AND** `additionalMs > DISCOVERY_OVERHEAD_NOISE_FLOOR_MS(10)`。
- noise floor 導出をコメントで実測 provenance 付き(worst jitter excursion 0.338102 × CI baseline median 12.896ms = 4.36ms → 10ms は ~2.3x で scheduler noise 到達不能)。
- **fail-closed**: `if (!(baseline>0) || !Number.isFinite(treatment)) return true;`。
- `median()` は長さ非依存(旧 inline は sorted[4]/sorted[5] 固定で 10 件以外で別 quantile を返した — 教訓コメント :43-45)。

### (b) `scripts/mirror-distribution-benchmark-aggregate.ts`(#1507、94行)
- `DISPERSION_NOISE_FLOOR_FRACTION = 0.05` / `DISPERSION_RATIO_LIMIT = 2`。「ratio は絶対 spread が予算の5%未満のとき無意味」。
- `exceedsDispersionLimit(values, p95BudgetMs)` = `max/median > 2` **AND** `median/min > 2` **AND** `absoluteSpread > p95Budget*0.05`(3条件 AND)。単一スパイク replica 単独では落ちない(median 基準)。
- 権威判定は `median(p95) > budget`(:74)。**median 基準**でスパイク耐性、絶対 budget は median にのみ適用。

両先例の共通原則: **絶対 ceiling 単独をやめ、(median/baseline 基準)AND(絶対 noise floor)の複合述語にし、判定述語を計測ループから分離して in-process テスト可能にする**。t258 は latency に既に noop baseline を測っている(RSS 差分用、:444/:445-447)ので **archive/recovery も noop 相対に転用できる素材が既存**(事実。方式は設計段で裁定)。

## 7. same-root inventory(cid:code-generation:same-root-inventory)

同型の絶対-p95 assert を全数棚卸し(`grep -rn "P95Ms).toBeLessThanOrEqual" tests/`):
- **`tests/integration/t257-status-registry-migration.test.ts:240-241`**: `strictReadP95Ms<=100` / `migrationP95Ms<=250` — **t258 と同一の絶対-p95-vs-CI-jitter 形状**(同じ #1424 intent 由来、同じ 10,000-entry child benchmark)。#1511 では未報告だが同根。修正 or Issue 化の候補として architect へ申し送り。
- `tests/integration/t259-guard-integration.test.ts:209/211`: 既に **baseline 相対**(`p95(archived)-p95(allowed) <= 100ms` / RSS `<=16MiB`)= 安全側の形。t259 は差分ベースで #1511 クラスに該当しない(参照実装として有用)。

## 事実確定サマリ(修正設計はしない)
1. 欠陥箇所 = `t258 :461-462` の絶対 latency ceiling 500/750ms(RSS :463 は noop 相対で該当外)。
2. 予算は #1424 のユーザー選択 round number、CI 実測 p95 は 41.177/29.314ms(record 実在)、noise floor から導出されていない。
3. 機序 = 10,000行 I/O transaction を `-P 4` 並列 integration tier(単一 CI ジョブ、負荷分離なし)で絶対 ceiling 判定 → 6/100 超スパイクで偽赤。
4. 同型先例2件が「median/baseline AND noise floor + 述語分離 + fail-closed」を確立済み。noop baseline は t258 に既存。
5. same-root: t257 が同根(未報告)、t259 は既に安全形。
