# Developer コードスキャン結果 — intent `260709-dynamic-test-size`(#699 / #684 Phase D)

- **手法**: 差分リフレッシュ(project.md `reverse-engineering:c1`)。ベース `9a2f5c7205795a255f258628710820def2ab3f8c` → 現 HEAD `24197d755a51712c1bfd6fa405f709c070c61f0d`。
- **既存 codekb**: `amadeus/spaces/default/codekb/amadeus/`(9成果物、前回 intent `260709-pbt-small-band` の観測コミット = ベースと一致)。
- **スコープ**: `git diff --name-status <base>..HEAD -- ':!amadeus/' ':!dist/'` を自分で再実行し検証(下記「差分の実測」)。本 intent のフォーカス面(テストランナーの per-file 計測・size 分類・meta 化・CI 配線)を実コード直読で確定。

---

## 差分の実測(裏取り済み)

再実行結果(5ファイルのみ、指示と一致):

| 状態 | パス |
|---|---|
| M | `bun.lock` |
| M | `package.json` |
| A | `tests/helpers/arbitraries/semver.ts` |
| M | `tests/integration/t92.test.ts` |
| A | `tests/unit/setup-semver.pbt.test.ts` |

`git diff --stat`: 5 files, +282 / -2。内訳の実測:

- **`package.json`**(+1 行): `devDependencies` に `"fast-check": "^4.9.0"` を追加のみ(`package.json` L32 相当)。test/coverage スクリプト(`test:ci`/`coverage:ci`/`test:all` = L14-16)は無改変。
- **`bun.lock`**(±7 行): fast-check ロックエントリ。
- **`tests/helpers/arbitraries/semver.ts`**[A]: PBT 用 arbitrary ヘルパー(fast-check)。ランナー・size 分類のロジックに非関与。
- **`tests/integration/t92.test.ts`**(+24/-2): #709 の対応。Group N test 44 に `test.skipIf(TEST44_SKIP_REASON !== null)` ガードを追加(未インストール worktree で repo-pinned tsc の symlink が dangling のとき false-red を回避)。upstream-coverage/type-check sensor のテストであり、**size ランナー(フォーカス1-8)とは無関係**。
- **`tests/unit/setup-semver.pbt.test.ts`**[A]: fast-check ベースの新規 PBT 単体テスト。ヘッダに `// covers: domain:setup-semver`(L1)と `// size: small`(L2)を宣言、spawn/fs/network シグナルなし(自分で grep 確認)→ 分類は small、ドリフトガード非抵触、registry へは `covers:` 経由で参入。

### 差分がフォーカス面(1-8)へ与える影響: **無し**

- **フォーカス1-6, 8**(`run-tests.ts` / `test-size.ts` / `t-test-size-drift.test.ts` / `bun-junit-to-meta.ts` / CI / `gen-coverage-registry.ts` / package.json test scripts): いずれも差分5ファイルに**含まれない** → 前回スキャンの理解がそのまま有効。
- **フォーカス7**(`t112.serial.test.ts`): 差分に含まれず無改変。ただし新規 `.test.ts` 2件が追加されたため、`printSizeMatrix` の disk walk と `t-test-size-drift` の on-disk ガードは**次回実行時に自動でこの2件を分類対象に含める**(両者ともディスクを都度走査、ハードコードリストなし — 下記詳細)。ランナー機構自体の変更は不要。

---

## フォーカス1: `tests/run-tests.ts` — per-file 実行・計測・size 報告

Native Bun ランナー(旧 `run-tests.sh` は POSIX 互換ラッパ)。公開契約(フラグ・START/DONE マーカ・SUMMARY・exit == failed-file 数)は smoke/t05・t112 が固定。

