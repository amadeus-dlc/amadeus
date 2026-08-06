# re-scan 記録 — 260805-pr-convergence-plugin（Issue #1971）

- 測定 ref: observed = `8409c2039c5281e533db88a637649276d8bc4a73`（`git rev-parse HEAD` 実測）
- Base: `b938898f364160d4b5857e153579b40b5ab18372`（直前の現在断面 `260804-phase-boundary-approval` の observed）
- Ancestry: `git merge-base --is-ancestor b938898f3 8409c2039` exit 0（実測）
- 区間規模: **27 commits / 474 files**
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- 合成方式: Developer scan（read-only、probe は repo 外 scratch）を一次入力とし、Architect が主要主張を独立コマンドで verbatim 再実測した。本文中の file:line はすべて observed 断面。

---

## 0. 一次入力と再解決方針

Issue #1971 にはクロスレビュー2件（本記録では xrev-1 / xrev-2 と呼ぶ）が付いており、いずれも engine の file:line を引く。レビュー時 SHA と observed が異なるため、`cid:reverse-engineering:c1-xrev-single-issue` の scan mode を適用しつつ、**免除条件（`cid:reverse-engineering:upstream-cite-reresolve-on-shift`）は適用せず全引用を observed で再解決**した。理由は §5 のとおり、患部10ファイルのうち区間内 touch は `scripts/plugin-projection.ts` の1本のみである一方、行シフト自体はレビュー時 SHA と base の差として既に生じており、レビュー verdict の検証 SHA が observed と一致しないためである。

---

## 1. ガード述語 — Issue 引用の observed 再解決

| Issue / xrev の引用 | observed の実所在 | シフト |
|---|---|---|
| `unitCovered` = `amadeus-orchestrate.ts:3313-3336` | **:3452-3472** | +139 |
| `firstUncoveredBatch` :2967 | **:3068-3085** | +101 |
| `nextUncoveredUnit` :3364-3372（xrev-2） | **:3526-3547** | +162 |
| `isPerUnit` :1804-1806 | **:1848-1849** | +44 |
| `PER_UNIT_FOR_EACH` :1784 | **:1828** | +44 |
| `SWARM_FOR_EACH` :2944 / swarm 判定 :3083 | **:3045** / **:3247** | +101 / +164 |
| `artifactsExistInDir` = `amadeus-state.ts:1598`（xrev-2） | **:1646** | +48 |
| `verifyStageArtifacts` :1944-1951（xrev-2） | **:1992-2002** | +48 |

### 1a. `unitCovered` は produces 全件 existsSync（成立）

`amadeus-orchestrate.ts:3466-3470` verbatim:

```ts
  for (const name of names) {
    const rel = resolveArtifactPath(name, node, unit, recordPrefix, codekbCtx);
    const abs = join(projectDir, ...rel.split("/"));
    if (!existsSync(abs)) return false;
  }
```

関数シグネチャ（`:3454-3461`）に state 引数はなく、承認状態を一切参照しない。Issue の主張どおりの fail-closed。

### 1b. fail-open 経路 — 3件（うち1件は Developer scan 未検出）

**①`unitCovered:3460-3465`** verbatim:

```ts
  const declared = node.produces ?? [];
  if (declared.length === 0) return false;
  const names = unitKind === undefined
    ? declared
    : requiredArtifactsForUnit(node, unitKind);
  if (names.length === 0) return true;
```

`produces_kinds` により当該 unit kind への必須成果物が 0 件になると **covered = true**（`requiredArtifactsForUnit`、`amadeus-graph.ts:842-849`）。

**コメントと実装の食い違い（Architect 追加観測）**: 直上のコメント `:3448-3451` verbatim は

```
// stages declare required outputs, so the empty case is unreachable in
// practice; an empty required set remains NOT covered so the engine never
// silently skips a unit it cannot prove it ran.
```

と述べるが、この保証が成立するのは `declared.length === 0` の枝だけであり、`produces_kinds` で絞られた `names.length === 0` の枝は逆に `true` を返す。コメントの宣言する不変条件は実装が満たしていない（`cid:reverse-engineering:comment-premise-verify-not-just-quote`）。

**②`producesArtifactsExist:1689`**（`amadeus-state.ts`）verbatim `if (produces.length === 0) return true; // nothing declared -> nothing to verify`。

