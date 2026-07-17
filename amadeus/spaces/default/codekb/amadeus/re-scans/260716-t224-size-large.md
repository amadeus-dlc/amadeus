# 260716-t224-size-large 再スキャン記録

## メタデータ

| 項目 | 値 |
| --- | --- |
| Intent | `260716-t224-size-large` |
| Repository | `amadeus` |
| Project type | Brownfield |
| Scope | `bugfix`(Issue #1059) |
| 手法 | 既存 CodeKB に対する diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定2則) |
| Base commit | `e97fdb6fc658d4cd36d4c30fc460c5b7e70e8c75` |
| Observed commit | `720b0145b4b396b5c146b5c7271ff83f1da65243` |
| 距離 | 26 commits |
| 観測日時 | 2026-07-16 |
| Focus | Issue #1059 — t224 の wall-clock drift 恒常 FAIL(declared=medium measured=large、35-41s)の機序確定と最小修正特定 |
| 実施体制 | Developer(スキャン)→ Architect(合成)の直列(cid:reverse-engineering:c3) |

## Base 選定と到達可能性(rescan-base-ancestry)

base=`e97fdb6fc6` はリーダー割当(直前 re-scan `260716-s13-label-clarity.md` の observed commit)。E-L63 の rescan-base-ancestry に従い到達可能性を再実測:

- `git merge-base --is-ancestor e97fdb6fc6 HEAD` → **exit 0**(祖先性確認)
- `git rev-list --count e97fdb6fc6..HEAD` → **26**(距離)
- `git rev-parse HEAD` → `720b0145b4b396b5c146b5c7271ff83f1da65243`(observed 実測一致)

共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer に限り、差分 base の真実源には使用しない。

## 引用元様式との照合(citation-semantics-check)

本記録は直前 `re-scans/260716-s13-label-clarity.md` の E-L63 様式に倣う。相違を意図的相違として明記:

- **相違1**: 引用元 Focus は docs / プロトコル prose(§13 label 規定)。本 intent は**テスト size 分類機構(TS コード)+ テストの実測 wall-clock 時間**。焦点所見は size 分類のデータフローを file:line で確定する記述にした。
- **相違2**: 引用元は「決定的機構欠陥ではない」だが、本欠陥は**機構が正しく発火した結果**(t224 が真に large 帯で走るのに size 宣言が無く static 既定 medium と乖離)。ゲートは正しく、欠陥は t224 の size 宣言漏れ。
- **前提一致**: 非祖先 observed 除外・共有 timestamp を base 真実源にしない、を踏襲。

## Source 等価性

- 対象は **テスト資産**(`tests/` 直下)。`tests/lib/test-size.ts`・`tests/run-tests.ts`・`tests/integration/t224-upstream-v2-migration-cli.test.ts` は `bun scripts/package.ts` / `promote:self` の dist コピー源(CORE/HARNESS)に含まれず、修正は `tests/` の直接編集で完結、dist:check / promote:self:check 非関与。

## 差分の焦点所見

### 区間交差(区間26コミット)

`git diff --name-only e97fdb6fc6..HEAD -- tests/lib/test-size.ts tests/run-tests.ts 'tests/integration/t224-*.test.ts'` → **出力0行**。フォーカス3面(size 分類器正本・ランナー drift 報告部・t224 本体)は区間無変更。Issue #1059 実測時点の file:line は observed HEAD とバイト同一、欠陥は現存。

### wall-clock 分類のデータフロー(`tests/lib/test-size.ts`)

- `WALL_CLOCK_BANDS = { smallMaxSeconds: 1, largeMinSeconds: 30 }`(:89)。`[30,∞)`=large。
- `sizeFloorFromDuration`(:95-99): 40s → **dynamicFloor = large**。
- `detectWallClockDrift`(:113-121): `SIZE_ORDER[floor] > SIZE_ORDER[declared]` のときのみ drift(スマートコンストラクタ、非対称)。`detectWallClockDrift(medium, large)` → drift 発火。
- `parseSizeAnnotation`(:279-287、走査域 先頭40行 :280): t224 は size ヘッダ無し → `{declared:null}`。
- `buildMeasuredRecord`(:141-161): `effectiveDeclared = annotation.declared ?? classification.size`(:149)。t224 は `null` → **effectiveDeclared = static 分類値 = medium**(t224 は spawnSync :8 / node:fs :15-25 で medium シグナル、network 無し)。
- ランナー表示: run-tests.ts の drift 行 `declared=${r.drift.declared} measured=${r.drift.measured}`(:977、レポート生成 :944-969)。表示 `declared` は effectiveDeclared。

### 実測時間

`/usr/bin/time -p bun test tests/integration/t224-...` → **58 pass / 0 fail、`[40.40s]`、real 40.43s**(exit 0)。large 帯に単独・無負荷で到達。起票 35-37s / e4 41s / e1 42.6s に続く第4実行系で large 到達、恒常乖離を追認(coverage 有無で帯不変)。

### 未宣言テストの既習様式

`tests/` に `// size:` 宣言は45ファイル。medium 既習例 = `tests/unit/t207-worktree-base-freshness.test.ts:2` / `t209-worktree-read-anchor.test.ts:2`(いずれも先頭コメント域2行目)。**`// size: large` 宣言済みテストは repo に 0件**(t224 が最初の large になる)。

### 同型棚卸し(全数は別 Issue 候補)

「未宣言かつ 30s 超」の他テスト有無は、フル `bash tests/run-tests.sh --ci` の `tests/logs/test-size-report.json` 集計を要し、本 intent の区間では確定不能。**本 intent は t224 のみ対象、全数棚卸しは別 Issue 候補**。

### 修正方針(Issue #1059、e4/e1 の2名クロスレビュー確定)

- **最小修正 = t224 先頭コメント域へ `// size: large` の1行追加** → `parseSizeAnnotation` が large を返し → effectiveDeclared=large → `detectWallClockDrift(large, large)` 同値で drift 不成立 → 解消。機構(test-size.ts / run-tests.ts)無改修。
- 分割案は 40-43s に対し過剰。
- blame: `1a39edea2`(2026-07-14、#962 upstream v2 移行)追加、origin:bootstrap 非該当。**原因の所在 = 実装**(30s 超テストへの size 宣言漏れ)。
- 落ちる実証は既存 t-test-size-drift/dynamic ゲート側にあり新設不要。

## Always-rerun-for-freshness の充足

区間26コミットの diff 実測(フォーカス3面 0行)＋現行 file:line(test-size.ts :89/:95-99/:113-121/:149/:279-287、run-tests.ts :944-977、t224 :1/:8/:15-25)の observed HEAD 直読＋単独 wall-clock 実測(40.43s)で満たした。base/observed の真実源は本ファイルおよび本 intent の `inception/reverse-engineering/scan-notes.md`。
