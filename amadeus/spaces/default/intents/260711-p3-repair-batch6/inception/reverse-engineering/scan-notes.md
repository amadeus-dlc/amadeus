# reverse-engineering スキャンノート — 260711-p3-repair-batch6

Developer スキャン担当による codekb 差分リフレッシュ用スキャン(cid:reverse-engineering:c1 準拠)。git 状態変更・コード編集なし、実読のみ。

## 実行メタデータ

- **base SHA**: `d8de2362b24300c1f73d51392436141848bf8a6a`(前回 batch5 RE の observed)
- **observed SHA**: `37ad36a97fe850c4724bc45200eb4456c921d495`(現 origin/main)
- **スキャン日時**: 2026-07-11
- **方式**: diff-refresh(前回スキャンコミットからの差分)。フォーカスは p3-repair-batch6 の6欠陥の現存確認と現行 file:line の実測。

## 差分区間の俯瞰(d8de2362b..37ad36a97)

介在コミット13本。`packages/framework/core/tools/` のコア tools への変更は4ファイルに限定:

- `amadeus-lib.ts`(+84/−): 主に #859(adapter mint を共有の machine-injected-turn 分類器へ経路変更)関連の表層。
- `amadeus-state.ts`(+6/−): 軽微。
- `amadeus-swarm.ts`(+2/−): 軽微。
- `amadeus-utility.ts`(+5/−): 軽微。

主な介在コミット(新しい順): #852(record)、#866(batch5 §13 学習5件のノルム反映)、#830/#855(doctor worktree Check アンカー)、#831/#865(audit-lock を run 毎隔離、t76 フレーク閉包)、#863(kiro/kiro-ide runCore の payload cwd 伝播)、#819/#862(t92 linter hermetic-stub 化 + 実 eslint round-trip を e2e へ移設)、#861(同時 Bolt builder を intent あたり2名に制限のノルム)、#859(adapter mint 分類器)、#730/#856(combined LCOV から comment/blank DA 除去)、#837(CCN complexity gate: lizard ベースライン・ラチェット + Biome 認知的複雑度)、#853(ノルム改訂)、#835(batch5 RE codekb refresh)。

**重要**: 本 intent のフォーカス6欠陥が属する `amadeus-orchestrate.ts` / `amadeus-jump.ts` / `amadeus-sensor-linter.ts` / `amadeus-graph.ts` / `amadeus-stage-schema.ts` は本区間で**未変更**。6欠陥は本区間の回帰ではなく、より古い時点で元修正が restart/reset により喪失した既存欠陥であり、現 observed で現存する。以下は全て現行 observed ツリーの実読で確定した file:line。

## フォーカス6欠陥の現存確認

### #841 — tryEmitSwarm が完了バッチを除外せず静的 batches[0] を無条件再提示【現存】

- **現行 file:line**: `packages/framework/core/tools/amadeus-orchestrate.ts:1703`(`tryEmitSwarm`)、欠陥本体は `:1717-1720`。
- **欠陥コード引用**:
  ```ts
  const batches = readBoltDagBatches(projectDir);
  if (!batches || batches.length === 0) return false;
  const firstBatch = batches[0];
  if (!Array.isArray(firstBatch) || firstBatch.length === 0) return false;
  ```
  `batches[0]`(静的トポロジの第1バッチ)を無条件採用し、`unitCovered` 等によるカバレッジ判定で完了済みバッチを除外していない。よって `next` は毎回バッチ1を再提示し、バッチ進行が手動追跡になる。