**③`kindAwareArtifactsExist`（`amadeus-state.ts:1653-1678`）— Developer scan 未検出、Architect が独立再実測で発見**。`producesArtifactsExist:1689-1690` が最初に呼ぶ kind-aware 分岐で、`:1677` verbatim `return !hasApplicableArtifact;` により、どの unit にも適用成果物が存在しない場合 `true`（= 検査通過）を返す。①の approve 側の双子にあたる。加えて本関数は unit を走査して**最初に成果物が揃った1 unit で `true` を返す**（`:1675` `if (artifactsExistInDir(dir, applicable)) return true;`）ため、ANY 判定は kind-aware 経路にも及ぶ。

現状 `code-generation.md` は `produces_kinds` を持たない（宣言は `functional-design` / `nfr-requirements` / `nfr-design` / `infrastructure-design` の4ステージのみ）ため今日は顕在化しないが、**新規 produces を足す側が `produces_kinds` に触れると無音で fail-open へ落ちる**。`firstUncoveredBatch`（`:3079-3082`）は同一述語を `unitKinds.get(u)` 付きで呼ぶため同じ fail-open を継承する。

### 1c. 成果物パス形

`resolveArtifactPath`（`:1897-1919`）の per-unit 分岐 `:1916` verbatim:

```ts
    return `${prefix}/construction/${unit}/${owner.slug}/${name}.md`;
```

→ 収束レポートを code-generation の produces に足した場合の実在検査パスは `<record>/construction/<unit>/code-generation/<name>.md`。

### 1d. approve 時ガードは ANY（xrev-2 の指摘は observed でも成立）

`amadeus-state.ts:1691-1694` verbatim:

```ts
  for (const dir of producesDirsForStage(pd, stage)) {
    for (const name of produces) {
      if (existsSync(join(dir, `${name}.md`))) return true;
    }
  }
```

バイパスは `:1529` verbatim `return process.env.AMADEUS_SKIP_ARTIFACT_GUARD === "1";`。

→ **`unitCovered` = 全件必須 / approve = 1件でも通す、の非対称は observed でも現存する**。fail-closed の実現面は per-unit ループ前進以外にないという xrev-2 の結論は成立。

---

## 2. plugin 機構の棚卸し

### 2a. 構成ファイル

| ファイル | 行数 | 責務 |
|---|---|---|
| `packages/framework/core/tools/amadeus-plugin.ts` | 1534 | CLI（compose / compose-all / install / drop / doctor / status）、`buildHostSnapshot`、`parseHostStageSeams` |
| `packages/framework/core/tools/amadeus-plugin-compose.ts` | 1574 | manifest parse、`inspectPlugin`、`planPluginComposition`、seam / fragment 台帳、drop 再構築 |
| `packages/framework/core/tools/amadeus-plugin-activation.ts` | 469 | formal-model-check 専用の spec-hash advisory（`:35` verbatim `// The formal-model-check plugin is the sole activation target of this intent.`） |
| `packages/framework/core/tools/amadeus-plugin-selection.ts` | 157 | 汎用の opt-in 解決（`amadeus/config.json` の `plugin.activation.names`） |
| `scripts/plugin-projection.ts` | 1105 | パッケージング / harness 投影 / import-closure guard |

### 2b. plugin が出荷できる面 = 4種のみ（manifest schema が正本）

`parsePluginManifest`（`amadeus-plugin-compose.ts:339-345`）verbatim:

```ts
  const stages = parseStages(name, raw.stages, readStage, errors);
  const seams = parseSeams(raw.seams, errors);
  const fragments = parseFragments(raw.fragments, errors);
  const tools = parseTools(name, raw.tools, readStage, errors);
  if (errors.length > 0) return { manifest: null, errors: errors.sort() };
  return { manifest: { name, stages, seams, fragments, tools }, errors: [] };
```

→ **`sensors` フィールドは schema に存在しない**。未知の top-level キーは拒否されず無視される（strict rejection なし）。

**Issue 本文の訂正候補（観測）**: Issue の役割分担表は「センサー: plugin が manifest 同梱 + frontmatter 宣言」と書くが、参照実装 formal-model-check の sensor manifest は **core 側** `packages/framework/core/sensors/amadeus-model-completeness.md` にある（`find . -name "*model-completeness*"` の結果は core / 各ハーネス投影 / dist / tests のみで、`plugins/` 配下は 0 件。`grep -c sensors plugins/formal-model-check/plugin.json` = **0**）。すなわち「plugin が sensor manifest を同梱する」既習形は**存在しない**。plugin stage の frontmatter が `sensors: [model-completeness]` を宣言し、manifest 実体は core が持つ、が実像。

