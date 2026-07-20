# reverse-engineering スキャンノート — 260720-leader-store-sync(Issue #1281)

手法: diff-refresh。担当: Developer スキャン(読み取り専用+本ノート書込のみ)。
全項目 file:line 付き実測。推測なし。

## 測定 ref

- base(区間下端): `a326f47bc`(HEAD 祖先・実測: `git merge-base --is-ancestor a326f47bc HEAD` → 真、距離 `git rev-list --count a326f47bc..HEAD` = **22**)
- observed(区間上端 = 現ローカル HEAD): `git rev-parse HEAD` = **`c4e4fca1ab6113a6f4746cb4907cbc1472b0bed4`**
- 比較対象 main: `git rev-parse origin/main` = **`4809e6a3f6e462bbe400b841630532721eb082cb`**
- 以降 main 側現状の読み取りは `git show origin/main:<path>` / `git ls-tree origin/main`(ref 明記)。

## 項目1: 区間コード面交差(0件見込みの確認)

- 実行: `git log --oneline a326f47bc..HEAD -- scripts/ packages/ tests/`
- 結果: **出力 0 件**(交差ゼロを実測確認)。区間 22 コミットは全て `record(...)` / `audit:` 系(elections record・監査シャード append・GRANT/DELEGATED_APPROVAL)。
- 実行: `git log --oneline a326f47bc..HEAD`(全区間)→ 22 件すべて `record(leader-store-sync|cursor-complete-clear|elections|...)` または `audit:`。コード面(scripts/packages/tests)の変更は本区間に**存在しない**。
- 帰結: 本 intent のコード面前例は origin/main 側にのみ存在する。main 側 tool 実装は `git show origin/main:<path>` で読める(下記項目3で実読)。

## 項目2: leader 所有物の機械的同定

### 2-1: elections store の構成

- 実行: `git ls-tree origin/main amadeus/spaces/default/elections/` → **51 dir**(`E-BFAAD` … `E-TCRRAS13` 等)。
- dir 内様式(実行: `git ls-tree -r origin/main --name-only amadeus/spaces/default/elections/E-PM10A/`):
  - `election.json`(定義+`state` フィールド = source of truth)
  - `ledger.json`(accepted-ballot append list)
  - `tally.json`(tally 結果+固定 ballot 集合)
  - `timeline.json`(event append list)
  - `record.md`(裁定・票タイムライン・`GoA[...]` 度数分布)
  - `ballots/<voter>.json`(tally 時に materialize)
  - `views/<voter>.json`(blind 配布ビュー)
- `election.json` スキーマ実測(`git show origin/main:.../E-CCCCG/election.json`): `electionId` / `kind` / `question` / `choices[{internalNo,label}]` / `voters[]` / `state`。
- 注: dir によって ballots/views の voter 数は可変(E-CCCCG は e1/e4 の2名のみ、E-PM10A は e1-e4 の4名)。

### 2-2: clone-id → 監査シャード名の決定的導出(正本 = `packages/framework/core/tools/amadeus-lib.ts`)

- `CLONE_ID_FILE = ".amadeus-clone-id"`(:2194)、workspace root 直下に配置(`cloneIdPath`, :2196-2198 = `join(workspaceRoot(projectDir), CLONE_ID_FILE)`)。
- `cloneId(projectDir)`(:2269-2296): メモ化(`_cloneId`, :2215)→ symlink 追従(`linkedCloneId`)→ no-follow 既存読み(`readCloneIdNoFollow`)→ 無ければ `randomUUID().replace(/-/g,"").slice(0,12)`(**12桁 hex**)を mint し書込。書込不能時は in-memory token(:2293)。
- `auditShardName(projectDir)`(:2837-2847): メモ化(`_auditShardName`, :2837)。`host = hostname().toLowerCase()` を `[^a-z0-9-]+`→`-` 正規化・前後 `-` 除去・48 文字 truncate(空なら `"host"`)。返り値 = **`${host}-${cloneId}.md`**。
- シャード配置解決: :2183-2184 `join(<record>/audit, auditShardName(projectDir))`(intent record 配下 `audit/`)、worktree 版は :3373。
- write/reset 対称(:4662-4668): `resetCloneIdCache()` 相当が `_cloneId=null; _auditShardName=null` を同時クリア(cloneId が `_cloneId`、auditShardName が `_auditShardName` を populate するため単一 reset で両方クリア)。
- 帰結: **tool は「leader 自クローンのシャード basename」を `auditShardName(projectDir)` の呼び出しで決定的に導出できる**(host + clone-id token から機械導出、推測不要)。`.amadeus-clone-id` は per-clone トークンで .gitignore 対象(コミットされない=各クローン固有)。

