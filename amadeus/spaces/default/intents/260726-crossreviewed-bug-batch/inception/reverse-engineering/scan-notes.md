# Reverse Engineering — Developer スキャン結果(差分リフレッシュ)

対象 intent: 260726-crossreviewed-bug-batch(クロスレビュー済みバグ7件バッチ)
スキャン方式: 差分リフレッシュ(フルスキャン禁止)

## 測定 ref(全数値・全 file:line の基準)

| 項目 | 値 |
|---|---|
| 測定 ref(observed) | `1673c433209c74820881c75a0816bbce3fb2d512`(HEAD) |
| ブランチ | `worktree-bugfix` |
| 差分 base | `e12259ba78b8c56bf3572c9bfd44a7bdf84d681c` |
| 区間コミット数 | 2(`git log --oneline base..HEAD` の転記) |

本ドキュメントの file:line はすべて **observed = `1673c4332`** での実測値。

---

## 1. 区間サマリ(base → observed)

`git log --oneline e12259ba7..HEAD` 実測:

```
1673c4332 chore(metrics): record snapshot (#1501)
10d8bcfbb fix(grants): standing grant の gate スコープ判定を scope-grid 由来解決へ修正(#1497) (#1499)
```

### 実装面の変更(正本)

`git show --stat 10d8bcfbb` の転記では 51 ファイル変更だが、**正本(`packages/framework/core/`)の実装変更は `amadeus-lib.ts` 1ファイルのみ**(38行変更)。残りは以下の増幅・記録面である:

| 面 | 内訳 |
|---|---|
| 正本実装 | `packages/framework/core/tools/amadeus-lib.ts`(1ファイル) |
| self-install 増幅 | `.claude/` `.codex/` `.cursor/` `.opencode/` の `tools/amadeus-lib.ts`(4ファイル、各38行) |
| dist 増幅 | `dist/{claude,codex,cursor,kiro-ide,kiro,opencode}/…/amadeus-lib.ts`(6ファイル、各38行) |
| テスト | `tests/unit/`・`tests/integration/`・`tests/harness/`(新規 `t-standing-grant-composed-scope.test.ts` 403行 ほか) |
| 記録 | codekb 差分リフレッシュ、intent record `260726-grant-scope-gate/`、`intents.json` |

`1673c4332` は record snapshot のみでコード面の変更なし。

### 変更の意味論(実 diff 直読)

`standingGrantSatisfiesGate` が `stage.scopes`(stock 語彙のみを持つ stage frontmatter)を読んでいたため、composed scope(`amadeus-*`)が全ステージで out-of-scope と解決され、全ゲートが phase-boundary 扱い・walking-skeleton 除外が不発だった欠陥の修正。新規 private 関数 `scopeStageActions`(`packages/framework/core/tools/amadeus-lib.ts:3971` 付近)を追加し、engine 正準の scope-grid 解決(`loadScopeMapping` の EXECUTE 集合)へ差し替え、解決不能時は fail-closed で `null` → ゲート非カバー(人間承認へフォールバック)。

### 本 intent の7件への影響