`tools/` は `TOOLS_DIR_PREFIX = "tools/"`（`:350`）配下限定で、stage path 空間との非交差を `:488-493` が強制する。

### 2c. compose の「既存ステージ produces への overlay」— 機構は半分存在し、実ステージには接続していない（最重要）

seam 語彙は既に定義済み。`amadeus-plugin-compose.ts:74` verbatim:

```ts
export const SEAM_NAMES = ["produces", "consumes", "sensors", "required_sections"] as const;
```

直上のコメント `:70-73` は「StageFrontmatter's list fields ... Named here as the single membership source so no bare string literal decides the boundary」と述べ、この4語彙が frontmatter の list フィールドに対応することを明示する。merge も台帳も drop 復元も実装済み（`mergeSeamEntries` `:424-435`、`applySeamContributions` `:699-719`、`rebuildStageSeams` `:567-580`）。

**しかし host stage の認識面が実 Markdown ではない。** `:552-555` verbatim:

```ts
// Canonical byte form of a stage's four seam arrays. Deterministic given the
// seams: one line per seam in SEAM_NAMES order. This is the mechanism's
// shared-file surface for stage seams (the real frontmatter serializer is U11+).
export function serializeStageSeams(slug: string, seams: StageSeams): Buffer {
```

`parseHostStageSeams`（`amadeus-plugin.ts:258-270`）は 1 行目に `/^stage: (.+)$/` を要求する（`:260` verbatim `const stageLine = lines[0]?.match(/^stage: (.+)$/);`、`:261` `if (!stageLine) return null;`）。実ステージファイルの 1 行目は `---`（`head -3 packages/framework/core/amadeus-common/stages/construction/code-generation.md` = `---` / `slug: code-generation` / `phase: construction`）。

**実測（Developer probe、repo 外 scratch、exit 0）**:

```
packages/framework/core/amadeus-common/stages/construction/code-generation.md => null
plugins/formal-model-check/stages/formal-model-check.md => null
.claude/amadeus-common/stages/construction/code-generation.md => null
```

リポジトリ全域で `serializeStageSeams` 形のファイルは 0 件（`grep -rl --include='*.md' --include='*.txt' --include='*.json' -E '^stage: ' packages plugins .claude scripts` は出力なし、exit 1）。

リポジトリ自身がこの制約を明記する。`tests/unit/t301-plugin-cli-seams.test.ts:7-10` verbatim:

```
// both belong in the unit tier (fs-tests-integration-first). buildHostSnapshot in
// t299 only ever feeds parseHostStageSeams full-markdown stage files (which fail
// the `stage:` first-line match), so the seam-parsing body is exercised here
// against the engine's own serializeStageSeams byte form.
```

**fail-closed であることの実測（Developer probe2、exit 0）** — 実 `code-generation.md` を置いたホストへ produces seam を宣言した manifest を `inspectPlugin` にかけた結果:

```
host stages discovered: []
manifest parse errors: []
inspect kind: rejected
inspect errors: [{"kind":"unknown-seam","message":"seam target stage \"code-generation\" not in host","locus":"code-generation"}]
```

→ **無音スキップではなく loud reject**（`collectSeamErrors` `:498-511`）。Issue の「要拡張は1点」は成立するが、拡張の実体は「compose に overlay 能力を足す」ではなく **「実 Markdown frontmatter の parse / serialize 層（コード内で U11+ と呼ばれている未着地部分）を実装して host stage 認識面を実ステージへ接続する」**。seam の merge / ledger / drop 側は流用可能。

**2段目のギャップ（仮説 — 実測ではない）**: 仮に seam が実ステージへ書き戻せても、compile が読むのは実 `.md` frontmatter である。seam 台帳の再構築先が `stage.path`（= 実 `.md`）なら 1 段で足りるが、現在の serializer は 4 行の合成形しか吐かないため、**frontmatter を保存したまま produces 配列だけを追記する serializer が必要**になる。この実装は存在しないため机上の帰結であり、観測ではない。

### 2d. seam 面のドキュメントは不在

`grep -rn "seams\|seam" docs/reference/*.md | grep -i plugin` の唯一のヒットは `docs/reference/06-hooks-and-tools.md:219`（harness hook seam の話で無関係）。plugin authoring の seam 契約は未文書化。

