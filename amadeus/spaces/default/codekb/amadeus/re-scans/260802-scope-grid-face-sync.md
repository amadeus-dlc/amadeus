# RE 差分リフレッシュ記録: 260802-scope-grid-face-sync

上流入力(consumes 全数): なし(RE は起点ステージ。入力は intent-statement と Issue #2033、およびクロスレビュー 2 名の CONFIRMED_WITH_REFINEMENTS verdict)

- Date: `2026-08-02T10:27:57Z`
- Base commit: `33e196b80b2254eee733fcaec4359dfbdd29c24b`(前回 observed = 260801-tla-multi-model。祖先性実測: `git merge-base --is-ancestor 33e196b80 47574fbab` exit 0)
- Observed commit: `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`(`chore(metrics): maintain snapshots at 6b68dd65b8bf6fc1ae97a5c33ffb5b849ea7ecfb (#2027)`、origin/main tip)
- Distance: `57 commits`(`git rev-list --count 33e196b80..47574fbab`)
- 区間規模: `1295 files changed, 74640 insertions(+), 10737 deletions(-)`(`git diff --shortstat 33e196b80..47574fbab`)
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal、Test Strategy: 既存 CI ブロッキング集合を維持
- Scan mode: **differential refresh**。base 候補は re-scans/ の observed を新しい順に確認し、直近かつ祖先である 260801-tla-multi-model の `33e196b80` を採用。Developer scan の結果を Architect が observed で全 file:line 再実測して二重化(下記「引用再確認」)
- Focus: Issue #2033 — 2026-07-28 の self-feature lightening 決定が `.claude` 1 面にしか着地せず、他 4 dogfood 面(`.codex` / `.cursor` / `.kimi-code` / `.opencode`)が決定前の姿のまま残存。患部 = grid 5 面 + scope prose 3 種 × 4 面 + 検査機構(self-scope-consistency センサー)+ 周辺ガード 3 層

## 患部 touch 判定(`33e196b80..47574fbab`)

| パス | 区間内コミット数 | 判定 |
| --- | --- | --- |
| `.claude/tools/data/scope-grid.json` | 0 | 無変更 |
| `.codex/tools/data/scope-grid.json` | 0 | 無変更 |
| `.cursor/tools/data/scope-grid.json` | 0 | 無変更 |
| `.kimi-code/tools/data/scope-grid.json` | 0 | 無変更 |
| `.opencode/tools/data/scope-grid.json` | 0 | 無変更 |
| `packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts` | 0 | 無変更 |
| `scripts/promote-self.ts` | 0 | 無変更 |
| `packages/framework/core/tools/amadeus-graph.ts` | 0 | 無変更 |
| `tests/unit/t370-promote-self-scopegrid-order.test.ts` | 0 | 無変更 |
| `.github/workflows/ci.yml` | 1(`f87cf9389` #2012) | 変更は formal-model-check ジョブのステップ名 / echo 文言のみ。drift guard ステップ群 `:243-255` は無変更 |

コマンド: `git log --oneline 33e196b80..47574fbab -- <path> | wc -l` を 10 パスへ個別適用。

**結論**: 乖離は区間内に新規導入されたものではなく、`33e196b80` 以前からの残存。前回 RE の断面でも同じ姿だった。

## 乖離の現存(observed `47574fbab` 実測)

### grid セル(self-feature)

| 面 | feasibility | approval-handoff | practices-discovery | nfr-requirements | formal-model-check | EXECUTE 数 / 総セル |
| --- | --- | --- | --- | --- | --- | --- |
| `.claude` | SKIP | SKIP | SKIP | SKIP | EXECUTE | 15 / 33 |
| `.codex` | EXECUTE | EXECUTE | EXECUTE | EXECUTE | (キー不在) | 18 / 32 |
| `.cursor` | EXECUTE | EXECUTE | EXECUTE | EXECUTE | (キー不在) | 18 / 32 |
| `.kimi-code` | EXECUTE | EXECUTE | EXECUTE | EXECUTE | (キー不在) | 18 / 32 |
| `.opencode` | EXECUTE | EXECUTE | EXECUTE | EXECUTE | (キー不在) | 18 / 32 |

測定: 各面の `tools/data/scope-grid.json` を JSON parse し `self-feature.stages` を直読。

### scope 行の在不在

- 5 面共通: `chore` / `enterprise` / `feature` / `fix` / `infra` / `mvp` / `poc` / `refactor` / `security-patch` / `self-document` / `self-feature` / `self-fix` / `self-refactor` / `workshop`(14 行)
- `installer-distribution`: `.claude` / `.kimi-code` のみ存在(15 行)、`.codex` / `.cursor` / `.opencode` に不在。`self-` 接頭辞でないため現行センサーの走査対象外だが、走査範囲を広げる設計では 32 セル全体が scope-absent 差分として現れる

### prose(`scopes/amadeus-self-*.md`、`.claude` 対 各面の `diff` 行数)

| scope | vs `.codex` | vs `.cursor` | vs `.kimi-code` | vs `.opencode` | 差分の内容 |
| --- | --- | --- | --- | --- | --- |
| `self-feature` | 17 | 17 | 17 | 17 | `.claude` のみ lightening 段落(`Lightened 2026-07-28 (user decision, evidence-mined from the 10 most recent completed self-feature intents)` 以下 9 行)を保持。他 4 面は旧文 `uses the same 18-stage route:` と NFR 込みの spine 記述 |
| `self-document` | 4 | 4 | 4 | 4 | `.claude` のみ `Lightening review 2026-07-28: only one completed self-document intent exists, too few for the evidence-mining methodology that lightened self-feature. Revisit once completed intents accumulate.` |
| `self-refactor` | 4 | 4 | 4 | 4 | `.claude` のみ `Lightening review 2026-07-28: no completed self-refactor intent exists yet, so the evidence-mining methodology that lightened self-feature has no data to work from. Revisit once completed intents accumulate.` |
| `self-fix` | 0 | 0 | 0 | 0 | 一致(是正不要) |

4 面の差分内容は互いに同一(`.claude` 対 `.codex` の diff を代表として全文確認済み)。

### 意図的非対称(是正対象から除外すべき第 5 差分)

`self-feature.formal-model-check` の `.claude` のみ EXECUTE は**設計どおり**。一次根拠は `packages/framework/core/tools/amadeus-graph.ts` の `mergeComposedScopes` 直上コメント:

- `:1375` — `A folded row's CELLS are preserved verbatim, including a cell addressing a`
- `:1387` — `reporting: the shipped grid carries \`self-feature.formal-model-check\`, so`

opt-in plugin ステージ(`scopes: []`)は `applyPluginScopeOptIns` でセルを mint しないため、当該 plugin を compose 済みの `.claude` だけがセルを持つ。導入は `242e4175a`。

## ガード 3 層の実行結果と盲点機序(observed で再実行)

### 1. `scripts/promote-self.ts`

- prose: `COMPOSED_SCOPE_RE`(`:124`、`/^\.[^/]+\/scopes\/amadeus-[^/]+\.md$/`)が orphan 走査から除外(`:455` `if (COMPOSED_SCOPE_RE.test(rel)) continue; // composed scope — runtime data, never in dist`)。prose は比較経路に入らない
- grid: `scopeGridInSync(got, want)`(`:132-134`)は `mergeScopeGrid(got, want).equals(got)`。`mergeScopeGrid`(`:146-166`)は `:151` で `const extras = Object.keys(g).filter((k) => !Object.hasOwn(w, k));` を取り、`:156` の `.map((k) => [k, Object.hasOwn(w, k) ? w[k] : g[k]])` で **dst 側の値を verbatim 保持**
- dist 実測: `dist/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}/<face>/tools/data/scope-grid.json` の 7 ファイルとも `total_rows=10`、`self_rows=NONE`。すなわち `self-*` 行はすべて extras に落ち、値の一致判定を一度も受けない(自面の値がそのまま期待値になる = 恒真)
- 実行: `bun run promote:self:check` → **exit 0**(`promote-self --check: project-local self install is in sync`)

### 2. `amadeus-graph.ts compile --check`

- `mergeComposedScopes`(`:1394-1421`)は `:1409` `if (name in merged) continue;` により、fresh(compile 結果)に無いキー = folded row のセルを on-disk から verbatim 保存。セル値は compile 結果と衝突しない
- 検査面の単一性: `scopeGridPath()`(`:330-332`、`process.env.AMADEUS_SCOPE_GRID ?? join(DATA_DIR, "scope-grid.json")`)の `DATA_DIR` は `:197` `join(__FILE_DIR, "data")` — 起動した tool 自身のディレクトリ基底。CI は `.github/workflows/ci.yml:255` `bun .claude/tools/amadeus-graph.ts compile --check` で **`.claude` 1 面のみ**を検査
- 実行: `bun .claude/tools/amadeus-graph.ts compile --check` → **exit 0**

### 3. `self-scope-consistency` センサー

正本 `packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts`(231 行、`wc -l` 実測)。

- `readGridScopes`(`:110-137`): `:115` で JSON parse したうえで `:116-117`
  ```
  for (const scope of Object.keys(grid)) {
    if (scope.startsWith("self-")) scopes.add(scope);
  ```
  — **名前だけを収集し、値である `.stages`(= セル全体)を読み捨てる**
- `compareExpected`(`:153-172`): 定数 `EXPECTED_SELF_SCOPES`(`:12-17`、`self-document` / `self-feature` / `self-fix` / `self-refactor`)との名前集合比較のみ。**面間比較のコードが存在しない**
- `frontmatterName`(`:53-58`)/ `inspectScopeFile`(`:60-94`): prose は frontmatter の `name:` のみ抽出し本文を読み捨てる
- 5 面コピーの同一性: `cmp -s packages/framework/core/tools/... <face>/tools/...` が 5 面とも IDENTICAL。どの面から起動しても同じ盲点
- 実行: `AMADEUS_PROJECT_DIR=$PWD bun packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts --stage code-generation --output-path /dev/null` → `{"pass":true,"findings_count":0,"findings":[],"skipped":null}`、exit 0

### 4. manifest の文言が盲点を前提化

`packages/framework/core/sensors/amadeus-self-scope-consistency.md`:

- `:5` `default_severity: advisory`
- `:8` `matches: "**/{scopes/amadeus-self-*.md,tools/data/scope-grid.json}"`
- `:12-20` `output_schema`(`pass` / `findings_count` / `findings[]`(harness / surface / reason / scope / path) / `skipped`)
- `:37-38` 本文 — `The check is advisory at write time. Package and promotion drift guards remain the release-blocking verification surfaces.`

上記 1・2 のとおり package / promotion drift guard は `self-*` 行を構造的に見ない。**advisory センサーが release-blocking と呼んだ相手が、当のセンサーが見ている領域を見ていない** — 3 層すべてが「別の層が見ているはず」という前提で空白を作っている。

## センサー拡張の挿入点(正本 file:line、observed 実測)

| 記号 | 行 | 現状 | 拡張の性質 |
| --- | --- | --- | --- |
| `SELF_HARNESSES` | `:11` | 5 面配列 | 変更不要 |
| `EXPECTED_SELF_SCOPES` | `:12-17` | 4 scope 名 | **値の定数化は不可**(grid と並ぶ第 2 正本を作る)。面間比較なら期待値を持たない |
| `Finding` | `:26-32` | `surface: "scope-file" \| "scope-grid"`、`reason: missing \| unexpected \| name-mismatch \| unreadable` | cell-mismatch / body-mismatch 系 reason と stage / expected / actual フィールドの追加。manifest `output_schema :12-20` と対で改訂 |
| `HarnessSnapshot` | `:41-46` | `fileScopes` / `gridScopes` の名前集合のみ | **主要挿入点** — gridRows / prose 本文の保持フィールド追加 |
| `SurfaceSnapshot` | `:48-51` | 同上 | 同上 |
| `frontmatterName` | `:53-58` | `name:` のみ抽出 | prose parity には本文 retain が要る |
| `inspectScopeFile` | `:60-94` | 本文読み捨て | 同上 |
| `readGridScopes` | `:110-137` | `:115` parse 済み / `:116-117` で名前のみ収集 | **最小侵襲点** — parse 結果の `stages` を retain するだけで材料が揃う |
| `compareExpected` | `:153-172` | 定数との名前集合比較 | 変更不要 |
| `evaluateSelfScopeConsistency` | `:174-211` | `:177` 全面 snapshot、`:180-185` dormant 判定、`:190-204` flatMap | **cross-face 比較の唯一の呼び出し点は `:190-204` の flatMap 直後**(snapshots 全件が揃う唯一の場所)。dormant 判定 `:180-185` は変更不要 |
| CLI `main` | `:213-229` | `--stage` / `--output-path` 必須、`AMADEUS_PROJECT_DIR` 基底 | 変更不要 |

`scope-grid.json` は flat 構造(top-level が scope 名、値が `{ stages: {...} }`)であることを実測確認済み — `scopes` ラッパーは無く、`Object.keys(grid)` は scope 名を直接列挙している。

## テスト景観

- **既存センサーテスト**: `tests/integration/t-self-scope-consistency-sensor.test.ts`(217 行、無番号命名、6 test、in-process 駆動)。fixture `seedHarness`(`:22-34`)は `:33` で
  ```
  const grid = Object.fromEntries(gridScopes.map((scope) => [scope, { stages: {} }]));
  ```
  — **全 scope を空 `stages` で seed** するため、値比較を足す場合は全 fixture の更新が必須(空のままでは新検査が vacuous に通る)
- **`tests/unit/t370-promote-self-scopegrid-order.test.ts`**(`:50` describe、9 test): `mergeScopeGrid` / `scopeGridInSync` のキー順対称性・冪等性・prototype 名 scope の保存を pin。**セル値の面間一致は pin していない**(`:78` "composed values survive canonicalisation" は 1 面内の値保存)
- **センサー id の pin**: `tests/integration/t93.test.ts:100-108` の `EXPECTED_IDS`(8 件: answer-evidence / event-registry-drift / linter / model-completeness / required-sections / **self-scope-consistency(`:106`)** / type-check / upstream-coverage、`:141` で `expect(ids).toEqual(EXPECTED_IDS)`)、`tests/integration/t89.test.ts:366`(code-generation の `sensors_applicable`、コメント `:139`)
- **発火経路**: `sensors:` を宣言するステージは `code-generation` のみ(`grep -rln "self-scope-consistency" packages/framework/core/amadeus-common/stages/` が 1 ファイル)。frontmatter は `code-generation.md:39-44`(`- self-scope-consistency` は `:44`)。ディスパッチャに個別分岐なし、CI にセンサー実行ステップなし
- **テスト番号**: unit / integration とも最大 `t412`。`t413` は未使用(`ls tests/*/t413*` 該当なし)だが、別ブランチ `fix/2033-self-scope-grid-face-sync` に止血用の `t413` face-parity テストの WIP が存在するため **`t413` は予約済み**として扱う。追加が必要なら `t414` 以降

## 区間の構造変化(患部外、codekb 鮮度用)

1. `#2017` — `amadeus-layered-config` → `amadeus-config` の全域リネーム(167 ファイル)
2. `#2012`(`f87cf9389`) — formal-model-check の全登録 TLA モデル一般化。FormalElection 固定語彙を `model-map.json` 側へ移設(前回 RE の現在節が扱った 6 露出面の一般化が着地)
3. plugin compose 読取境界の fail-closed 化(`#1964` / `#1996` / `#2005` / `#1970`、新規 `t410` / `t411`)
4. fatal-latch 系 loud fail の徹底(`#1959` / `#1961` / `#1966` / `#2000`)
5. cg-plan-guard 3 Bolt(`#1928` / `#1939` / `#1948`)+ `#2016` mirror label 同期(`t412`)

残りは metrics スナップショット群。いずれも患部と交差しない。

## 引用再確認の結果(Architect が observed `47574fbab` で再実測)

| 対象 | Developer 報告 | 再実測 | 判定 |
| --- | --- | --- | --- |
| base 祖先性 / 距離 | 祖先・57 コミット | `--is-ancestor` exit 0 / `rev-list --count` = 57 | 一致 |
| 患部 9 パスの touch | 0 コミット | 9 パスとも 0 | 一致 |
| `ci.yml` の touch | 1 件(`f87cf9389`)、drift guard `:243-255` 無変更 | `git log` 1 件、`:243` / `:246` / `:254-255` を直読し無変更を確認 | 一致 |
| self-feature 4 セルの乖離 | claude SKIP vs 他 EXECUTE、15/33 vs 18/32 | JSON 直読で一致 | 一致 |
| prose 差分行数 | 17 / 4 / 4 / 0 | `diff \| grep -c '^[<>]'` で一致 | 一致 |
| `readGridScopes` の名前のみ収集 | `:110-137`、`:116-117` | 行番号・内容とも一致 | 一致 |
| `compareExpected` | `:153-172` | 一致 | 一致 |
| `HarnessSnapshot` / `SurfaceSnapshot` | `:41-46` / `:48-51` | 一致 | 一致 |
| `evaluateSelfScopeConsistency` | `:174-211`、呼び出し点 `:190-204` | 一致 | 一致 |
| `mergeScopeGrid` extras 素通し | `:151` / `:154-157` | `extras` 定義は `:151`、値の verbatim 保持は `:156`(`.map((k) => [k, Object.hasOwn(w, k) ? w[k] : g[k]])`) | 一致(保持行を `:156` に精密化) |
| `mergeComposedScopes` | `:1394-1421`、`:1409` | 一致 | 一致 |
| 設計コメント | 「A folded row's CELLS…」「the shipped grid carries…」 | `:1375` / `:1387` に verbatim 実在 | 一致 |
| `scopeGridPath()` / `DATA_DIR` | `:330-332` / `:197` | 一致 | 一致 |
| manifest `:5` / `:8` / `:37-38` | advisory / matches / 委譲文言 | verbatim 一致 | 一致 |
| 5 面センサーコピー byte 一致 | cmp 一致 | 5/5 IDENTICAL | 一致 |
| dist の self-* 行 | dist grid に self-* なし | 7 ファイルとも `total_rows=10` / `self_rows=NONE` | 一致(件数を補強) |
| ガード実行結果 | promote:self:check exit 0 / compile --check exit 0 / sensor pass:true | 3 件とも再現 | 一致 |
| `seedHarness` 空 stages | `:22-34` | `:33` に `{ stages: {} }` を verbatim 確認 | 一致 |
| `t93` EXPECTED_IDS | `:106`、8 件 | `:100-108` に 8 件、self-scope-consistency は `:106` | 一致 |
| `t89` pin | `:139` / `:366` | `:139` はコメント、`:366` が値 | 一致 |
| `code-generation.md` sensors | `:44` | `sensors:` ブロックは `:39-44`、self-scope-consistency は `:44` | **精密化**(ブロック範囲を追記) |
| 最大テスト番号 | t412、次は t413 | `t412` 最大、`t413` 不在 | 一致 |
| 区間規模 | (未報告) | `1295 files changed, 74640 insertions(+), 10737 deletions(-)` | 新規実測 |

訂正 2 件はいずれも行番号の精密化であり、機序の主張・結論に影響しない。

## 後続ステージへの引き継ぎ

1. **止血の対象は 4 セル + prose 3 ファイル × 4 面**。`formal-model-check` セルと `installer-distribution` scope は意図的非対称であり同期対象に含めない — 一次根拠は `amadeus-graph.ts:1375` / `:1387`
2. **再発防止の設計制約**: 期待セル値の定数化は第 2 正本を作るため不可。面間比較(全面一致を不変条件とし、opt-in plugin が mint するセルを機序で除外)が構造的に安全
3. **テストは両側実測が必須**: 面間不一致 fixture での落ちる実証と、現行 5 面の実データでの corpus sweep(意図的非対称のみ除外され残り 0 件)。fixture は空 `stages` のままでは vacuous に通る
4. **manifest 文言 `:37-38` の是正**を再発防止に含める — 塞ぐ対象の盲点をそのまま前提として文書化しているため、機構だけ直して文言を残すと次の読み手に同じ誤解を与える
5. **発火経路の狭さ**(`code-generation` ステージのみ、CI 実行なし)をそのままにするかは要件段の判断事項。検査を強くしても発火しなければ実効は上がらない