**区間内で対象7件のいずれも修正されていない。** クロスレビュー時点 `1c43438df` と observed `1673c4332` の間で、対象ファイル群の diff は `amadeus-lib.ts`(35 insertions / 3 deletions = 上記 #1497 修正)のみであることを実測確認した。

なお `1c43438df` は observed の祖先ではない(`git merge-base --is-ancestor 1c43438df HEAD` exit=1)。これは `1c43438df` がローカル側のマージコミットであり、その第一親側の内容が base `e12259ba7` として本 worktree に入っているため。base `e12259ba7` は `1c43438df` の祖先である(exit=0)ことを実測確認しており、患部の同一性は上記ファイル別 diff で担保されている。

---

## 2. Issue 別 患部実測

### #1489 P2/S3 — Intent Mirror benchmark 分散ゲートの偽赤

**現存判定: 現存**

患部 file:line(observed `1673c4332`):

`scripts/mirror-distribution-benchmark-aggregate.ts:20`
```ts
const DISPERSION_NOISE_FLOOR_FRACTION = 0.005;
```

`scripts/mirror-distribution-benchmark-aggregate.ts:33-35`
```ts
  const absoluteSpread = maximum - minimum;
  const noiseFloor = p95BudgetMs * DISPERSION_NOISE_FLOOR_FRACTION;
  return maximum / minimum > 2 && absoluteSpread > noiseFloor;
```

`scripts/mirror-distribution-benchmark-aggregate.ts:61-62`
```ts
    if (exceedsDispersionLimit(p95, budget.p95BudgetMs))
      findings.push(`${name}: replica dispersion exceeds 2.0`);
```

予算側 `scripts/mirror-distribution-benchmark.ts:18-19`
```ts
    docsParity: { p95BudgetMs: 2_000, rssBudgetBytes: 512 * 1024 * 1024 },
    digestMatrix: { p95BudgetMs: 2_000, rssBudgetBytes: 128 * 1024 * 1024 },
```

**派生値(算出式併記)**: `docsParity`/`digestMatrix` の noise floor = `2_000 × 0.005 = 10`(ms)。Issue 本文の「noise floor が 10ms しかない」は observed の定数から再計算して一致する。

判定は `min/max 比 > 2` の **AND** `絶対差 > noise floor` であり、3 replica の min/max 比は単一外れ値で壊れる(中央値ベースでない)。`:30` の `if (minimum <= 0) return true;` も実在。

CI 消費側(`.github/workflows/ci.yml`):
- `:147-148` `distribution-benchmark:` / `name: Intent Mirror benchmark (${{ matrix.replica }})`
- `:178-180` `distribution-benchmark-aggregate:` / `name: Intent Mirror benchmark aggregate` / `needs: distribution-benchmark`
- `:199-200` replica JSON を収集して `bun run distribution:benchmark:aggregate -- "${replicas[@]}"` を実行
- `:205` `needs: [changes, check, distribution-benchmark-aggregate]` — 集約ジョブが下流ゲートに入る
- `:211` `PERFORMANCE_RESULT: ${{ needs.distribution-benchmark-aggregate.result }}`

**影響面(増幅)**: なし。`git ls-files "*mirror-distribution-benchmark-aggregate.ts"` の結果は `scripts/mirror-distribution-benchmark-aggregate.ts` の1件のみで、dist/self-install への増幅対象外(repo ローカルの CI スクリプト)。

**修正時に触る想定ファイル目録**:
- `scripts/mirror-distribution-benchmark-aggregate.ts`(判定ロジック・定数)
- `scripts/mirror-distribution-benchmark.ts`(ワークロード別 noise floor を導入する案を採る場合)
- `.github/workflows/ci.yml`(replica 数を増やす案を採る場合のみ — `:147-148` の matrix と `:199` の収集)
- `tests/integration/t292-mirror-distribution-performance.integration.test.ts`(`aggregateMirrorBenchmarks` の既存消費テスト)
- 落ちる実証: 単一 replica スパイクで**赤くならない**こと、および真の退行で**赤くなる**ことの両側実測が要る(comparative-gate-injection-sizing に該当 — 注入量は実測 delta から機械計算する)

**仮説**: Issue の対処案3案(中央値乖離・ワークロード別 noise floor・replica 増+外れ値棄却)はいずれも「どれだけの退行を検出できなくなるか」の検出力低下を伴う。どの案でも両側実測が完成条件になる、と見る(未検証)。

---

### #1457 P2/S3 — handleVerify が verifySelf へ自己相関引数を渡す(検証劇場)

**現存判定: 現存**

呼び出し側 `packages/framework/core/tools/amadeus-election.ts:486, 494, 503`
```ts
  const resolved = resolveBallots(ballots);
```
```ts
  const freq = GoaFreq.fromVotes(resolved.map((b) => b.goa));
```
```ts
  const self = verifySelf(resolved.length, resolved, freq, timeline);
```

被呼び出し側 `packages/framework/core/tools/amadeus-election-record.ts:186, 193, 196`
```ts
export function verifySelf(
```
```ts
  if (ledgerCount !== ballots.length) {
```
```ts
  const recomputed = GoaFreq.fromVotes(ballots.map((b) => b.goa));
```

Issue の主張どおり、`ledgerCount = resolved.length` と `ballots = resolved` が同一配列由来、`storedFreq = freq` と `recomputed` が同一 `resolved` 由来のため、ballot-count / freq-mismatch の2分岐は恒久 false。

doc コメント(`amadeus-election-record.ts:182-185`、verbatim)は設計意図を明言している:
```ts
// three classes, all findings enumerated: ballot count (ledger vs materialized),
// GoA frequency (stored vs recomputed), timeline monotonicity (ISO strings sort
// chronologically). The check recomputes from the ballots rather than comparing
// the record to itself (no verification-theatre self-reference).
```
すなわち **設計は self-reference 回避を明言しており、caller の配線が設計から逸脱している**(原因の所在=実装、Issue の帰属と一致)。

なお Issue が「実効カバーあり」とする経路も observed で実在を確認した:
- `amadeus-election.ts:495-496` `checkGoaLine(document, freq)` — record.md の GoA 行を parse して照合
- `amadeus-election.ts:487-490` `recomputed = tally(...)` と `t.result` の比較
- timeline 単調性は `verifySelf` 第3クラスとして生きている(`amadeus-election-record.ts:200` 以降のループ、`receivedAt ?? at` の receipt 軸)

したがって **未ガードなのは「ledger.json 件数 vs materialize 済み集合の件数」の乖離のみ**、という Issue の限定も observed で成立する。

**影響面(増幅)**: 大。`amadeus-election.ts` / `amadeus-election-record.ts` はいずれも `packages/framework/core/tools/` 配下で、`git ls-files` 実測で正本以外に **各10コピー**(dist 6 + self-install 4)が存在する。修正は `bun scripts/package.ts` + `bun run promote:self` での同期が必須。

**修正時に触る想定ファイル目録**:
- 正本: `packages/framework/core/tools/amadeus-election.ts`(caller 配線)
- 正本: `packages/framework/core/tools/amadeus-election-record.ts`(`verifySelf` シグネチャ/責務整理を伴う場合)
- 生成物: 上記2ファイルの dist 6 + self-install 4 コピー(手編集禁止・再生成)
- テスト: `tests/unit/t238-election-record.test.ts`(`verifySelf` 単体)、`tests/integration/t236-election-loop.integration.test.ts`(verify verb の経路)
- 落ちる実証: ledger と materialized 集合を意図的に乖離させ ballot-count 分岐が赤くなること(Issue の修正方針が明記)

---

### #1377 P3/S3 — audit シャードが `intents/audit/`(intent セグメント欠落)へ書かれる

**現存判定: 現存**(ただし Issue が実測した発現経路の一部は封鎖済み)

パス構築の患部 `packages/framework/core/tools/amadeus-lib.ts:3326-3328`
```ts
export function auditFilePath(projectDir: string, intent?: string, space?: string): string {
  const dir = recordDir(projectDir, intent, space);
  if (dir === null) return join(spaceRecordRoot(projectDir, space), "audit", auditShardName(projectDir));
```

`spaceRecordRoot` は intents ディレクトリそのもの(`packages/framework/core/tools/amadeus-lib.ts:1500-1502`):
```ts
function spaceRecordRoot(projectDir: string, space?: string): string {
  return intentsDir(projectDir, space);
}
```

したがって intent 解決失敗時のフォールバック先は **`amadeus/spaces/<space>/intents/audit/<host>-<clone>.md`** = Issue が報告した異常パスそのもの。

書き込み側にガードはなく、ディレクトリを**再帰生成する**(`packages/framework/core/tools/amadeus-audit.ts:258-262`):
```ts
function ensureAuditFile(projectDir: string, intent?: string, space?: string): string {
  const path = auditFilePath(projectDir, intent, space);
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
```

**対照(部分封鎖の実測)**: 同族の `auditShardDir`(`amadeus-lib.ts:4126-4131`)は **null を返して fail-closed** に倒れており、非対称が残っている:
```ts
export function auditShardDir(projectDir: string, intent?: string, space?: string): string | null {
  const dir = recordDir(projectDir, intent, space);
  if (dir === null) return null;
```

また `amadeus-log.ts:34-42` には本ハザードを明示的に名指しするガード `resolveActiveProjectDir` が既に入っている(header コメント `:20-33` が「Emitting there would drop an audit shard DIRECTLY into the bare intents root and break the "no amadeus-state.md / no audit/ ever lives directly in the bare intents root" invariant」と verbatim で記述)。すなわち **`amadeus-log` 経由の emitter は封鎖済みだが、`appendAuditEntry` を直接呼ぶ他の emitter(Issue が実測した `RULE_LEARNED` = `amadeus-learnings.ts:624` 付近)には同ガードが無い**。

**仮説(未確定)**: Issue の推定機序(worktree に active-intent カーソルが無く record prefix が空解決)は observed のコードと整合するが、`RULE_LEARNED` 経路での決定的再現は本スキャンでは未実施。修正設計時に再現を取ることを推奨する。

**影響面(増幅)**: 大。`amadeus-lib.ts` / `amadeus-audit.ts` とも各10コピー(dist 6 + self-install 4)。

**修正時に触る想定ファイル目録**:
- 正本: `packages/framework/core/tools/amadeus-lib.ts`(`auditFilePath` を `auditShardDir` と対称に fail-closed 化する案の場合。`stateFilePath:3313-3316` も同型フォールバックを持つため symmetric-pair-review の対象)
- 正本: `packages/framework/core/tools/amadeus-audit.ts`(`ensureAuditFile` 側でガードする案の場合)
- 正本: `packages/framework/core/tools/amadeus-learnings.ts`(emitter 側でガードする案の場合)
- 生成物: 上記の dist 6 + self-install 4 コピー
- テスト: `tests/e2e/t07-audit-fork-merge.test.ts`、`tests/e2e/t54-workflow-audit-completeness.test.ts`
- 落ちる実証: intent 未解決状態で audit emit を行い、`intents/audit/` が作られる(修正前)/ loud に失敗する(修正後)ことを固定

---

### #1459 P3/S3 — Election.parse が重複 internalNo / 重複 voter / 空 choices を無音受理

**現存判定: 現存**

`packages/framework/core/tools/amadeus-election-model.ts:62`(`parseChoices` — 型のみ検査、重複も空配列も通す)
```ts
function parseChoices(raw: unknown): Choice[] | null {
```

`packages/framework/core/tools/amadeus-election-model.ts:74, 81, 82`
```ts
export const Election = {
```
```ts
    if (choices === null) return err("parse-failure");
    if (!isStringArray(r.voters) || r.voters.length === 0) return err("parse-failure");
```

observed で確認した欠落3面:
1. **choices 空** — `parseChoices([])` は `[]`(非 null)を返すため `:81` を通過。`voters` 側にある `.length === 0` 検査(`:82`)に相当するものが choices 側に無い(非対称)
2. **internalNo 重複** — `parseChoices` 内に一意性検査なし
3. **voter 重複** — `isStringArray` は型のみ、一意性検査なし

tally 汚染の経路 `packages/framework/core/tools/amadeus-election-model.ts:449, 456`
```ts
  const choiceCounts: ChoiceCount[] = election.choices.map((c) => ({
```
```ts
  if (leaders.length !== 1) return { kind: "hold", reason: "tie", counts };
```
`choices.map` は重複 internalNo ごとに1エントリを作るため、全会一致でも top が2件ヒットし `leaders.length !== 1` → 誤 `tie` hold。Issue の機序が observed のコードで成立する。

**影響面(増幅)**: 大。`amadeus-election-model.ts` は10コピー。

**修正時に触る想定ファイル目録**:
- 正本: `packages/framework/core/tools/amadeus-election-model.ts`(`parseChoices` / `Election.parse`)
- 生成物: dist 6 + self-install 4 コピー
- テスト: `tests/unit/t234-election-model.test.ts`(parse の fail-closed 3ケース)、`tests/unit/t244-election-choice-resolution.test.ts` / `tests/integration/t244-election-tie-choice.integration.test.ts`(tie 判定への影響確認)
- 落ちる実証: 重複 internalNo / 重複 voter / 空 choices の各定義で parse が reject されることを赤テストで固定
- 新エラー種別を足す場合は CLI `open` の消費側(`packages/framework/core/tools/amadeus-election.ts`)と既存 registry/migration テスト(`t260`/`t262`)への波及を grep で棚卸しする

---

### #1462 P3/S4 — discoverPluginStageFiles が dangling symlink で raw ENOENT を投げる

**現存判定: 現存**(Issue 記載の `:1795` から **`:1823-1824` へ行シフト**)

`packages/framework/core/tools/amadeus-graph.ts:1823-1824`
```ts
  const pluginNames = readdirSync(pluginsRoot)
    .filter((n) => statSync(join(pluginsRoot, n)).isDirectory())
```

実体関数は `readPluginStageFiles`(`packages/framework/core/tools/amadeus-graph.ts:1813`)。`statSync` は symlink を follow するため、dangling symlink で ENOENT を throw する。

**非対称の実測(Issue の主張どおり)**: 直後の stages ディレクトリ判定 `:1828` は `existsSync` ガードが先にある:
```ts
    if (!existsSync(stagesRoot) || !statSync(stagesRoot).isDirectory()) continue;
```
`existsSync` は dangling symlink で false を返すため stages 側は安全に skip される。**plugin 名レベルのフィルタ(`:1824`)だけがこのガードを欠く。**

また `PluginStageError` への変換を行う try/catch は**ファイル単位ループの内側**(`:1837` の `try {` 以降)にあり、`:1823-1824` の列挙フィルタはその外側。したがって throw は raw `Error` のまま伝播する(スキーマ契約 `amadeus.plugin-stage-error.v1` 違反)。

**影響面(増幅)**: 大。`amadeus-graph.ts` は10コピー。

**修正時に触る想定ファイル目録**:
- 正本: `packages/framework/core/tools/amadeus-graph.ts`(`readPluginStageFiles` の列挙フィルタ)
- 生成物: dist 6 + self-install 4 コピー
- テスト: `tests/integration/t-formal-verif-plugin-stage-discovery.integration.test.ts`、`tests/integration/t-plugin-stage-discovery-performance.integration.test.ts`
- fixture: `tests/fixtures/plugins/test-pro/`(dangling symlink fixture の追加先候補)
- 落ちる実証の注入手段: **dangling symlink による ENOENT 注入**が本件では正当(`cid:code-generation:bun-readfilesync-dir-platform-divergence` の追補が、readdir 走査系の「列挙後の読取失敗」分岐は不在パスでは到達できず dangling symlink でポータブルに注入すると規定 — 本件はまさにその形状)

---

### #1458 P3/S4 — 既定 subagent 経路で distributed timeline 未記録・reportDelivery が dead export

**現存判定: 現存**

既定 transport `packages/framework/core/tools/amadeus-election.ts:582`
```ts
      : handleNotify(root, a.electionId, a.transport ?? "subagent", {
```

subagent transport の選択 `packages/framework/core/tools/amadeus-election.ts:293`
```ts
  if (kind === "subagent") return createSubagentTransport({ voters });
```

timeline booking が `delivered` 限定 `packages/framework/core/tools/amadeus-election.ts:326`
```ts
    if (d.result.ok && d.result.value.kind === "delivered") {
```

subagent transport は `directive` を返す `packages/framework/core/tools/amadeus-election-transport.ts:173`
```ts
      return ok({ kind: "directive", directive });
```
したがって `:326` の分岐に入らず **distributed イベントは記録されない**。

`reportDelivery` の dead export を実測確認 — `grep -rn "reportDelivery" packages/framework/core/tools/ tests/` の全 hit(6件、コマンド出力からの転記):

| ファイル:行 | 種別 |
|---|---|
| `amadeus-election-transport.ts:15` | コメント |
| `amadeus-election-transport.ts:166` | コメント |
| `amadeus-election-transport.ts:183` | 定義 |
| `tests/unit/t239-election-transport.test.ts:11` | import |
| `tests/unit/t239-election-transport.test.ts:42` | テスト内呼出 |
| `tests/integration/t240-election-transport.integration.test.ts:13` | import |
| `tests/integration/t240-election-transport.integration.test.ts:109` | テスト内呼出 |

**`packages/framework/core/tools/amadeus-election.ts` からの hit は 0 件** — CLI のどのハンドラも呼んでいない(Issue の主張と一致)。消費者はテストのみ。

設計意図の verbatim(`packages/framework/core/tools/amadeus-election-transport.ts:165-167`):
```ts
      // No spawn, no record: the tool cannot observe the spawn, so it emits a
      // directive and lets reportDelivery mint the record after the conductor
      // reports completion (send-failed is unreachable here).
```
すなわち **設計は「conductor 報告後に reportDelivery が mint する」と明記しており、その配線が U5(report verb)に実装されていない**(原因の所在=実装、Issue の帰属と一致)。

**影響面(増幅)**: 大。`amadeus-election.ts` / `amadeus-election-transport.ts` とも各10コピー。

**修正時に触る想定ファイル目録**:
- 正本: `packages/framework/core/tools/amadeus-election.ts`(`handleReport` の distributed 遷移へ `reportDelivery` を配線)
- 正本: `packages/framework/core/tools/amadeus-election-transport.ts`(責務整理を伴う場合)
- 生成物: dist 6 + self-install 4 コピー
- テスト: `tests/unit/t239-election-transport.test.ts`、`tests/integration/t240-election-transport.integration.test.ts`、`tests/integration/t236-election-loop.integration.test.ts`(既定 transport での open→notify→tally→render 経路)、`tests/e2e/t237-election-walking-skeleton.test.ts`
- 落ちる実証: 既定 transport で選挙を回し record.md タイムラインに「配信」が現れないことを赤テストで固定してから修正(Issue の修正方針が明記)
- **注意**: Issue の修正方針は2案(reportDelivery 配線 / subagent 既定廃止+agmsg 必須化)を挙げており、後者は**ユーザー可視の CLI 契約変更**に当たる。方式選択は実装者単独で決めず裁定を仰ぐ対象と見る(仮説)

---

### #1388 P3/S4 — team-up.sh codex 経路の初期プロンプト一発供給・watcher arming 検証欠如

**現存判定: 現存(ただし前提が大きく変化 — 要精査)**

**変化1: ファイル所在の移動。** Issue 本文は `scripts/team-up.sh` を参照するが、observed では **`packages/framework/core/tools/team-up.sh`(1615行)へ移動しており、`scripts/team-up.sh` は存在しない**。これに伴い **配布対象になった**(`git ls-files` 実測で正本以外に10コピー = dist 6 + self-install 4)。Issue 起票時点の「repo ローカルスクリプト」という前提は失効している。

**変化2: 行番号シフト。** Issue の `:936` / `:999-1000` は observed では以下。

codex 経路の初期プロンプト(依然として一発供給)`packages/framework/core/tools/team-up.sh:998`
```sh
  prompt="\$agmsg actas $role"
```

供給箇所(末尾 argv として1回渡すのみ、検証・再送なし)`packages/framework/core/tools/team-up.sh:1061-1062`
```sh
  printf 'cd %q && mise trust -q 2>/dev/null; AMADEUS_OPERATING_MODE=team TEAM_MSG=%q CODEX_IDENTITY=%q CODEX_HOME=%q AGMSG_CODEX_ROLE=%q %q --project %q --codex-command %q -- %s %s %q; exec $SHELL -l' \
    "$wt" "$MSG_BACKEND" "$CODEX_IDENTITY" "$codex_home" "$role" "$CODEX_MONITOR" "$wt" "$command" "$interaction_args" "$resume_arg" "$prompt"
```

**変化3(最重要): 検証欠如が「未実装」から「明示的な設計上のスコープ外」へ変わっている。**

`packages/framework/core/tools/team-up.sh:1116-1117`
```sh
watcher_verification_applies() {
  [ "$RUNTIME" = "claude" ] && [ "$MSG_BACKEND" = "agmsg" ] || return 1
```

直上のコメント(`:1098-1099`、verbatim):
```sh
# armed by the bootstrap prompt (the claude runtime on the agmsg backend) AND
# that prompt actually arms an *actas* watcher. Codex is out of scope (FR-6) and
```

すなわち **codex 経路の検証除外は、後続 intent(#1449/#1476 系)で FR-6 として明示的に決定された設計判断**であり、`:1576` / `:1607-1608` の launch 経路も `watcher_verification_applies` ゲート越しに検証を呼ぶため codex では発火しない。

**変化4: codex 側も actas 形のプロンプトになっている。** claude 経路は `member_bootstrap_prompt`(`:924` `printf '/agmsg actas %s' "$role"`)、codex 経路は `:998` の `\$agmsg actas $role`。Issue 起票時点の記述と同様 actas 形だが、`watcher_verification_applies` の actas 判定(`:1120-1121`)は `member_bootstrap_prompt leader` を代表値として読むため、**codex 経路のプロンプト形は判定に入らない**(`:1117` の `RUNTIME = claude` で先に落ちる)。

**要精査の論点(仮説 — 裁定が要る)**:
1. #1388 の欠陥主張(初期プロンプト一発供給・検証欠如)は observed で構造として現存する
2. しかし検証の除外は FR-6 で意図的に決定されており、**「バグ」ではなく「既決の設計」である可能性がある**
3. Issue 本文自身が「codex には ready センチネル seam が存在しないため #1384 fix のポーリング検証は直接転用不可 — 別の検証 seam の設計が要る」「codex での実発生は未実測(理論リスク)」と限定している
4. したがって本件は **修正対象なのか、FR-6 既決を根拠にクローズすべきなのか**が先決事項。仕様変更に当たるなら裁定が要る

**影響面(増幅)**: 大(**Issue 起票時点から変化**)。`team-up.sh` は正本+10コピー。修正する場合は `bun scripts/package.ts` + `bun run promote:self` の同期が必須。

**修正時に触る想定ファイル目録**(修正すると裁定された場合):
- 正本: `packages/framework/core/tools/team-up.sh`(`codex_member_cmd` の `:995-1062`、`watcher_verification_applies` の `:1116-1130`)
- 正本: `packages/framework/core/tools/team-up-codex-safety-wait.ts`(codex 固有の待機 seam。既存の codex 側検証機構)
- 生成物: dist 6 + self-install 4 コピー
- テスト: `tests/integration/t294-team-up-watcher-applicability.test.ts`(applicability ゲートの既存テスト)、`tests/integration/t-team-up-watcher-arming.test.ts`、`tests/integration/t-team-up-codex-resume.serial.test.ts`、`tests/unit/t-team-up-codex-safety-wait.test.ts`
- fixture: `tests/fixtures/team-up-codex-safety-wait/test-only-positive.json`
- 外部 seam: `~/.agents/skills/agmsg/scripts/spawn.sh`(readiness handshake 非対応の実測元 — **repo 外・変更対象外**。検証 seam を設計する場合は書き手側の起動条件を実測すること = `cid:reverse-engineering:seam-writer-mode-precondition`)

---

## 3. 現存判定サマリ

| Issue | P/S | 現存判定 | 主患部(observed `1673c4332`) |
|---|---|---|---|
| #1489 | P2/S3 | 現存 | `scripts/mirror-distribution-benchmark-aggregate.ts:20, 33-35, 61-62` |
| #1457 | P2/S3 | 現存 | `amadeus-election.ts:486, 494, 503` / `amadeus-election-record.ts:193, 196` |
| #1377 | P3/S3 | 現存 | `amadeus-lib.ts:3326-3328` / `amadeus-audit.ts:258-262` |
| #1459 | P3/S3 | 現存 | `amadeus-election-model.ts:62, 81-82, 449, 456` |
| #1462 | P3/S4 | 現存(行シフト `:1795`→`:1823-1824`) | `amadeus-graph.ts:1823-1824` |
| #1458 | P3/S4 | 現存 | `amadeus-election.ts:293, 326, 582` / `amadeus-election-transport.ts:174, 183` |
| #1388 | P3/S4 | 要精査(構造は現存だが FR-6 で明示的スコープ外) | `team-up.sh:998, 1061-1062, 1116-1117`(**`scripts/` → `packages/framework/core/tools/` へ移動**) |

## 4. 増幅面の要約

| 対象ファイル | 正本 | 増幅コピー数 |
|---|---|---|
| `amadeus-election.ts` | `packages/framework/core/tools/` | 10(dist 6 + self-install 4) |
| `amadeus-election-record.ts` | 同上 | 10 |
| `amadeus-election-model.ts` | 同上 | 10 |
| `amadeus-election-transport.ts` | 同上 | 10 |
| `amadeus-graph.ts` | 同上 | 10 |
| `amadeus-lib.ts` | 同上 | 10 |
| `amadeus-audit.ts` | 同上 | 10 |
| `team-up.sh` | 同上 | 10 |
| `mirror-distribution-benchmark-aggregate.ts` | `scripts/` | 0(配布対象外) |

コピー数は `git ls-files "*/<file>" | grep -v '^packages/' | wc -l` の出力からの転記(測定 ref `1673c4332`)。

**帰結**: #1489 以外の6件はすべて配布正本を触るため、修正 PR には `bun scripts/package.ts` / `bun run promote:self` の再生成と `bun run dist:check` / `bun run promote:self:check` の検証が必須。

## 5. 後続ステージへの引き継ぎ事項

1. **#1388 の性格判定が先決** — 構造は現存するが FR-6 で明示的にスコープ外と決定されている。修正対象か、既決設計を根拠にクローズか、要裁定(仕様変更に当たる可能性)。Issue 本文の行番号・ファイルパスも失効しており、更新が要る。
2. **#1458 の修正方針が2案あり、片方は CLI 契約変更** — 既定 transport の廃止は ユーザー可視の挙動変更。方式選択に裁定が要る。
3. **#1377 は非対称の解消が本質** — `auditShardDir` は fail-closed、`auditFilePath` / `stateFilePath` は bare root フォールバック。`cid:requirements-analysis:symmetric-pair-review` の観点で3関数を同時に棚卸しすべき。
4. **#1489 は両側実測が完成条件** — 偽赤の解消(単一スパイクで赤くならない)と検出力の維持(真の退行で赤くなる)の両方を実測する必要がある。
5. **#1462 の落ちる実証は dangling symlink 注入が正当な手段**(不在パス ENOENT では readdir 列挙に載らず到達不能)。
6. **#1457 / #1459 / #1458 は同一 election サブシステム** — ファイル交差の有無を着手前に実測すること。`amadeus-election.ts` は #1457 と #1458 の両方が触る(交差あり — 直列化か非交差スコープ切り分けの判断が要る)。`amadeus-election-model.ts`(#1459)は他2件と非交差。