### 2e. 3層 trust（compose / compile / run）— 実在

- **compose**: `TrustGrant { plugin, contentDigest, grantTimestamp }`（`amadeus-plugin-compose.ts:161-165`）、`PluginStageIndexEntry.contentDigest`
- **compile**: plugin stage 発見 = `plugins/<name>/stages/<slug>.md`（`amadeus-graph.ts:1784-1798`）、`plugin_source?: true` を stamp（`:140-146`）
- **run**: **O_NOFOLLOW + 同一 inode 再読み**（`amadeus-graph.ts:1889-1901` verbatim `throw new Error("platform does not support O_NOFOLLOW (fail-closed)")`、`:1971` `// or ancestor, then O_NOFOLLOW-read the exact same inode.`）、grant / entry digest の形式検査 `/^sha256:[0-9a-f]{64}$/`（`:2061-2074`）

### 2f. 新規: import-closure guard（区間内で着地、#2240 / PR `09a3ccfec`）

`scripts/plugin-projection.ts:880-946`（区間 diff で **+77行 / −1行**）。plugin の `tools[]` から相対 import で到達可能な全モジュールが manifest 宣言かつ owned でなければ **projection を write-0 で拒否**する（`assertPluginImportClosure`、`PluginValidationError`）。symlink 脱出も `repoFileReader` の realpath 境界で封鎖。

→ **pr-convergence plugin が tools を出荷する場合、import 閉包の全数を `plugin.json` へ宣言する義務が新設済み**。

---

## 3. センサー advisory — Issue 引用の observed 再解決（成立）

| Issue の引用 | observed | 内容 |
|---|---|---|
| `amadeus-sensor.ts:29-31` | **:29-31**（不動） | verbatim: `// CLI exits non-zero ONLY on dispatcher invocation errors (unknown id, missing` / `// flag, missing path, matches-rejection). Sensor outcomes are advisory and` / `// always emit a paired terminal row.` |
| `:271` | **:271**（不動） | verbatim: ``console.log(`default_severity: ${m.default_severity}`);`` |
| `:573-574` | **:573-574**（不動） | `// --- 9. Process exit 0 ---` / `process.exit(0);` |

出荷センサー **8件すべて** `default_severity: advisory`（`grep -c default_severity packages/framework/core/sensors/*.md` が8ファイル各1行、`ls | wc -l` = 8）。`severity` の分岐利用は `:271` の表示1箇所のみ。

→ **「執行はセンサーに置かない」という Issue の設計判断は observed でも接地している**。

---

## 4. scope-grid と opt-in

### 4a. `scopes: []` の扱い

`applyPluginScopeOptIns`（`amadeus-graph.ts:1484-1502`）は plugin stage を transpose の**生産者にせず**、厳密に加算の overlay として後段適用する。設計コメント `:1466-1483` が理由を明記する（plugin が既存 composed scope を宣言すると当該 scope の plan を自分の stage だけに置換してしまった #1630 の是正）。`scopes: []` は行を1つも触らない = stock workflow へ不参加。

参照実装 `plugins/formal-model-check/stages/formal-model-check.md:4` verbatim:

```
condition: Opt-in — install is the boundary. Once composed, runs on an explicit `--stage formal-model-check` invocation (with or without `--single`); never auto-selected by a stock scope (scopes is empty).
```

**帰結（重要な設計含意）**: Issue が要求する「install した環境では **code-generation の全 Bolt** に収束レポートを必須化」は、`scopes: []` の opt-in stage 形では達成できない（stock scope の per-unit ループへ参加しないため）。達成手段は seam による既存 code-generation への produces overlay（= §2c の未着地面）である。**この依存関係が本 intent の critical path。**

### 4b. activation 設定

`amadeus/config.json`（observed）:

```json
  "plugin": {
    "activation": {
      "names": [
        "formal-model-check"
      ]
    }
  }
```

`resolvePluginSelection`（`amadeus-plugin-selection.ts:68-96`）が `outcome.config.plugin.activation.names` を汎用に読む。`.claude/plugins/formal-model-check` が実在 = dogfood 済み composed 状態。

### 4c. install / drop の可逆性