- **元修正**: `3eca83a56`(#486「invoke-swarm を coverage ベースのバッチ進行へ」)。`git show 3eca83a56` 参照可。元修正は batches を走査し各 unit を `unitCovered` で判定、未カバー unit を含む最初のバッチを `firstBatch` に採る(`for (const batch of batches){ const uncovered = batch.filter(u => !unitCovered(...)); ... } if (firstBatch === null) return false;`)ロジックを追加していた。現行はこの走査が失われ `batches[0]` の静的採用に逆戻り。

### #842 — jump が backward でも PHASE_VERIFIED を emit・多相 forward の単一イベント化・PHASE_SKIPPED 不在【現存】

- **現行 file:line**: `packages/framework/core/tools/amadeus-jump.ts:432-447`(phase 境界イベント emit ブロック、`execute` 内)。
- **欠陥コード引用**:
  ```ts
  if (crossesPhaseBoundary && currentStageForPhase) {
    emitAudit(pd, "PHASE_COMPLETED", { ... });
    emitAudit(pd, "PHASE_VERIFIED", {
      "Phase boundary": `${currentStageForPhase.phase} → ${targetStage.phase}`,
      Details: "Traceability verification on jump",
    });
    emitAudit(pd, "PHASE_STARTED", { Phase: targetStage.phase, Scope: scope });
  }
  ```
  ガードが `direction` を見ていないため、(a) **backward jump でも** PHASE_COMPLETED/PHASE_VERIFIED/PHASE_STARTED を emit する(Verified がロールバックされない契約に反し、逆に前進 Verified を偽発行)。(b) 複数 phase を同時に跨ぐ **forward jump が単一の from→to イベント対**しか出さず、中間 phase 群を per-phase で列挙しない。(c) 実行済み stage を持たない phase の **PHASE_SKIPPED が存在しない**(このブロックに SKIPPED emit 自体が無い)。同一トランザクションでの Phase Progress 更新も欠落。
- **元修正**: `2c2c48a39`(#481「jump の phase 境界に #479 の契約を適用」)。`git show 2c2c48a39` 参照可。元修正は「閉じる phase を正準順で per-phase 列挙 → `direction === "forward"` のときだけ emit(backward は無 emit) → work 有り phase は PHASE_VERIFIED、work 無し phase は PHASE_SKIPPED → 同一トランザクションで Phase Progress 更新」を実装(`markPhaseVerified`/`PHASE_PROGRESS_FIELD` を export)。現行はこの direction 分岐・per-phase 列挙・SKIPPED・Progress 更新が全て失われている。

### #836 — delegate 承認フローで Phase Progress ロールアップが更新されない【現存】

- **現行 file:line**: 更新コード自体が不在。Phase Progress セクションを**書く**のは init 時のみ: `packages/framework/core/tools/amadeus-utility.ts:2449`(`## Phase Progress` 見出し)、テンプレート生成ロジック `:2396-2414`。承認/前進経路 `amadeus-state.ts` の `handleAdvance:1135` は `Lifecycle Phase` フィールドを `setField` で更新するのみ。delegate 承認 `handleDelegateApproval:1655`(`amadeus-state.ts`)は DELEGATED_APPROVAL audit を対象 intent シャードへ追記するだけで、その後の conductor 側 approve→advance でも `## Phase Progress` セクションには触れない。
- **欠陥の実証**: リポジトリ全 tools を grep しても `## Phase Progress` を**更新**する箇所は存在せず、ヒットは init テンプレート(`amadeus-utility.ts:2449`)のみ:
  ```
  amadeus-utility.ts:2449:## Phase Progress
  amadeus-utility.ts:2450:<!-- Status values: Pending, Active, Verified, Skipped -->
  ```
  init テンプレートのコメント(`:2398-2399`)は「Pending phases flip to Active on their phase-boundary advance and to Verified at phase completion」と約束するが、その flip を行うコードが `handleAdvance`/approve/delegate のいずれにも無い。よって Phase Progress ロールアップは init 以降 stale。delegate 承認フロー(このチームの主経路)でも同様に未更新。
- **元修正**: 本タスク指定なし。#481 の元修正(`2c2c48a39`)は jump 経路で `markPhaseVerified`/`PHASE_PROGRESS_FIELD` を export・同一トランザクション更新していた痕跡があり、Progress 更新機構が過去に存在した(現在は喪失)ことを示す。advance/approve 経路の Progress 更新は本 batch で新規に配線が必要な可能性がある(Architect 合成で要確認)。

### #840 — detectWorkspace の言語走査が SCAN_SOURCE_DIRS 限定で Greenfield 誤判定【現存】

- **現行 file:line**: `packages/framework/core/tools/amadeus-utility.ts:1917`(`detectWorkspace`)、欠陥本体は `:1949-1954`。定数 `SCAN_SOURCE_DIRS`(`src`,`app`,`lib`,`pages`,`components`,`tests`)は `:1762`。
- **欠陥コード引用**:
  ```ts
  // Recurse into known source dirs if present (capped depth)
  for (const dirName of SCAN_SOURCE_DIRS) {
    if (topSet.has(dirName)) {
      countFilesByLang(join(projectDir, dirName), langCounts, 6);
    }
  }
  ```
  言語カウントの再帰対象が定型 source dir に限定されており、`packages/`・`dev-scripts/`・`skills/` 等にコードを置く repo では `langCounts` が空 → `hasSourceFiles=false`(`:1977`)。トップレベルに framework config / 他マニフェスト(`:1978-1991`)も無ければ `brownfield=false`(`:1994-1999`)で **Greenfield 誤判定** → bugfix scope の reverse-engineering が SKIP 降格。
- **元修正**: `765fe4f20`(#459「workspace-detection の言語走査を全トップレベル dir へ一般化」)。`git show 765fe4f20` 参照可。元修正は「SCAN_EXCLUDE とドット始まりを除く全トップレベル dir を再帰対象へ(深さ6・symlink 除外は維持)」に一般化していた。現行は `SCAN_SOURCE_DIRS` 限定へ逆戻り。

### #847 — sensor-linter が eslint ラップ専用に逆戻りし lint:check 2段検出が不在【現存】

- **現行 file:line**: `packages/framework/core/tools/amadeus-sensor-linter.ts`(全357行)。冒頭のドキュメントコメント `:5-43` および実装全体が `bunx eslint` ラップ専用。
- **欠陥の実証**: 同ファイルを `lint:check` / `scripts` / `bun run` / `npm run` で grep してもヒット無し(package.json script の probe が存在しない)。ファイル冒頭が挙動を明示:
  ```
  // contained: no imports from sibling tools. Wraps `bunx eslint --format
  ```
  実装は `bunx eslint --version`(可用性)・`bunx eslint --print-config`(config 有無)・`bunx eslint --format json`(実 lint)のみで、workspace の `package.json` が `lint:check` script を宣言する場合にそれをラップする1段目が無い。よって Biome 等 eslint 非採用の repo(本 repo 自身)では常に 127 quiet PASS になり実 linter が gate で発火しない。
- **元修正**: `c6597bf18`(#538「linter sensor を 2 段検出化し実 linter を gate で有効化」)。`git show c6597bf18` 参照可。元修正は「workspace の package.json が `lint:check` を宣言 → `bun run lint:check` をラップ(非0 = 1 violation として診断出力を message 格納)、不在なら従来の eslint 検出 → 127 quiet PASS」の2段検出を追加していた。現行は1段目(lint:check ラップ)が失われ eslint 専用に逆戻り。

### #848 — docs-only intent の workspace_requires 免除経路(declare-docs-only / GUARD_EXEMPTED)が喪失【現存】

- **現行 file:line**: 免除経路自体が不在。`grep -rn "declare-docs-only|GUARD_EXEMPTED" packages/framework/core/tools/` は**0ヒット**(exit 1、実測済み)。`docsOnly` も 0ヒット。
- **現行 workspace_requires ガード実装箇所**(免除なしの拒否経路のみ現存):
  - `amadeus-state.ts:952` `verifyStageArtifacts` — `:967-975` で `stage.workspace_requires && !workspaceHasWork(pd)` なら無条件 `error()`。免除分岐が無い:
    ```ts
    if (stage.workspace_requires && !workspaceHasWork(pd)) {
      error(`Refusing to complete "${stage.slug}": it is a code-producing stage (workspace_requires) ...`);
    }
    ```
    `workspaceHasWork` は `:941`、approve/advance/finalize/complete-workflow から mutation 前に呼ばれる(`:949-951`)。
  - `amadeus-lib.ts:41`(型宣言 `workspace_requires?: boolean`)、`:3774-3782`(YAML parse でのスカラ boolean 化)、`:4015`/`:4071`(serialize round-trip)。
  - `amadeus-graph.ts:368`(パーサのキー登録)、`:1576-1577`(`stage.workspace_requires = parsed.workspace_requires`)。
  - `amadeus-stage-schema.ts:22-26`(フィールド定義)、`:115`(OPTIONAL_FIELDS)、`:198-206`(boolean 型検査)。
- **元修正**: `c8ddabffc`(#498 #499 #501、B002=#499)。`git show c8ddabffc` 参照可。元修正 B002 は「registry の docsOnly 宣言(`amadeus-state.ts declare-docs-only`、evidence は形式検査 + audit 実在照合)で workspace_requires ガードを免除でき、免除発動を `GUARD_EXEMPTED` として audit に記録。宣言なしの拒否経路は従来どおり(#366 型検出の保全)」を追加していた(主変更は `amadeus-lib.ts` +104、`amadeus-audit.ts`、`audit-format.md`)。現行は declare-docs-only サブコマンド・GUARD_EXEMPTED audit・免除分岐が全て失われ、拒否経路のみ現存。

## codekb 更新推奨点

1. **code-structure / architecture**: 6欠陥はいずれも「過去の修正が restart/reset で喪失し逆戻りした回帰」であり、`amadeus-orchestrate.ts` / `amadeus-jump.ts` / `amadeus-sensor-linter.ts` / `amadeus-utility.ts` / `amadeus-state.ts` の該当関数が元修正前の状態にある旨を、元修正コミット SHA(#486=3eca83a56, #481=2c2c48a39, #459=765fe4f20, #538=c6597bf18, #499=c8ddabffc)と対で codekb に接地する。Architect 合成で「元修正との差分再接地」を行う際の一次材料。
2. **code-quality-assessment(対称性欠損クラスタ)**: #842(forward⇔backward 非対称の emit)・#836(init で書くが advance/approve で更新しない write⇔update 非対称)は team.md の `symmetric-pair-review`(cid:requirements-analysis:symmetric-pair-review、write⇔check / emit⇔terminal / fork⇔merge)クラスタに該当。codekb の品質評価に「対称対の片側喪失」パターンとして記録推奨。
3. **workspace-detection 根拠(project.md Mandated: CodeKB 根拠参照)**: #840 の `detectWorkspace` 現状(SCAN_SOURCE_DIRS 限定)は本 repo 自身(コードが `packages/` 配下)を Greenfield 誤判定しうるため、`technology-stack` / `code-structure` の workspace 分類根拠に現行の限界を明記。
4. **差分俯瞰の履歴ラベル(cid:reverse-engineering:c3-relabel)**: 前回 batch5 節に残る現在時制マーカーがあれば本 batch 節追記前に履歴ラベル(intent 名+日付)へ更新すること。本スキャンでは codekb 本体は未編集(scan-notes のみ)。