### per-file spawn と wall-clock 計測(#699 の主結合点)
- 各テストファイルは `runBunTestFile()`(L685-797)で実行。1ファイル = 1子プロセス。
- 実行本体: `runSpawnCapture(BUN, ["test", file, "--reporter=junit", "--reporter-outfile=<tmp>", ...coverage])`(L733-746)。`BUN = process.execPath`(L29)。
- **wall-clock 計測箇所**: `const start = Date.now()`(**L724**)→ spawn 完了後に `meta.duration === "0"` の場合のみ `String(Math.max(0, (Date.now() - start) / 1000))` で補填(**L762**)。つまり**基本は JUnit XML の root `time` を採用**し、欠落時のみ壁時計フォールバック。単位は**秒(float 文字列)**。
- JUnit XML → meta 化: `buildMeta(xml, name, run.rc)`(**L760**、`bun-junit-to-meta.ts` の import は L24)。`writeMeta(name, meta)`(**L763**)で `<resultsDir>/<name>.meta` を書く(`writeMeta` 実装 L369-392)。

### meta の保存先とスキーマ・ライフサイクル(#699 が duration を残すなら要注意)
- 保存先: `resultsDir = join(logDir, "_results")`(**L279-280**)。`logDir` は `--verbose` 時は `tests/logs/<utcStamp>`(L269)、非 verbose 時は `mkdtempSync(TMPDIR)` の一時ディレクトリで**実行後に丸ごと削除**(`cleanupLogDir`、L275-277・L1113)。
- meta スキーマ: `NAME / STATUS / TESTS / FAILED / DURATION / RC` の6行(`writeMeta` L369-391、SKIP は固定 6 行 L374-382)。**DURATION フィールドは存在するが per-file の実行時間**。
- **集約後に meta は削除される**: `aggregateTierResults()`(L417-431)が全 `.meta` を `parseMeta`(L394-415)で読み `resultRows` に積んだ後、**L430 `for (const meta of metas) rmSync(meta, ...)`** で消す。
- したがって **duration が生き残る先は (a) メモリ上の `resultRows[].duration`、(b) `--verbose` 時の `summary.txt`(`writeVerboseSummary` L950-985、per-file 表に `${row.duration}s` L973)のみ**。**JSON/レジストリ形式の duration 永続化は現状存在しない**(推測ではなくコード全走査で確認)。→ **#699 が「継続的動的計測」を積むには、この削除される `.meta`/揮発 `resultRows` とは別の永続化経路を新設する必要がある**(推測: 既存 `printSizeMatrix` は静的分類のみで duration を消費していないため合流点にならない)。

### `printSizeMatrix`(size 分布出力)と exit-code 契約の wrap
- 呼び出し: `printSummary()`(L869-889)の中、**L882-886** で `try { printSizeMatrix(); } catch { /* swallow */ }`。コメント L880-881 が明示: 「Observability only — MUST NOT affect the process exit code (t112 pins exit == failed-file count)」。**size 報告は try/catch で完全に隔離され exit code を乱さない**。
- 実装 `printSizeMatrix()`(**L895-948**): `SCRIPT_DIR`(= `tests/`)を `walk()`(L902-930)で再帰走査し、各 `.test.ts` を `readFileSync` → `classifyTestSize(src).size`(**L921**)で分類。scope は相対パス先頭ディレクトリ(`smoke/unit/integration/e2e` else `other`、L923)。`node_modules`/`logs` は除外(L912)。
- 出力: scope × size マトリクス(L931-946)+ `size-annotated files: <annotated>/<total>`(L947、`parseSizeAnnotation(src).declared !== null` で計上 L925)。
- **重要**: `printSizeMatrix` は**静的分類(`classifyTestSize`)のみを消費し、実行時 wall-clock / meta には一切触れない**(L895-948 全走査で確認)。#684/#696 Phase A の静的シグナル出力。#699 の動的計測はここへ「重ねる」設計。