`handleDrop`（`amadeus-plugin.ts:1137-1186`）: plan → apply → drops 記録の消去 → recompile → runner 再生成（`generateRunners`）→ 選択設定の永続化。失敗時は `createPluginInstallSnapshot` の `rollback()`。復元判定は **FS 実測**（`pluginArtifactsAbsent` `:1190-1198` + `hasEmptyAncestorDir` `:1202-1211`）— 所有パスの不在に加え「空の親ディレクトリ残骸ゼロ」まで検査する。

runner: plugin stage は core stage と同条件で `/amadeus-<slug>` runner の対象（`amadeus-runner-gen.ts:98-100` verbatim `// by the compile's plugin join) is a target on exactly the same terms as a core` / `// stage — the predicate does not read the provenance field, so a plugin stage`）。drop で prune される（`:1176-1181` のコメント `// Symmetric with compose (BR-U3-3)`）。

---

## 5. 区間デルタ（base..HEAD、27 commits）— 患部への touch は1ファイルのみ

`git diff --stat base..HEAD -- <患部10ファイル>` の全出力:

```
 scripts/plugin-projection.ts | 78 +++++++++++++++++++++++++++++++++++++++++++-
 1 file changed, 77 insertions(+), 1 deletion(-)
```

→ `amadeus-orchestrate.ts` / `amadeus-plugin.ts` / `amadeus-plugin-compose.ts` / `amadeus-plugin-activation.ts` / `amadeus-sensor.ts` / `amadeus-graph.ts` / `amadeus-state.ts` / `code-generation.md` / `amadeus/config.json` は**区間内で無変更**。§1 の行シフトは base 以前に生じたもの（レビュー時 SHA と base の差）。

区間の主な着地（`git log --oneline`）: TLA+ authoring Bolt（#2239 / #2240）、Kiro CLI TUI live E2E（#2233）、intent autonomy 系（#2229 / #2234 / #2242）、metrics snapshot 群。

**tNNN 採番**: 区間で t436〜t443 が新規着地。observed の最大予約番号は **443**（`ls tests/unit tests/integration tests/smoke tests/e2e | grep -oE '^t[0-9]+' | sort -n | tail`）→ 本 intent は **t444 以降**を予約する。

---

## 6. PR 収束の既存資産

### 6a. リポジトリ内に PR 収束機構は存在しない

- `grep -rniE 'converge|reviewThread|review thread|gh pr |pull request|レビュースレッド|収束' packages/framework/core/amadeus-common/stages/` → **0 hit**
- `grep -rn '\bPR\b' packages/framework/core/amadeus-common/stages/` → **0 hit**
- ステージファイル総数 = **32**（`find ... -name '*.md' | wc -l`）
- `reviewThreads` の実装コード hit = **0**（`amadeus/` 配下の record を除く）

→ xrev-1 の「ステージグラフに接続点ゼロ」は observed でも全数確認で成立。

### 6b. 部分的な再利用資産（3件）

**1. `mergeStateStatus` の既存正規化** — `scripts/metrics-publication-domain.ts:256-262` verbatim:

```ts
function parseMergeability(value: unknown): "mergeable" | "pending" | "conflicting" {
  const status = requireString(value, "mergeStateStatus").toUpperCase();
  if (["CLEAN", "HAS_HOOKS", "MERGEABLE", "UNSTABLE"].includes(status)) return "mergeable";
  if (["BEHIND", "BLOCKED", "DRAFT", "UNKNOWN"].includes(status)) return "pending";
  if (["CONFLICTING", "DIRTY"].includes(status)) return "conflicting";
  throw new Error(`mergeStateStatus ${JSON.stringify(status)} is unsupported`);
}
```

`UNKNOWN` を `pending` へ落とす（= 成立させない）既存契約があり、Issue の「UNKNOWN は不成立として retry」と整合する。未知値は throw する fail-closed。テストは `tests/unit/t222-metrics-publication.test.ts`。**述語を二重定義せず本関数を canonical 化する余地がある**（construction phase の「canonical な1定義から導出」原則）。

**2. `gh` 実行の既存ゲートウェイ** — `packages/framework/core/tools/amadeus-github-gateway.ts`（1034行）。`versionArgv()`（`:112`） / `authArgv()`（`:116`、`["auth","status","--hostname","github.com"]`）で runnable / auth readiness を検査し、`parseHttpEnvelope`（`:247`）、`interpretGraphqlResult`（`:647`）まで持つ。GraphQL 実行は `amadeus-mirror-project-gateway.ts:79` が `"graphql"` を argv 配列で渡す既存形。**新規 gh ラッパを書かずここへ相乗りできる。**