### 2-3: main 上の監査シャード実配置

- 実行: `git ls-tree -r origin/main --name-only | grep -E 'audit/.*\.md$'` → **100 件**。
- 配置様式: `amadeus/spaces/default/intents/<intent-dir>/audit/<host>-<cloneid>.md`(例: `260706-amadeus-grilling/audit/j5ik2o-mac-studio-lan-d4a945003a7f.md`)。
- distinct basename(`... | sed -E 's#.*/##' | sort -u`): `j5ik2o-mac-studio-lan-<12hex>.md` 形が **29 種**(host は全て `j5ik2o-mac-studio-lan`、clone-id で分岐)。加えて非シャードの `code-summary.md` / `shard.md` が grep に混入(audit/ 配下だが監査シャードではない — basename フィルタで除外要)。
- 帰結: leader シャード = 特定 clone-id の basename を持つファイル群が、複数 intent record の `audit/` 配下に散在。tool は「自 clone-id の basename」を全 intent record 横断で列挙して同定できる。

## 項目3: 前例 tool の様式(踏襲すべき idiom)

正本 = `scripts/amadeus-mirror.ts`(373 行、origin/main と同一 = 区間交差なし)。構造を C1-C6 の section 分割で構成:

- **entry / project-root 解決**(:25-26, :354-373): `SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url))`、`PROJECT_DIR = join(SCRIPTS_DIR, "..")`。`main(argv, projectDir=PROJECT_DIR, run=spawnGh)` で projectDir・gh runner を**デフォルト引数のテストシーム**として注入(ADR-4)。`if (import.meta.main) process.exit(main(process.argv.slice(2)))`(:373)。
- **args parse**(C1, :33-58): 判別ユニオン `ArgsOutcome`(`create|sync|close|usage`)。`--intent <dir>` の欠落・`--`始まり値・未知フラグは全て `{kind:"usage"}`。
- **Result 型**(C4, :197-199): `GhResult = {kind:"ok",stdout} | {kind:"error",exitCode,stderr}`。`GhRunner = (args:string[]) => GhResult` を port として抽出。
- **gh 呼び出し**(:205-223): `spawnGh` = `Bun.spawnSync({cmd:["gh",...args], env: process.env, ...})`。**引数配列 spawn のみ(no shell)**、`env: process.env` を明示(bun-spawn-env-snapshot 準拠)。exit code は子から読む。`ensureGhReady(run)` = `run(["auth","status"])`(:225-227)。
- **exit code 契約**(:9-10, :231-234): **0 = ok / 1 = fault(gh 不在・未認証・field 欠落・landing check 失敗)/ 2 = usage**。`fail(msg)` は `console.error("amadeus-mirror: "+msg)` して 1 を返す。
- **副作用の一方向性**(:1-7 header): record tree が source of truth、書込は gh 呼び出しと `amadeus-state.md` の該当 field のみ(`intents.json` は書かない = WORKSPACE-lock 契約温存)。
- **state 読取**(C2, :111-156, `buildSnapshot`): `activeIntent`/`readIntentRegistry`/`recordDirMatches`/`getField`/`intentsDir` を `amadeus-lib` から import(決定的ソース = intents.json + amadeus-state.md)。R-3(部分失敗: issue 作成済み+field 書込失敗)を fail-loud で扱い自動クローズしない(:285-293)。

参考: `scripts/amadeus-election-store.ts`(:36-58)の Store 読取様式 — `electionsRoot(projectDir, space="default")` = `join(projectDir,"amadeus","spaces",space,"elections")`。`writeStoreFile` = **同一 dir tmp+rename のアトミック書込**(:40-50)。`readJson<T>` は `existsSync` false→`err("not-found")`、read 失敗→`err("io-error")`、parse 失敗→`err("corrupt")`(fail-closed load、silent re-init しない)。`StoreError = "exists"|"duplicate"|"not-found"|"io-error"|"corrupt"`。

## 項目4: PR 生成の既存経路 → 不在(grep 根拠付き)

- 実行: `grep -rn "gh pr create" scripts/ packages/` → **NO_MATCH**。
- 実行: `git grep -n "gh pr create" origin/main -- 'scripts/*' 'packages/*'` → **NO_MATCH**。
- 実行: `grep -rn "gh pr\|pr create\|pull request" scripts/` → **出力 0 件**。
- 帰結: **リポジトリ内に `gh pr create` を機械化した前例は存在しない**。既存 gh 機械化は `amadeus-mirror.ts` の **issue** 系(`issue create|edit|close`, :267-349)のみ。新 tool が PR 生成を含む場合は前例なしの新規 idiom(ただし gh spawn 様式は mirror.ts の `spawnGh`/`GhRunner` port をそのまま踏襲可能)。

