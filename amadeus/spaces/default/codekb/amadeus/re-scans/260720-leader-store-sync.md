# Re-scan 記録 — 260720-leader-store-sync(Issue #1281)

## 実行メタデータ

- **Date**: 2026-07-20(Asia/Tokyo)
- **Intent**: `260720-leader-store-sync`([Issue #1281](https://github.com/amadeus-dlc/amadeus/issues/1281) — leader 所有の選挙 store・監査シャードの main 同期を構造化する。sync PR 生成の機械化と E-PM10A 除外規則の焼き込み)
- **Scope**: `amadeus`
- **Project type**: Brownfield
- **Repository**: `amadeus`
- **Stage**: `reverse-engineering`(2.1)
- **手法**: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。既存 CodeKB のフルスキャンは行わない。
- **実施体制**: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)。Architect が同一 ref・コマンドで独立再照合し、重大な反証はなかった(再照合詳細は末尾「独立再照合」節)。

## Base / Observed

- **base**: `a326f47bc`(区間下端)
  - `git merge-base --is-ancestor a326f47bc HEAD` → exit 0(祖先性実測)。
  - `git rev-list --count a326f47bc..HEAD` → **22**。
  - 全 `re-scans/*.md` の observed のうち HEAD 祖先かつ距離最小を採用(cid:reverse-engineering:rescan-base-ancestry)。`a326f47bc` は 260719-cursor-complete-clear の observed に一致する。
- **observed**: HEAD `c4e4fca1ab6113a6f4746cb4907cbc1472b0bed4`(`git rev-parse HEAD` 実測)。
- **比較対象 main**: `git rev-parse origin/main` = `4809e6a3f6e462bbe400b841630532721eb082cb`(スキャン時点)。leader 所有物の main 上実配置は `git show origin/main:<path>` / `git ls-tree origin/main` で読む。
- **測定 ref**: 正本コードの行番号は observed HEAD `c4e4fca1a` の実ファイル直読(cid:measurement-ref-in-artifacts)。elections store・監査シャードの実配置件数は `origin/main`(ref 明記)で計測 — leader 同期の対象は main 上の共有ストアであるため。**注意**: 本 worktree ブランチ(HEAD)の `elections/` は 7 dir(base `a326f47bc` では 0 dir)で、`origin/main` の実配置(下記)とは母数が異なる。件数はすべて計測 ref を明記して分離する。
- **Base の真実源**: 本ファイルおよび `inception/reverse-engineering/scan-notes.md` の到達可能な Observed commit。共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 区間交差判定(a326f47bc..HEAD、22コミット / コード面)

- `git log --oneline a326f47bc..HEAD -- scripts/ packages/ tests/` → **出力 0 件**(コード面交差ゼロを実測確認)。
- 区間22コミットは全て `record(...)` / `audit:` 系(elections record・監査シャード append・GRANT/DELEGATED_APPROVAL)であり、`scripts/`・`packages/`・`tests/` の変更は本区間に存在しない。
- 帰結: 本 intent のコード面前例(mirror.ts idiom・auditShardName 導出・elections store 様式)は `origin/main` 側に既存で、区間内の退行・新規導入はない。関心 seam は base 時点から現行と同一。

## Focus と測定方法

対象は Issue #1281 のフォーカス面(leader 所有物の同定と同期運搬)である。

1. **leader 所有物の機械的同定**: (a) elections store の per-dir 様式、(b) clone-id → 監査シャード basename の決定的導出。
2. **前例 tool の idiom**: `scripts/amadeus-mirror.ts` の GhRunner port / exit code 契約 / no-shell spawn / 判別ユニオン Result。
3. **PR 生成経路の前例有無**: `gh pr create` の repo 全域 grep。
4. **機械化対象の除外規則**: E-PM10A・norm-pr-from-main-base の規範データ verbatim。
5. **テスト2層様式**: t232-t242 帯(unit 純関数 + integration fake GhRunner)。

## 主要発見の要約(実測、機序確定)

### leader 所有物の同定 — elections store の per-dir 様式

- elections store は `amadeus/spaces/default/elections/<E-code>/` の per-dir 構成(計測 ref = `origin/main`、tree 型のみ **55 dir**。注: スキャンノート記載の 51 は同一 ref の後続前進による差 — 再照合節参照)。
- dir 内様式(`E-PM10A` 実測): `election.json`(定義+`state` = source of truth)/ `ledger.json`(accepted-ballot append list)/ `tally.json` / `timeline.json`(event append list)/ `record.md`(裁定・票タイムライン・`GoA[...]` 度数分布)/ `ballots/<voter>.json`(tally 時 materialize)/ `views/<voter>.json`(blind 配布)。
- `election.json` スキーマ(`E-CCCCG` 実測): `electionId` / `kind` / `question` / `choices[{internalNo,label}]` / `voters[]` / `state`。ballots/views の voter 数は election ごと可変。

### leader 所有物の同定 — clone-id → 監査シャード名の決定的導出

- 正本 = `packages/framework/core/tools/amadeus-lib.ts`。`CLONE_ID_FILE = ".amadeus-clone-id"`(`:2194`、workspace root 直下、per-clone トークンで .gitignore 対象=非コミット)。
- `cloneId(projectDir)`(`:2269`)= symlink 追従 → no-follow 既存読み → 無ければ `randomUUID().replace(/-/g,"").slice(0,12)`(**12桁 hex**)mint。
- `auditShardName(projectDir)`(**`:2838` export**、scan-notes の `:2837` はメモ化変数宣言)= `host`(`hostname().toLowerCase()` を `[^a-z0-9-]+`→`-` 正規化・48文字 truncate)+ cloneId → **`${host}-${cloneId}.md`**。
- 帰結: tool は「leader 自クローンのシャード basename」を `auditShardName(projectDir)` 一呼び出しで **決定的に導出**でき、全 intent record 横断で `audit/<basename>` を列挙して自クローン所有シャードを同定できる(推測不要)。main 上の監査シャード `*.md` は `origin/main` で **100 件**(host は全て `j5ik2o-mac-studio-lan`、clone-id で分岐。非シャードの `code-summary.md`/`shard.md` は basename フィルタで除外要)。

### 前例 tool の idiom(踏襲対象 = `scripts/amadeus-mirror.ts`)

- entry / project-root 解決: `SCRIPTS_DIR`/`PROJECT_DIR`、`main(argv, projectDir=PROJECT_DIR, run=spawnGh)` のデフォルト引数テストシーム(ADR-4)。`if (import.meta.main) process.exit(main(...))`。
- args parse: 判別ユニオン `ArgsOutcome`(`create|sync|close|usage`)、未知フラグ・欠落は `{kind:"usage"}`。
- Result port: `GhResult = {ok,stdout} | {error,exitCode,stderr}`、`GhRunner = (args) => GhResult` を port 抽出。
- gh 呼び出し: `spawnGh` = `Bun.spawnSync({cmd:["gh",...args], env: process.env})` — **引数配列 spawn のみ(no shell)**、`env: process.env` 明示(bun-spawn-env-snapshot 準拠)、exit code は子から読む。
- exit code 契約(header `:9-10` verbatim「Exit codes: 0 ok, 1 fault (gh missing/unauthenticated, missing field, landing check failed), 2 usage.」)= **0=ok / 1=fault / 2=usage**。
- 副作用の一方向性: record tree が source of truth、書込は gh 呼び出し + `amadeus-state.md` の該当 field のみ(`intents.json` は書かない=WORKSPACE-lock 温存)。R-3 部分失敗は fail-loud、自動クローズしない。
- Store 読取参考 = `scripts/amadeus-election-store.ts`: `electionsRoot(projectDir, space="default")`、`writeStoreFile` は同一 dir tmp+rename アトミック書込、`readJson<T>` は fail-closed load(`not-found`/`io-error`/`corrupt`)。

### PR 生成経路の前例 → 不在

- `grep -rn "gh pr create" scripts/ packages/` → **NO_MATCH**。`git grep "gh pr create" origin/main` も NO_MATCH。
- 既存 gh 機械化は `amadeus-mirror.ts` の **issue** 系(`issue create|edit|close`)のみ。新 tool が sync PR 生成を含む場合は **前例なしの新規 idiom**。ただし gh spawn 様式(`spawnGh`/`GhRunner` port / exit code 契約)はそのまま踏襲可能。

### 機械化対象の除外規則(規範データ、requirements へ verbatim 引き継ぎ)

- **norm-pr-from-main-base**(`project.md`): 「ノルム PR・record-sync PR は leader/作業ブランチから切らず、origin/main から対象コミットのみの単独ブランチで切る」。sync PR 自動生成は base=origin/main の単独ブランチ切りを守る必要がある。
- **E-PM10A**(本 intent 直近の規範データ、`origin/main:.../E-PM10A/record.md`): 「record-sync の overlay(`git checkout <team ブランチ> -- amadeus/` の一括上書き)は base 前進した共有ファイルを無音で巻き戻す — record-sync ブランチでは自 intent 外の M ファイル全数を origin/main と突き合わせ、memory 層は main 版へ復元する」。裁定=採用、GoA[E-PM10A]: 1x4(全会一致)。sync 機械化はこの巻き戻し防止を焼き込む必要がある。
- **weekly-distillation-round 構造免除**(`team.md`): Forbidden/Mandated クラスはツールが構造免除。「ツールは信号提示のみで削除・変更を実行しない — 裁定後は通常の norm PR による」。

### テスト2層様式(前例 = t232 帯)

- unit(純関数 in-process 駆動): `../../scripts/amadeus-mirror` から `parseArgs`/`countStageProgress`/`renderBody` 等を直 import(no spawn, no fs)。
- integration(実 fs/gh 境界): `mkdtempSync(tmpdir())` で temp workspace fixture(`intents.json`+`amadeus-state.md`)を構築、**fake `GhRunner` を C4 port 経由で注入**(ADR-4: 本番コードに fixture 分岐を置かない)、afterEach で `rmSync`。落ちる実証(duplicate create / field 欠落 / landing check fail-closed / gh-unready / R-3 部分失敗)を網羅。
- header 慣行: `// covers: harness-instrument:amadeus-mirror`。
- 帰結: 新 tool は同じ unit(純関数)+ integration(fake GhRunner + tmp workspace + 実 fs)の2層様式を踏襲。テスト番号は t242 以降の空き番号(fs-tests-integration-first / spawn-blindspot 準拠)。

## requirements への引き継ぎ点

1. **leader 所有物の同定 API は既存**: `auditShardName(projectDir)` で監査シャード basename を決定的導出、elections store は per-dir 様式で列挙可能。同定ロジックの新規発明は不要 — requirements は「自クローン所有物の全 intent record 横断列挙」を契約として固定する。
2. **sync PR 生成は前例なしの新規 idiom**: gh spawn 様式は mirror.ts を踏襲するが `gh pr create` は repo 初導入。CLI 契約(サブコマンド文法・破壊的操作の非デフォルト・exit code 0/1/2)を requirements でテスト可能に固定する(scope-definition:c1)。
3. **除外規則の焼き込み**: norm-pr-from-main-base(base=origin/main 単独ブランチ)・E-PM10A(共有ファイル巻き戻し防止)・weekly-distillation 構造免除は requirements の受け入れ基準へ verbatim で反映する(constants-from-code / mechanism-cite-verify)。
4. **副作用境界の温存**: mirror.ts の一方向性契約(record tree=source of truth、intents.json 非書込、fail-loud 部分失敗)を新 tool でも維持する。

## CodeKB 9成果物の更新判断

| 成果物 | 判断 | 根拠 |
|---|---|---|
| `business-overview.md` | 温存 | business domain・利用者・価値に変化なし |
| `architecture.md` | **更新** | 「leader 所有物の機械的同定(auditShardName 決定的導出 + elections per-dir 様式)+ 同期運搬の構造(mirror.ts GhRunner port 踏襲・gh pr create 前例不在)」は component 間相互作用と配布/同期フローの構造的事実で、既存本文に未記載の新規知識。1節を簡潔追記 |
| `code-structure.md` | 温存 | ファイル/モジュール配置・core 中立層/表層境界に変化なし。区間コード面交差ゼロ。前例 tool は既存配置 |
| `api-documentation.md` | 温存 | external/internal API 変更なし(新 tool は未実装、本 scan は RE のみ) |
| `component-inventory.md` | 温存 | component 追加・削除・責務変更なし |
| `technology-stack.md` | 温存 | runtime/framework/library/version 変更なし |
| `dependencies.md` | 温存 | external/internal dependency 変更なし(gh は既存 scripts 境界の前例あり) |
| `code-quality-assessment.md` | 温存 | 品質欠陥の新規クラスタ導入なし。同定/運搬の構造知識は本 per-intent 記録と architecture.md に集約(churn 回避) |
| `reverse-engineering-timestamp.md` | **更新** | 本 intent を最新 freshness block へ追加し、旧「最新: 260719-cursor-complete-clear」を履歴へ降格(cid:reverse-engineering:c3-relabel) |

## 独立再照合(Architect、同一 ref・実測)

Developer スキャンノートの引用を Architect が独立に再実行し照合した(反証は 1 点のみ、いずれも合成に影響なし)。

| 項目 | scan-notes | Architect 再実測 | 判定 |
|---|---|---|---|
| elections dir(origin/main) | 51 dir | tree 型のみ **55 dir** | 軽微差 — `origin/main` の後続前進で 4 election 追加(構造様式は不変、件数は例示。計測 ref 明記で分離) |
| `auditShardName` 行 | `:2837` | export は **`:2838`**、`:2837` はメモ化変数宣言 | off-by-one(実質一致) |
| `cloneId`/`CLONE_ID_FILE` | `:2269`/`:2194` | `:2269`/`:2194` | 一致 |
| main 監査シャード `*.md` | 100 件 | **100 件** | 一致 |
| `gh pr create` 前例 | NO_MATCH | scripts/packages 共に NO_MATCH | 一致 |
| mirror.ts exit code header | 0/1/2 | `:9-10` verbatim「0 ok, 1 fault …, 2 usage」 | 一致 |
| base 祖先性 / 距離 | 祖先・22 | `--is-ancestor` exit 0・`rev-list --count`=22 | 一致 |

補足(本 worktree の母数注意): base `a326f47bc` の `elections/` は **0 dir**、HEAD `c4e4fca1a` は **7 dir**、`origin/main` は **55 dir** — leader 同期の対象は `origin/main` の共有ストアであり、件数はすべて計測 ref を明記して混同を避けた。

## Delivery Boundary

本 scan では実装、main merge/rebase、Issue close、GitHub 上のレビュー作成・更新操作を実施していない。既存 state/audit・カーソルは変更していない。

> 訂正(2026-07-20、RA reviewer 指摘 → conductor 再実測): 「gh pr create 前例不在」は scripts/packages 面に限る — `.github/workflows/ci.yml:319-327` に CI shell ステップの precedent(app-token 認証・metrics/snapshot ブランチ命名・auto-merge)が実在する。当初 grep の走査範囲が .github/ を欠いた実測漏れ(absence-claim-grep-verify 違反実例)。