**3. loop-monitor / quality-repair の contribution モデル** — `amadeus-quality-repair.ts`（#2096「Harness-neutral first-party Quality Repair contribution and convergence model」）。`QualityRequiredOutputDescriptor { outputId, stageSelector, verifierId, verificationConditionId }`（`:125-130`）は本 intent が欲しい「ステージへ必須成果物を宣言する」形そのもの。

**ただし現状は fail-closed の未使用面**: `compileQualityContribution` `:242` verbatim `if (contribution.requiredOutputs.length !== 0) return null;` → 非空にすると activation が `ACTIVATION_FAILED` になる。first-party contribution も `:211` で `requiredOutputs: []` を宣言する。消費者は repo 全域で 0 件（`grep -rn requiredOutputs packages scripts tests` のヒットは型定義・空宣言・ガード・`t428:95 expect(active.contribution.requiredOutputs).toEqual([])` のみ）。

→ **型は用意されているが接続されていない第2の候補 seam**。採用するなら engine 改修が必要。

### 6c. 収束スキルはハーネス側（repo 外）

`~/.agents/skills/` に `j5ik2o-gh-pr-converge-loop` / `j5ik2o-gh-pr-resolve-conflicts` / `j5ik2o-gh-pr-review-follow-up` が実在（`ls` で確認）。リポジトリには存在しない = plugin が工程本文を出荷する場合、スキル本文の Guardrail は**リポジトリ内に正本を持たない参照**になる点は要決着。

---

## 7. 検証（実測）

| コマンド | 結果 | exit |
|---|---|---|
| `bun test tests/unit/t301-plugin-cli-seams.test.ts tests/unit/t252-plugin-composition.test.ts --timeout=30000` | 34 pass / 0 fail / 119 expect / 2 files | 0 |
| `bun test tests/integration/t254-reference-plugin-lifecycle.test.ts --timeout=30000` | 9 pass / 0 fail / 68 expect / 1 file | 0 |
| `bun test tests/integration/t299-plugin-cli-walking-skeleton.integration.test.ts tests/integration/t340-plugin-drop-fs-restore.integration.test.ts --timeout=30000` | 24 pass / 0 fail / 102 expect / 2 files | 0 |
| probe `probe-seam.ts`（`parseHostStageSeams` × 実ステージ3本） | 全て `null` | 0 |
| probe `probe-seam2.ts`（`inspectPlugin` × produces seam on code-generation） | `rejected` / `unknown-seam` | 0 |

coverage は未実行（`cid:code-generation:c1-coverage-single-owner`）。

---

## 8. Requirements Analysis へ送る裁定候補

1. **【最重要・critical path】seam の実 frontmatter 接続をどう実装するか。** `SEAM_NAMES` に `produces` は既にあり merge / ledger / drop も動くが、host stage の認識面が合成バイト形（`stage: <slug>` 4行）で、実 Markdown ステージは 1 件も HostStage にならない（コード内で「real frontmatter serializer is U11+」と明記）。選択肢: (a) frontmatter 保存型の parse / serialize を新設して seam を実ステージへ接続 / (b) `QualityRequiredOutputDescriptor`（現状 fail-closed の未接続面）を接続する / (c) 第3案。Issue の「要拡張は1点」の実体をここで確定する。

2. **plugin は sensor manifest を同梱できない**（manifest schema = stages / seams / fragments / tools のみ）。参照実装 formal-model-check の sensor manifest も core 側にある。Issue の役割分担表「センサー: plugin が manifest 同梱」を、(a) core へ manifest を置く既習形へ訂正 / (b) manifest schema に `sensors` を足す（engine 改修） のどちらかへ確定する。

3. **`scopes: []` opt-in stage 形では Issue の目的を達成できない**。plugin stage は stock scope の per-unit ループへ参加しないため、「install 環境の全 Bolt へ必須化」は seam overlay 経路にのみ依存する。裁定 1 が否決された場合の代替（例: install 時に `code-generation.md` を直接 overlay するか、別の必須性機構か）を要件で確定する。

4. **`produces_kinds` fail-open の封鎖**。`unitCovered` は当該 unit kind の必須成果物が 0 件だと covered を返す（`:3465`）。収束レポートを produces へ足す設計では、`produces_kinds` を触らない / 触るなら全 kind へ適用する、を受け入れ基準へ明文化する。あわせて実装とコメント（`:3448-3451`）の食い違いを是正対象に含めるかを決める。

