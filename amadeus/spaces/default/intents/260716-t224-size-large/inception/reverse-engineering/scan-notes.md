# Developer コードスキャン — 260716-t224-size-large

> Issue #1059(bug / P3 / S4-MINOR): `t224-upstream-v2-migration-cli.test.ts` が wall-clock drift ゲートで `declared=medium measured=large`(35-37s / 41s)で恒常 FAIL。Developer scan(観測のみ・修正しない)。主実測は Issue #1059 のクロスレビュー(e4/e1 の2名確認済み)で完了しており、本スキャンはその転記＋独立追認。

## メタデータ

| 項目 | 値 |
| --- | --- |
| Intent | `260716-t224-size-large` |
| Scope | `bugfix` |
| Repository | `amadeus` |
| Project type | Brownfield |
| 手法 | diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定2則) |
| Base commit | `e97fdb6fc658d4cd36d4c30fc460c5b7e70e8c75`(直前 re-scan `260716-s13-label-clarity.md` の observed) |
| Observed commit | `720b0145b4b396b5c146b5c7271ff83f1da65243`(`git rev-parse HEAD` 実測一致) |
| 距離 | 26 commits |
| 観測日時 | 2026-07-16 |
| Focus | t224 の wall-clock drift 恒常 FAIL 機序 — 帯定義 / 未宣言時の effectiveDeclared 導出 / 最小修正の特定 |
| 実施体制 | Developer(スキャン)→ Architect(合成)の直列(cid:reverse-engineering:c3) |

## Base 選定と到達可能性(rescan-base-ancestry)

base=`e97fdb6fc6`(リーダー割当。直前 re-scan `260716-s13-label-clarity.md` の observed commit)。E-L63 の rescan-base-ancestry に従い到達可能性を再実測した:

- `git merge-base --is-ancestor e97fdb6fc6 HEAD` → **exit 0**(祖先性確認、`ancestor:YES`)
- `git rev-list --count e97fdb6fc6..HEAD` → **26**(距離)
- `git rev-parse HEAD` → `720b0145b4b396b5c146b5c7271ff83f1da65243`(observed 実測)

共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer に限り、差分 base の真実源には使用しない。

## 区間内変更の有無(フォーカス面)

`git diff --name-only e97fdb6fc6..HEAD -- tests/lib/test-size.ts tests/run-tests.ts 'tests/integration/t224-*.test.ts'` → **出力0行**。フォーカス3面(size 分類器正本・ランナーの drift 報告部・t224 本体)は区間26コミットで**無変更**。よって Issue #1059 実測(2026-07-16 起票、e4/e1 追認)時点の file:line は observed HEAD とバイト同一で、欠陥(size 未宣言による恒常 drift)は observed に現存。

## 引用元様式との照合(citation-semantics-check)

本記録は直前 `re-scans/260716-s13-label-clarity.md` の E-L63 様式(メタデータ表 → Base 選定と到達可能性 → 差分の焦点所見)に倣う。相違を意図的相違として明記する:

- **相違1**: 引用元の Focus は docs / プロトコル prose 面(§13 label 規定)だが、本 intent は **テスト size 分類機構(TypeScript コード)+ テストの実測 wall-clock 時間**が対象。よって「焦点所見」は prose 規定所在ではなく、size 分類のデータフロー(annotation → effectiveDeclared → dynamicFloor → drift)を file:line で確定する記述にした。
- **相違2**: 引用元は「決定的機構欠陥ではない(orchestrator 逸脱の一事例)」と結論したが、本 intent の欠陥は**決定的機構が正しく発火した結果**(t224 が真に large 帯で走るのに size 宣言が無いため static 既定 medium と乖離)。ゲート自体は正しく、欠陥は t224 側の size 宣言漏れ。修正は t224 への1行アノテーション追加で、機構(test-size.ts / run-tests.ts)は無改修。
- **前提一致**: 「非祖先 observed の除外」「共有 timestamp を base 真実源にしない」という E-L63 の前提は忠実に踏襲。

## Source 等価性

- 対象は **テスト資産**(`tests/` 配下)であり `core/` / `harness/` 正本の dist 再生成対象ではない。`tests/lib/test-size.ts`・`tests/run-tests.ts`・`tests/integration/t224-upstream-v2-migration-cli.test.ts` はいずれも `tests/` 直下で、`bun scripts/package.ts` / `promote:self` の同期対象外(scripts/tests は C2 の dist コピー源に含まれない)。よって修正は `tests/` の直接編集で完結し、dist:check / promote:self:check には非関与。

## 差分の焦点所見(Issue #1059 の e4/e1 レビューを独立追認)

### (a) wall-clock 帯定義(`tests/lib/test-size.ts`)

- `WALL_CLOCK_BANDS = { smallMaxSeconds: 1, largeMinSeconds: 30 }`(**:89**)。帯は下端 inclusive / 上端 exclusive: `[0,1)`=small、`[1,30)`=medium、`[30,∞)`=large。
- `sizeFloorFromDuration(durationSeconds)`(**:95-99**): `>= 30` → large、`>= 1` → medium、else small。t224 の実測 40s → **dynamicFloor = large**。
- `detectWallClockDrift(effectiveDeclared, dynamicFloor)`(**:113-121**): `SIZE_ORDER[dynamicFloor] > SIZE_ORDER[effectiveDeclared]` のとき**のみ** `{kind:"wall-clock"}` を返すスマートコンストラクタ(正しい非対称。floor が declared 以下なら `{kind:"none"}`)。`detectWallClockDrift(medium, large)` → `SIZE_ORDER[large]=2 > SIZE_ORDER[medium]=1` → **drift 発火**。
- `parseSizeAnnotation(source)`(**:279-287**、走査域は先頭40行 `.slice(0,40)` :280): 先頭コメント域の `// size: <value>` を先頭一致で読む。t224 は先頭40行に size ヘッダ無しのため `{declared:null}` を返す。