## 項目5: 機械化対象の除外規則(規範データ verbatim)

### norm-pr-from-main-base(`project.md:118`)

> ノルム PR・record-sync PR は leader/作業ブランチから切らず、origin/main から対象コミットのみの単独ブランチで切る — 作業ブランチ起点は工程記録コミットが同乗し main と衝突する(E-PM1 P4 2026-07-16 採用 4/4、#1014 の CONFLICTING→b2cde40fb 載せ替えの実測) `<!-- cid:requirements-analysis:norm-pr-from-main-base -->`

### weekly-distillation-round の構造免除規則(`team.md:240`、verbatim 抜粋)

> Forbidden/Mandated クラスはツールが構造免除し候補に現れない(免除リストとして可視 — AC-2b 既決)。ゼロ引用の判定閾値は ZERO_CITE_THRESHOLD_DAYS=14、自己定義引用は母数から除外(SELF_CITE_BASELINE)。**ツールは信号提示のみで削除・変更を実行しない — 裁定後は通常の norm PR(2名レビュー+ユーザー承認マージ)による**

（cid: `requirements-analysis:weekly-distillation-round`。tool = `bun .claude/tools/amadeus-norm-metrics.ts distill-candidates --k <n>`、DEFAULT_DISTILL_K=5。GoA 4値 = 機械化/一般化/退役/維持。）

### E-PM10A(本 intent 直近の規範データ、`git show origin/main:.../E-PM10A/record.md`)

- question(verbatim): 「record-sync の overlay(git checkout 〈team ブランチ〉 -- amadeus/ の一括上書き)は base 前進した共有ファイルを無音で巻き戻す — record-sync ブランチでは自 intent 外の M ファイル全数を origin/main と突き合わせ、memory 層は main 版へ復元する」(実測: #1264 で team.md が pre-#1259 版に戻り E-GMECG 追補消失を S1 捕捉→是正。norm-pr-from-main-base の record-sync 面追補として)
- 裁定: **採用**。GoA[E-PM10A]: 1x4(全会一致)。票タイムライン: 配信 2026-07-20T01:51:48Z → e3 01:52:32Z → e1 01:52:55Z → e4 01:53:06Z → e2 01:53:10Z → 開票 01:53:41Z。

## 項目6: テスト面(scripts 対象テストの前例)

- `scripts/` 対象テストは **t232-t242** 帯(election TS foundation + mirror)。実測列挙:
  - unit(純関数 in-process 駆動): `tests/unit/t232-amadeus-mirror.test.ts`, `t234-election-model.test.ts`, `t238-election-record.test.ts`, `t239-election-transport.test.ts`
  - integration(実 fs/gh 境界): `tests/integration/t232-amadeus-mirror.integration.test.ts`, `t235-election-store.integration.test.ts`, `t236-election-loop.integration.test.ts`, `t240-election-transport.integration.test.ts`, `t242-election-skill-vocabulary.integration.test.ts`
  - e2e: `tests/e2e/t237-election-walking-skeleton.test.ts`
- **駆動様式(t232 unit, :12-20)**: `../../scripts/amadeus-mirror` から純関数(`parseArgs`/`countStageProgress`/`renderBody` 等)を直 import して in-process 駆動(no spawn, no fs)。fs/gh 境界は integration へ分離(fs-tests-integration-first / spawn-blindspot 準拠)。
- **駆動様式(t232 integration, :10-45)**: `mkdtempSync(tmpdir())` で temp workspace fixture を構築、`makeWorkspace` が `intents.json`+`amadeus-state.md` を実 fs に書き、**fake `GhRunner` を C4 port 経由で注入**(ADR-4: 本番コードに fixture 分岐を置かない)。afterEach で `rmSync` クリーンアップ。落ちる実証(duplicate create / field 欠落 / landing check fail-closed / gh-unready / R-3 部分失敗)を網羅。
- header 慣行: `// covers: harness-instrument:amadeus-mirror`(coverage registry 用)。
- 帰結: 新 tool は t232 と同じ **unit(純関数)+integration(fake GhRunner + tmp workspace + 実 fs)** の2層様式を踏襲すべき。テスト番号は t242 以降の空き番号を採る。

## 補足: RE センサーの構造的 matches-rejection(既知クラス)

- 本ステージ宣言センサー(required-sections/upstream-coverage/answer-evidence)は codekb 出力パスが sensor filter に不適合で常に matches-rejection(cid:re-sensors-codekb-filter-mismatch、team.md)。RE 成果物検証は conductor 手動確認が主。