5. **収束述語の canonical 所有**。`mergeStateStatus` の正規化は `scripts/metrics-publication-domain.ts:256-262` に既存（`UNKNOWN`→pending の fail-closed 込み）。新規に二重定義せず canonical 1定義から導出するか、意図的に別定義とするかを裁定する。

6. **gh 実行面の所有**。`amadeus-github-gateway.ts`（auth readiness / envelope / graphql 解釈）と `amadeus-mirror-project-gateway.ts` の argv 配列形が既存。plugin tools が独自 gh ラッパを持つか core gateway へ相乗りするかを確定する（後者なら plugin は core への依存を持つ = import-closure guard との関係も要確認）。

7. **import-closure 宣言義務**（区間内 #2240 で新設）。plugin tools を出荷するなら `plugin.json` の `tools[]` が import 閉包の全数を覆う必要がある。受け入れ基準へ `assertPluginImportClosure` 通過を含める。

8. **approve ガードの非対称は放置でよいか**。`unitCovered` = 全件必須 / approve = ANY / `AMADEUS_SKIP_ARTIFACT_GUARD=1` バイパスあり。さらに kind-aware 経路（`kindAwareArtifactsExist:1653-1678`）にも fail-open がある。Issue は「batch 前進を止める」で足りるとしているが、approve 面の穴を要件で明示受容するか塞ぐかを決める。

9. **tNNN 予約 = t444 以降**（observed 最大 443）。並行 Bolt があるなら unit ごとに事前予約する。

10. **収束スキル本文の正本所在**。`j5ik2o-gh-pr-converge-loop` はハーネス側（`~/.agents/skills/`）にありリポジトリ内に無い。plugin が工程本文を出荷する際、Guardrail をリポジトリ内正本として持つか外部参照に留めるかを確定する（外部参照は未 install 環境どころか別ハーネスで空文化する）。

---

## 9. Developer scan との差分（Architect の独立再実測）

再実測は Architect 自身のコマンドで行い、scan の記述を追認していない。対象は conductor が名指しした主要主張6件に、行番号確定のための周辺実読を加えたもの。

### 9a. 一致（訂正不要）

| 主張 | 再実測手段 | 結果 |
|---|---|---|
| observed / base / ancestry / 区間規模 27 commits・474 files | `git rev-parse` / `git merge-base --is-ancestor` / `git log \| wc -l` / `git diff --name-only \| wc -l` | 一致 |
| `unitCovered` = `:3452-3472`、produces 全件 `existsSync`、state 引数なし | `sed -n '3450,3474p'` | 一致 |
| `:3465` の `names.length === 0` fail-open | 同上 | 一致 |
| `requiredArtifactsForUnit` = `amadeus-graph.ts:842-849` | `sed -n '838,852p'` | 一致 |
| `SEAM_NAMES` = `amadeus-plugin-compose.ts:74` | `sed -n '70,78p'` | 一致 |
| `parsePluginManifest` に `sensors` 不在（4種のみ） | `sed -n '323,347p'` | 一致 |
| `parseHostStageSeams` = `amadeus-plugin.ts:258-270`、1行目 `^stage: ` 要求 | `grep -n` + `sed -n '255,275p'` | 一致 |
| 実ステージ 1 行目が `---` | `head -3 .../code-generation.md` | 一致 |
| `parseMergeability` = `metrics-publication-domain.ts:256-262` | `sed -n '254,264p'` | 一致 |
| センサー8件すべて advisory、`:29-31` / `:271` / `:573-574` 不動 | `grep -c` + `sed -n` | 一致 |
| plugin バンドルに sensor manifest 不在、`plugin.json` の `sensors` 0 件 | `find` + `grep -c` | 一致 |
| `plugin-projection.ts` +77/−1、他患部9ファイル無変更 | `git diff --stat base..HEAD -- <10ファイル>` | 一致 |
| tNNN 最大 443 | `ls \| grep -oE \| sort -n \| tail` | 一致 |
| ステージ本文の PR 収束語彙 0 hit / ステージ32件 | `grep -rniE \| wc -l` + `find \| wc -l` | 一致 |
| `github-gateway.ts` 1034行、`versionArgv:112` / `authArgv:116` | `wc -l` + `grep -n` | 一致 |
| `compileQualityContribution:242` の fail-closed ガード | `grep -n` | 一致 |
| `applyPluginScopeOptIns` = `amadeus-graph.ts:1484` | `grep -n` | 一致 |
| formal-model-check の `condition:` 逐語（`:4`） | `sed -n '1,6p'` | 一致 |
| `artifactsExistInDir` = `amadeus-state.ts:1646` | `grep -n` | 一致 |
| `artifactGuardDisabled` の env バイパス `:1529` | `grep -n` | 一致 |