### 並列/直列制御
- tier 実行 `runTier`(L858-867)。`effectiveParallel = (smoke|unit) ? 1 : args.parallel`(**L859**)— smoke/unit は常に直列。
- パーティション `runFilesPartitioned`(L834-856): `pinnedSerial = level==="smoke"||level==="unit"`(L839)、`.serial.` を含むファイルも直列(L846)。Claude 必須ファイルは別バンド(`liveSerialFiles`/`liveParallelFiles`、L848-855)。
- バンド実行 `runFileBand`(L810-832): 直列分を順次、並列分を `Set<Promise>` で `effectiveParallel` 上限の sliding window(L821-831)。
- 並列時 stdout は `withStdoutLock`(L435-447)で DONE ブロックを直列化(`doneBlock` L767-776)。

---

## フォーカス2: `tests/lib/test-size.ts` — 分類契約(#699 の安定出力形状)

- モジュール役割(L1-21): テストピラミッドの段は **test SIZE**(動的ランタイム挙動)であり scope/ディレクトリではない。Phase A は**静的シグナルプロキシ**(spawn/fs/net/timer API の直接参照検出)。コメント L10-14 が明言: 「Phase D (#699) layers true dynamic observation on top; the classifier's output shape stays stable so the drift guard and runner report keep working」。**= 出力形状の後方安定が #699 の前提契約**。
- `TestSize = "small"|"medium"|"large"`(**L23**)。`SIZE_VALUES`(L25)。`SIZE_ORDER = {small:0, medium:1, large:2}`(**L28**、比較の唯一の順序定義)。
- `SIGNAL_PATTERNS`(**L35-40**): network→large、spawn/filesystem/timer→medium。各シグナルの最小 size を規定(コメント L31-34: network=large / spawn|fs|timer=medium、wall-clock 軸は動的なので Phase D)。
- `SizeClassification { readonly size: TestSize; readonly signals: readonly string[] }`(**L42-45**)。← #699 が観測を重ねる**安定出力形状**。
- `classifyTestSize(source)`(**L49-62**): コメント除去(L52)後に各パターンを test、最大 size を採用。signals 配列も返す。
- `SizeAnnotation { declared: TestSize|null; invalidValue?: string }`(**L64-70**)。
- `parseSizeAnnotation(source)`(**L74-86**): 先頭〜40行から `// size: <value>` / `# size:` を抽出(L77)、有効値なら `declared`、無効値なら `invalidValue` を返す(first-match-wins)。

---

## フォーカス3: `tests/unit/t-test-size-drift.test.ts` — 静的ドリフトガード

- ヘッダ `// covers: file:lib/test-size.ts`(L1)、`// size: medium`(L2、自身の readFileSync/readdirSync 使用に一致)。
- 3ジョブ(L4-13): (1) 分類器ユニットテスト、(2) アノテーションパーサテスト、(3) **THE GUARD**。
- **検査対象**: `allTestFiles(TESTS_ROOT)`(L33-45、`tests/` 直下から再帰、`node_modules`/`logs` 除外 L38)で**全 `.test.ts` をディスクから収集**。→ ハードコードリストなし、新規テストは自動対象(差分の新 PBT 2件も次回対象)。
- **失敗条件**:
  - 無効アノテーション値の存在(L113-120): `a.invalidValue !== undefined` を集め `expect(bad).toEqual([])`。
  - **declared < measured**(L122-134): アノテーション宣言 size が測定 size より**小さい**ファイルを違反として集約(`SIZE_ORDER[declared] < SIZE_ORDER[measured]`、**L129**)。「アノテーションは約束、分類器は検査」(L11-12)。
- **fixture 方式**(重要な注意点): 自身のソースに API 名が混入して自己 size が膨張するのを避けるため、トリガトークンを**実行時に文字列連結で生成**(`TOK` = `read${"File"}Sync` 等、**L52-57**)。→ 推測: **#699 で動的計測用の実 fixture(実際に spawn/fs する fixture)を本ファイルに追加する場合、この静的分類の自己汚染回避規律との整合が必要**。
- falling-test エビデンス(L15-18): mislabelled fixture で赤→修正で緑を PR に含める #696 AC。

---

## フォーカス4: `tests/lib/bun-junit-to-meta.ts` — JUnit→meta 化と実スキーマ

- 役割(L1-19): bun の JUnit XML を既存 `.meta` 6行形状へ正規化する D7 グルー。bun の exit(0/1)は「exit == failed-FILE 数」契約を表現できないため、`.meta` の `STATUS` が親の唯一の真実源(L12-19)。
- **検証済み bun 1.2.22 JUnit 形状**(コメント L21-53): root `<testsuites tests= assertions= failures= skipped= time=>` が**唯一の権威**。**`time`(root)だけが実 wall-clock float(秒)**を持ち、内側 `<testsuite time>` は全て "0"(L28-29, L40-41)。→ **#699 が per-file 実測時間を得る唯一の XML 源は root `time`(単位=秒 float)**。
- import crash 検出(L48-53, L242-260): rc!=0 かつ XML 空 → `failed=1` 合成(`buildMeta` L262-280、`rcFail` L265)。
- **`.meta` 契約**(L55-63, `renderMeta` L287-296): 6行 `NAME/STATUS/TESTS/FAILED/DURATION/RC`。**DURATION = root `<testsuites time>` の float 秒、フォールバック "0"**(L79-80、`parseJUnit` L182 で `attrStr(root,"time")`、`sanitizeDuration` L151-154 で `[0-9.]` に無害化)。
- `MetaCounts.duration` は文字列で bun の float 表記を verbatim 保持(L114)。
- **実行時間フィールドの有無・単位の結論**: **有り(DURATION、秒 float 文字列)**。ただし前述の通り run-tests.ts が集約後に `.meta` を削除するため、この値は永続レジストリには残らない(フォーカス1参照)。

---

## フォーカス5: CI 配線(`.github/workflows/`)

`ci.yml`(2ジョブ + 2ゲート集約):
- **`check` ジョブ**(L20-49): `runs-on: ubuntu-latest`(**L22**、**Linux ランナー確定** → 推測: strace/eBPF バックエンドは OS 上は可能だが、GitHub hosted runner は非特権・sudo 制限あり。root 権限を要する eBPF/strace の実行可否は要検証)。steps: typecheck(L37)→ lint(L40)→ `dist:check`(L43)→ `promote:self:check`(L46)→ **`bun run test:ci`**(L49)。
- **`coverage` ジョブ**(L51-94): `bun run coverage:ci`(L73、= `run-tests.ts --ci --coverage`)→ **artifact upload あり**: `actions/upload-artifact@v4` で `coverage/lcov.info` + `coverage/html`(**L75-84**、retention 14日)→ Codecov OIDC アップロード(L86-94)。→ **推測: #699 の動的計測アーティファクト(size×duration レポート)を CI に残すなら、この upload-artifact パターンが既存の合流先**。
- `codecov-status`(L96-191): PR 時 `codecov/patch` を待機。`ci-success`(L193-217): 3ジョブ集約ゲート。
- **macOS の DTrace は SIP-blocked**、**Bun test preload も発火しない**(`test-size.ts` L11-12 が既存判断として記録) → Phase A が静的である根拠。#699 の動的バックエンド選定はこの制約を継承。
- **現状 size/duration 専用のアーティファクト upload は無い**(ci.yml 全読で確認、coverage のみ)。

---

## フォーカス6: `tests/gen-coverage-registry.ts` — registry 構造と size 合流点

- 役割(L1-49): L-SURFACE カバレッジレジストリ + CI ラチェット。ディスクから「ユニット」を列挙(左辺=常に fresh な reality)、`// covers:` / `# covers:` ヘッダで claim する test をマッチ(右辺)、GUARANTEE-PRINCIPLE ゲート(test の mechanism ≥ unit の minMechanism)で JOIN し `tests/.coverage-registry.json` を出力。
- freshness-diff idiom(L21-24): `--check` がメモリ再生成 → committed 版と diff → drift で exit 1。ラチェット `tests/.coverage-ratchet.json`(L26-32): covered 数の単調非減少を強制。
- **size/duration との合流点**: `grep 'size|duration|meta|classifyTestSize|printSize'` は Set.size(L688)等のみヒットし、**test-size 分類・実測 duration への参照は存在しない**(全走査確認)。→ **registry は `covers:` ヘッダ join が軸で、size/実測メタとは現状直交**。推測: #699 が size/duration を registry 化するなら、新しいユニットクラス or 別 JSON アーティファクトの新設が必要で、既存 `covers:` 機構への相乗りは自明でない。

---

## フォーカス7: `tests/integration/t112.serial.test.ts` — scratch runner tree コピー機構

- 役割(L1-32): 「who tests the tester」。ランナーの exit code == failed-FILE 数の不変条件を、scratch tree に実ランナーをコピーして実駆動で検証。
- **コピー機構**(重要制約): scratch `<root>/tests/` に以下を `copyFileSync`(**L91-94**):
  - `run-tests.sh`(`REAL_RUNNER` L46)
  - `run-tests.ts`(`REAL_RUNNER_TS` L47)
  - `lib/bun-junit-to-meta.ts`(`REAL_GLUE` L48)
  - **`lib/test-size.ts`**(`REAL_SIZE` **L52**)— コメント L49-52 が明示理由: 「run-tests.ts also imports lib/test-size.ts ... A static import means the copied runner fails to load without it」。
- **#699 への制約(明確)**: **run-tests.ts が新たに import するファイルを追加したら、この t112 の copy リスト(L91-94)にも追加しないと scratch runner がロード不能で t112 が壊れる**。動的計測モジュールを run-tests.ts が static import する設計にする場合、`REAL_SIZE` と同じパターンで L46-52 と L91-94 の両方へ追加が必須。
- 駆動は `--smoke -P 1`(L107、integration Claude ゲート回避)。`afterEach` で scratch 削除(L56-65)。

---

## フォーカス8: `package.json` test 関連スクリプトと `--release` 層

- `test:all`: `bun tests/run-tests.ts --all`(**L14**、= `--release` = smoke+unit+integration+e2e、`run-tests.ts` L145-153)。
- `test:ci`: `bun tests/run-tests.ts --ci`(**L15**、smoke+unit+integration)。
- `coverage:ci`: `bun tests/run-tests.ts --ci --coverage --coverage-dir coverage`(**L16**)。
- `typecheck`(L17): `tsc --noEmit` × 2(`tsconfig.json` + `tsconfig.tests.json`)。
- `lint`(L18): Biome check `tests/ packages/setup/`(**lint スコープは `tests/` と `packages/setup/` に限定** — project.md の「新設パッケージは同一 PR で lint 配線」規律の対象領域)。
- `--release`/`--all` 層は e2e を追加(`run-tests.ts` L145-153, `fullProfile` L151)。差分で test スクリプトは無改変(fast-check 追加のみ)。

---

## #699 実装への含意(観測面のまとめ・要点)

1. **wall-clock は既に測れている**が(`run-tests.ts` L724/L762、root JUnit `time` 秒 float)、**集約後に `.meta` が削除される**(L430)ため**永続化経路が無い** → #699 は新規の永続化(JSON アーティファクト等)が要。
2. **`SizeClassification` 出力形状は安定契約**(`test-size.ts` L42-45, L10-14)— 動的観測はこの形状を壊さず「重ねる」。
3. **`printSizeMatrix` は静的分類のみ**(L895-948)で duration 非消費 → 動的値の自然な合流点ではない。
4. **exit-code 隔離パターン**(`try/catch` L882-886)が既存 — 動的計測を SUMMARY に足すなら同じ隔離必須(t112 が exit 契約を固定)。
5. **run-tests.ts の新 import はすべて t112 の copy リスト(L91-94)へ伝播必須**。CI は Linux(ubuntu-latest)確定・coverage artifact upload 既存だが size/duration 専用アーティファクトは未設置。差分5ファイルはフォーカス面へ影響なし。