### (b) t224 に size アノテーション不在 → effectiveDeclared=medium の経路

- **t224 先頭40行 grep**: `// covers: cli:amadeus-migrate(dry-run,apply)`(:1)のみ。`// size:` は **0件**(未宣言)。
- `buildMeasuredRecord`(`test-size.ts` **:141-161**)内で `effectiveDeclared: TestSize = annotation.declared ?? classification.size`(**:149**)。t224 は `annotation.declared = null`(未宣言)なので **effectiveDeclared = classification.size(static 分類の値)**。
- static 分類(`classifyTestSize` :49-62 / `SIGNAL_PATTERNS` :35-40): t224 は `import { spawnSync } from "node:child_process"`(:8、spawn シグナル→medium)と `node:fs` の `mkdtempSync/readFileSync/writeFileSync`(:15-25、filesystem シグナル→medium)を含み、network シグナル(large)は無い。よって **classification.size = medium**。
- 結論: 「declared=medium」は**ハードコード既定ではなく、size 未宣言時に static 信号分類が medium を返す経路**。run-tests.ts の drift 行(`declared=${r.drift.declared}` **:977**)が表示する `declared` はこの effectiveDeclared。

### (c) 単独実測時間

`/usr/bin/time -p bun test tests/integration/t224-upstream-v2-migration-cli.test.ts` → **58 pass / 0 fail、`Ran 58 tests across 1 file. [40.40s]`、real 40.43s**(exit 0)。large 帯(≥30s)に単独・無負荷で到達。Issue 起票 35-37s(coverage あり×2)・e4 41s(coverage 有無×2)・e1 42.6s(coverage なし)に続く**第4実行系での large 帯到達**で「declared と実測の恒常乖離」を追認(±数秒の揺れは記録のみ、いずれも 30s 閾値に対しマージン十分)。coverage 有無で帯は変わらず、由来節の coverage 仮説反証(e4/e1)を追認。

### (d) 既習アノテーション例(idiom)

`tests/` 配下に `// size: <value>` 宣言は **45ファイル**存在(`grep -rlE '^\s*//\s*size:\s*(small|medium|large)' tests/` から test-size.ts 自身を除外)。medium 宣言の既習例: `tests/unit/t207-worktree-base-freshness.test.ts:2` `// size: medium`、`tests/unit/t209-worktree-read-anchor.test.ts:2` `// size: medium`。いずれも**ファイル先頭コメント域(2行目)**に置かれる(`// covers:` があればその直後行)。t224 は :1 が `// covers:` のため、idiom どおりなら `// size: large` は新 :2 に入る。ただし現時点で `// size: large` を宣言済みのテストは repo に **0件**(t224 が最初の large 宣言になる)。

### (e) 同型棚卸し(全数は別 Issue 候補)

「未宣言かつ 30s 超」の他テストの有無は、実行ごとの `tests/logs/test-size-report.json`(run-tests.ts :944-969 が書く drift レポート)を全 tier フル実行して初めて機械判定できる。Issue #1059 の実測列は t224 単独に対するもので、他ファイルの drift 状況は本スキャンの区間では確定できない。**本 intent は t224 のみを対象とし、size 未宣言かつ large 帯の全数棚卸しは別 Issue 候補**(フル `bash tests/run-tests.sh --ci` の drift レポート集計を要する)とする。

## 修正方針(Issue #1059、e4/e1 の2名クロスレビューで確定済み)

- **最小修正 = t224 先頭コメント域(40行以内)へ `// size: large` の1行追加**。これで `parseSizeAnnotation` が `{declared:"large"}` を返し → effectiveDeclared=large → `detectWallClockDrift(large, large)` は `SIZE_ORDER` 同値で strictly-greater 不成立 → `{kind:"none"}` → drift 解消。
- 分割案(upstream v2 fixture 展開の分離)は 40-43s の実測に対し**過剰**(large 宣言で正しい帯に入る)。
- blame: t224 は `1a39edea2`(2026-07-14、#962 upstream AI-DLC v2 ワークスペース移行)で追加。**origin:bootstrap 非該当**(intent 由来)。**原因の所在 = 実装**: 30s 超に達するテストへの size 宣言漏れ(#962 の実装が size アノテーションを付けずに追加。導入時の実行時間が 30s 未満だった可能性は残り、断定には導入時実測が要るが、現 observed では恒常 large)。
- t-test-size-drift/dynamic の落ちる実証は**既存ゲート側にあり新設不要**(修正は t224 の1行のみ、機構は無改修)。

## Always-rerun-for-freshness の充足

区間26コミットの diff 実測(フォーカス3面 0行)＋現行 file:line(test-size.ts :89/:95-99/:113-121/:149/:279-287、run-tests.ts :944-977、t224 :1/:8/:15-25)の observed HEAD 直読＋単独 wall-clock 実測(40.43s)で満たした。base/observed の真実源は本ファイルおよび `re-scans/260716-t224-size-large.md`。