### 9b. 訂正（2件）

| # | scan の記述 | 実測 | 訂正内容 |
|---|---|---|---|
| C1 | approve の ANY 判定ループ = `amadeus-state.ts:1692-1695` | `grep -n "for (const dir of producesDirsForStage"` = **1691**。ループ本体は `:1691-1694` | **行番号を 1 つ繰り上げ**。関数 `producesArtifactsExist` の範囲も `:1683-1697` ではなく **`:1683-1696`**（`:1696` が閉じ括弧） |
| C2 | `serializeStageSeams` のコメント引用範囲を `:554-558` と記載 | `grep -n "export function serializeStageSeams"` = **555**。3行コメントは `:552-554` | **コメントは `:552-554`、関数宣言は `:555`** と分離して記載 |

いずれも主張の成否を変えない位置の訂正であり、§1・§2c の結論は不変。

### 9c. Developer scan 未検出の追加発見（1件）

**A1: `kindAwareArtifactsExist`（`amadeus-state.ts:1653-1678`）— approve 側の第3の fail-open。** scan は approve 側 fail-open を `producesArtifactsExist` の ANY ループのみとして扱ったが、`:1689-1690` が最初に呼ぶ kind-aware 分岐を見落としている。本関数は `:1677` `return !hasApplicableArtifact;` により**どの unit にも適用成果物が無い場合 `true` を返す**（= `unitCovered:3465` と同型の `produces_kinds` 起因 fail-open が approve 側にも独立に存在する）。加えて `:1675` は**最初に成果物が揃った1 unit で `true` を返す**ため、ANY 判定は kind-aware 経路にも及ぶ。裁定候補 8 の対象範囲をこの3経路へ拡張した。

### 9d. Architect が追加した観測（1件）

**コメントと実装の食い違い**: `unitCovered` の直上コメント `:3448-3451` は「an empty required set remains NOT covered so the engine never silently skips a unit it cannot prove it ran」と不変条件を宣言するが、`:3465` の `produces_kinds` 経由の枝はこれを満たさない（`cid:reverse-engineering:comment-premise-verify-not-just-quote`）。裁定候補 4 へ反映済み。

---

## 10. 共有 codekb 成果物の更新範囲と無変更判断

**更新（5件）**: `reverse-engineering-timestamp.md`（現在節を追加、`260804-phase-boundary-approval` を履歴へ降格）/ `architecture.md`（plugin seam 機構の半実装状態と3層 trust の現況節）/ `component-inventory.md`（plugin 系5ファイルの棚卸し）/ `code-structure.md`（区間デルタと患部配置）/ `code-quality-assessment.md`（fail-open 3経路・approve ANY 非対称・コメント不整合）。

**無変更（4件、根拠付き）**:

| ファイル | 無変更の根拠（実測） |
|---|---|
| `business-overview.md` | 区間 27 commits に業務境界・提供価値の変化に該当する着地がない（着地は TLA+ authoring / Kiro TUI E2E / autonomy / metrics snapshot）。本 intent の scan は engine 内部機構の断面確定であり業務境界を動かさない |
| `api-documentation.md` | 患部10ファイルのうち区間内 touch は `scripts/plugin-projection.ts` のみで、これはパッケージング内部のガード追加であり公開契約（CLI verb / directive schema / plugin manifest schema）を変えていない。`parsePluginManifest` の受理集合も区間内で無変更 |
| `technology-stack.md` | 区間内に依存追加・ランタイム変更なし（ビルドは bun 不変、`package.json` の依存差分なし） |
| `dependencies.md` | 同上。新規の依存エッジは観測されず、import-closure guard は既存 import 関係を**検査**するだけで新規エッジを作らない |

いずれも「現在」マーカーのみ `260804-phase-boundary-approval` → 履歴へ降格した（`cid:reverse-engineering:c3-relabel` — 現在マーカーの複数併存を避けるためラベル1行のみ変更し、本文は保持）。
