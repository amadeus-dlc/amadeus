# re-scan record — 260807-failclosed-recovery-path

本ファイルは intent `260807-failclosed-recovery-path`（scope `self-fix`、Brownfield、Depth Minimal、Test Strategy Comprehensive）の Reverse Engineering における**全数列挙の正本**である。共有9成果物の現在断面は本ファイルを要約したものであり、件数・file:line の疑義は本ファイルを参照して解決する。

## 実行メタデータ

- Date: `2026-08-07`
- Base commit: `7060956c5617125dd2f4e284957aa180cb306484`（`cid:reverse-engineering:rescan-base-ancestry` に従い、`re-scans/*.md` の observed 候補 **109 件**から HEAD 祖先かつ距離最小のものを選定。距離 **76 commits**）
- Observed commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（= 本 worktree HEAD = `origin/main`。`git rev-list --left-right --count origin/main...HEAD` = `0 0`。`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録）
- 区間規模: **76 commits / 1223 files changed（+63856 / −3121）**。`amadeus/` record を除く実質変更は **483 files**
- Focus: fail-closed ガードの回復経路不在3件 — [#2313](https://github.com/amadeus-dlc/amadeus/issues/2313) / [#2330](https://github.com/amadeus-dlc/amadeus/issues/2330) / [#2358](https://github.com/amadeus-dlc/amadeus/issues/2358)。実装引き継ぎの正本は [#2385](https://github.com/amadeus-dlc/amadeus/issues/2385)
- Scan mode: DIFFERENTIAL refresh（下記 § scan mode の位置づけ）
- Verification: 本 RE では新規テストを実行していない（Depth Minimal）。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない

### scan mode の位置づけ

`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue` が要求する「起票者以外2名の独立エビデンス付き verdict」は #2313 / #2330 / #2358 の GitHub コメント上で**成立していない**（全コメントの著者は起票者本人 j5ik2o）。したがって **xrev mode は主張しない。**

代替の接地は次の3点である:

1. **#2385 を一次入力とする** — 別ハーネス Kimi Code による独立再調査で突合検証済みと本文が記載している。
2. **conductor 自身の verbatim 実読で二重化する** — 下記 § A〜§ C はすべて observed 断面で conductor が自ら実行・実読した一次事実である（記憶・伝聞ではない）。
3. **実 CI run ログを一次証拠として取得する** — `gh run list` / `gh run view --log-failed` の実出力を転記した。

### 行番号引用の currency

#2385 の測定 ref は `b8e3e664f` であり、本 intent の observed と**完全一致**する。したがって全 file:line 引用は observed 断面で同一に解決する。**これは免除の適用ではなく、区間実測による currency の確定である**（`cid:reverse-engineering:E-XBB-RE-S13-c2` が定める「免除を主張せず、実測を成果物へ明記する」形に従う）。

実読で確認した軽微な差（いずれも ±2 行の範囲指定の差であり、指している構文要素は同一）:

| #2385 の記載 | observed の実体 | 対象 |
| --- | --- | --- |
| `:653-658` | `:653-657` | #2330 の設計コメント |
| `:658-661` | `:659-675` | `parseStore` |
| `:681-689` | `:681-691` | `readStore` |
| `:1524-1532` | USAGE `:1516-1520` + dispatch `:1522-1532` | CLI verb |

## base→observed 区間の全数

### テーマ別分類

| テーマ | 主なコミット / PR |
|---|---|
| no-silent-drop 世代交代 | `fe8c701ba` replace previousDigest ledger with append-only ULID events (#2338 / PR #2353)、`dd0a66ac2` adoption evidence registry を着地点へ rebind (#2156 / PR #2379)、`07427f2f9` rebind previousDigests to current ledger bytes (#2332) |
| autonomy / semi 再定義（#2253 Bolt 群） | `3d52c7705` autonomy-statusline (#2293)、`e1e0e25d5` launch-autonomy-flag (#2294)、`873ce1dc3` semi-authorization-core (#2295)、`d3c53888f` semi-policy-carrier (#2316)、`2f47beda7` stop-question-carveout (#2317)、`f7310bd76` advisory-auto-resolution (#2318)、`44bd35272` semi docs revision (#2321) |
| subagent 可観測性 / PI | `0b739f64b` PI subagent extension + session-wide concurrency valve (#2343)、`611b16466` subagent 型規律ガードと実効 model 属性 (#2279 / PR #2362) |
| pr-convergence plugin（新規） | `0779c8e5d` seam-bridge U1 (#2282)、`6b2ff7f95` U2 convergence toolchain (#2283)、`da0efa4a3` plugin stage + report-format sensor + packaging E2E (#2284) |
| TLA+ authoring（formal-model-check） | `bb0e3b479` Bolt 5 registration committer / atomic model-map replace (#2287)、`8e3bd78ca` Bolt 6 tla-authoring stage 文書と未知題材 E2E (#2312) |
| engine / 判定修復 | `16171c4ee` await-completion directive (#2301)、`5edf5c5a3` reviewer invocation fail-closed (#2274)、`bd64c91b4` cast-guard chain/satisfies 検出 (#2273)、`d4b196109` election ballot receipt time (#2275)、`550bfc994` SWARM 実績を世代へ束縛 (#1953 FR-5 / PR #2360)、`c03a1e1fd` CG approve 突合を Unit 名へ (#2355)、`800327ece` cross-harness resume (#2329) |
| docs | `b1eb8fa02` 実装乖離修正バッチ (#2302)、`f068650ab` worktree/branch 規範 (#2331)、`bf82c9874` verification.md 是正 (#2272) |

残りの大半は `chore(metrics): record/maintain snapshots` の自動 PR（#2290〜#2384）。

### 上位バケットの内訳

**packages/framework（52 files / +5071 −300）**

新規追加5:

- `packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts`（+165）
- `packages/framework/core/tools/amadeus-session-takeover.ts`（+275）— `parseSessionTakeoverArgs`（`:67`）、`planSessionTakeover`（`:149`）、`readSessionTakeoverFacts`（`:194`）、`applySessionTakeover`（`:248`）
- `packages/framework/core/tools/amadeus-subagent-observability.ts`（+293）— `TypeVerdict`（`:36`）、`resolveAllowedAgentTypes`（`:144`）、`classifyAgentType`（`:178`）、`ModelSource`（`:196`）、`resolveEffectiveModel`（`:226`）、`resolvePersonaPin`（`:267`）
- `packages/framework/core/tools/amadeus-subagent-stats.ts`（+468）— `composeStatsReport`（`:105`）、`renderStatsText`（`:191`）、`scanAuditCorpus`（`:345`）、`main`（`:433`）
- `packages/framework/core/sensors/amadeus-pr-convergence-report-format.md`（+64、センサ定義）

大きく変わった既存 tools: `amadeus-orchestrate.ts` +438、`amadeus-advisory-choice.ts` +383、`amadeus-plugin-compose.ts` +313、`amadeus-intent-autonomy.ts` +282、`amadeus-lib.ts` +198、`amadeus-reviewer-runtime.ts` +139、`amadeus-state.ts` +128、`amadeus-caller-authorization.ts` +93、`amadeus-intent-autonomy-production.ts` +74、`amadeus-workflow-completion.ts` +54、`amadeus-formal-verif-model-map.ts` +51、`amadeus-goal-reconciliation.ts` +43、`amadeus-intent-autonomy-runtime.ts` +44、`amadeus-plugin.ts` +33、`amadeus-election-model.ts` +30、`amadeus-swarm.ts` +28、`amadeus-directive.ts` +27。

hooks: `amadeus-log-subagent.ts` 新設（+69）、`amadeus-log-subagent-start.ts` / `amadeus-mint-presence.ts` +8、`amadeus-statusline.ts` +14（#2293）、`amadeus-stop.ts` +40（#2317）。`core/otel/event-registry.ts` +29。

harness 層: `harness/pi/extensions/subagent.ts` **新規 +1172**（#2343）、`harness/pi/manifest.ts` +18、`harness/pi/drivers/amadeus-pi-driver.ts` +48 / `-contract.ts` +23、`harness/kimi/hooks/amadeus-kimi-lib.ts` +193（#2329）。SKILL.md は claude / codex / kimi / kiro / kiro-ide / pi の6ハーネスで一律 +7〜9 行。`harness/cursor/commands/amadeus.md` と `harness/opencode/commands/amadeus.md` は +3。

knowledge / protocols: `core/knowledge/amadeus-shared/audit-format.md` +10、`verification.md` +4（#2272）、`amadeus-common/protocols/stage-protocol.md` +8。

**plugins**

- `formal-model-check`（8 files 変更、tools 計 33 ファイル）: 新規 `stages/tla-authoring.md`（+160）と `tools/tla-registration.ts`（+349、atomic model-map replace の committer、#2287）。`tools/tla-authoring.ts` +87、`tools/amadeus-formal-verif-model-map.ts` +51、`tla-arm.ts` +12、`tla-applicability.ts` +8、`plugin.json` +5、`README.md` +6。
- `pr-convergence`（6 files、**全て新規**）: `plugin.json`（+23）、`stages/pr-convergence.md`（+207）、`tools/pr-convergence-cli.ts`（+515）、`tools/pr-convergence-gh-runner.ts`（+249）、`tools/pr-convergence-ledger.ts`（+394）、`tools/pr-convergence-predicate.ts`（+269）。フィクスチャは `tests/fixtures/pr-convergence/` に実測 GraphQL 4 件（PR #1945 / #2264 / #2268 / #2269）＋ページング合成2件＋README。

**no-silent-drop（本 intent の患部を含む）**

- `tests/no-silent-drop/baseline.json` と `exemptions.json` は **削除**され、append-only ULID イベント台帳へ置換（#2338）。
- `tests/no-silent-drop/events/` = 1 ULID 1 ファイルの JSON。observed 断面で **217 ファイル**（区間で 217 件すべてが新規追加）。
- `events.ts:15` `EVENTS_DIR`。イベント型3種: `GrantEvent`（`kind: "grandfather" | "exemption"`、`:19`）/ `RevokeEvent`（`:31`）/ `SnapshotEvent`（`effectiveDigest` / `effective[]` / `deleteUlids[]`、`:47`）。畳み込みは `foldEvents`（`:213`）→ `FoldedLedger`（`:58`）、旧 doc 形へは `baselineDocFromFold`（`:305`）/ `exemptionsDocFromFold`（`:319`）。custody 検証は `listEventUlidsAtRevision`（`:323`）と `assertEventCustody`（`:438`）。ULID は `tests/no-silent-drop/ulid.ts`（新規、61行）。
- `previousDigest` によるバイト束縛は廃止。残骸は `model.ts:69,76`（optional field）と `evidence-rebind.ts:407` / `bootstrap.ts:337,433` のコメントのみ。代替は「trusted base revision でのイベント custody 照合」。
- モジュール規模: `ledger.ts`（308行）/ `repository-adoption-evidence.ts`（468行、`ADOPTION_RECEIPT_IDS` `:5` は **23 種**）/ `repository-adoption.ts`（227行）/ `evidence-rebind.ts`（623行）/ `engine.ts`（315行）/ `tests/no-silent-drop-gate.ts`（36行）/ `scripts/no-silent-drop-evidence.ts`（270行）/ `scripts/no-silent-drop-evidence-adapter.ts`（463行）/ `scripts/no-silent-drop-retention.ts`（175行、新規）/ `scripts/no-silent-drop-migrate-events.ts`（87行、新規）。
- registry 着地点: `tests/no-silent-drop/adoption-evidence.json` の `currentRevision = fe8c701ba15c0677a4ec18cc3715ff1086318dde`、receipts 23 件。
- CI ジョブ: `ci.yml:121-157`（trusted base ratchet）/ `no-silent-drop-evidence-reconcile.yml`（`push: [main]`）/ `no-silent-drop-retention.yml`（新規、毎週月 03:00 UTC + workflow_dispatch）。

**technology-stack / dependencies**

`package.json` の実質 diff は **1 箇所のみ**: `pi.extensions` に `./dist/pi/.pi/extensions/subagent.ts` を追加（`devDependencies` は無変更）。observed の固定値は bun **1.3.13**（全 workflow 単一値）、`bun-types: ^1.3.13`、TypeScript `^6.0.3`、Biome `2.5.5`、`@anthropic-ai/claude-agent-sdk` 0.3.158、`@ast-grep/napi` 0.45.0、`@opentelemetry/api` 1.9.1 / `api-logs` 0.221.0 / `context-async-hooks` 2.10.0、`fast-check` ^4.9.0、`release-it` ^20.2.1。lizard は CI で `pip install lizard==1.23.0`（`ci.yml:196` / `:279` / `:426`）。lint 対象は `tests/ packages/setup/ packages/framework/core/ scripts/ plugins/`。

**テスト・ゲート台帳**

| ファイル | 役割 | 現在値 |
|---|---|---|
| `tests/.coverage-ratchet.json`（区間 +4/−4） | クラス別 covered 数の単調非減少ラチェット | function 176 / audit 44 / scope 15 / stage 8 / hook 14 / subcommand 84 / render-surface 7 |
| `tests/.coverage-registry.json`（+76） | `gen-coverage-registry.ts` 生成のユニット台帳。7 unitClass + `minMechanism` | ディスクから再列挙 |
| `tests/.coverage-patch-allowlist.json`（+234） | patch coverage 免除 | 区間で大幅増 |
| `tests/.coverage-project-policy.json`（無変更） | プロジェクト全体の下限 | `minimumProjectLineCoverageBasisPoints: 9000`、`maximumRelativeDropBasisPoints: 2` |
| `tests/.coverage-project-baseline.json`（無変更） | 絶対基準 | `hits 7225 / lines 17648` |

テスト層（`tests/run-tests.ts`）: smoke / unit / integration / e2e / perf。プロファイルは `(default) = --ci = smoke+unit+integration`、`--release = smoke+unit+integration+e2e+perf`（`:117-125`）。層定数は `:851` / `:908`。smoke 失敗で即中断（`:1027`）、integration は `t19.test.ts` を preflight として先行実行（`:1037`）、e2e は TUI / 非 TUI に分割し `t-tui-preflight.serial.test.ts` を先行（`:1089`）。

mechanism ratchet: `tests/gen-coverage-registry.ts:126-138`。実装ポートは `tests/lib/cli-mechanism.ts` / `sdk-mechanism.ts` / `tui-mechanism.ts`（`:53-55`）。

静的ゲート（CI job "Lint and complexity"）: `bun run lint` → no-silent-drop（`ci.yml:121`）→ `tests/callsite-guard.ts --check`（`:164`）→ `tests/unchecked-cast-guard.ts --check`（`:172`）→ build → `tests/deletion-gate.ts --check --report deletion-gate-report.json`（`:184`）→ `tests/complexity-gate.ts --check`（`:199`）。complexity baseline は `tests/.complexity-baseline.json`（`threshold: 15`、最大値は `amadeus-statusline.ts main` CCN 26）。#2273 で cast-guard が「最外周チェーンのリンク数」と angle-bracket / `satisfies` 綴りを検出できるようになり、`ci.yml` のコメントから固定件数「33」の記述が消えた（コメントのみの変更）。

**tNNN 採番（conductor が独立再実測して確定）**

- 使用済み **最大 = t465**（`tests/integration/t465-kimi-role-lock-ownership.integration.test.ts`）、ユニークな採番値は **436 個**
- 未使用の空き番号（1..465）: 1 2 3 4 5 6 7 8 9 24 50 58 73 74 101 139 159 217 263 316 317 318 323 324 329 330 331 332 333 334 343 348 358 392 421 422 423 424
- **新規は t466 以降**
- 区間で追加された新規テスト: integration **23 本**（t433, t445, t447〜t465）、unit **16 本**（t444, t446, t448〜t463）。ほかに `tests/formal-verif/support/tla-authoring-e2e-{driver,fixture}.ts`
- **同一 tNNN の複数ファイル共存はこのリポジトリの既存の生態であり、区間固有の債務ではない**（`cid:requirements-analysis:mechanism-cite-verify-at-draft` の追補が「同一テスト番号の複数ファイル共存は実在する生態」と既に明文化）。**債務としては記録しない。**

**docs（53 files / +1376 −132）**

- `docs/reference` の章番号空間の現在の最大は **24**。新章 `24-intent-autonomy.md`（+183）/ `.ja.md`（+172）。`22-formal-model-supply.md` は +95/+43 の大幅加筆。**次の新章は 25 から。**
- 更新: `11-contributing.md` +53（#2331）、`12-state-machine.md` +46、`07-sensor-system.md` +32、`06-hooks-and-tools.md` +6、`01-architecture` / `03-orchestrator` / `17-skill-system` / `04-stages/construction` は各 +2〜4。
- `docs/guide`（最大章番号 = 23、新章追加なし）: `19-plugins.md` +86 / `.ja` +66、`11-session-management.md` +86 / `.ja` +76、`05-scopes-and-depth` +61（両言語）ほか軽微。
- `docs/harness-engineering`（章番号空間の最大 = 09）: `live-e2e.ja.md` 新規（+91）、`09-porting-to-a-new-harness` +20/+18、`08-construction-and-swarm` +22、`04-scopes` +13、`06-sensors` +5。
- `docs/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md` +5。

## 患部3面の現存確認（observed 実読）

以下はすべて conductor が observed 断面で自ら実行・実読した一次事実である（記憶・伝聞ではない）。

### A. #2313 — no-silent-drop evidence reconcile

#### A-1. 失敗の実在（CI 一次ログ）

`gh run list --repo amadeus-dlc/amadeus --branch main --workflow "No Silent Drop Evidence Reconcile" --limit 5`:

| run | 結論 | 契機コミット |
|---|---|---|
| 31135902843 | failure | chore(metrics): maintain snapshots at aa86f1bcc… |
| 31135860614 | failure | chore(metrics): record snapshot 611b16466… |
| 31135183398 | failure | feat(observability): subagent の型規律ガード… (#2362) |
| 31134255597 | success | chore(metrics): maintain snapshots at cf8195345… |
| 31134194619 | success | chore(metrics): record snapshot dd0a66ac2… |

run 31135902843 のジョブログ実文（`gh run view --log-failed` からの転記）:

```json
{"schemaVersion":1,"operation":"no-silent-drop-evidence-rebind","status":"error","code":"REBIND_NON_IDENTITY_DRIFT","eventRevision":"b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d","bindingRevision":"fe8c701ba15c0677a4ec18cc3715ff1086318dde","targetRevision":"b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d","changed":false,"counts":{"registryRevisions":0,"manifestRevisions":0,"runRevisions":0,"artifactDigests":0,"receiptDigests":0},"paths":[],"validation":{"ok":false,"problems":[]},"error":{"code":"REBIND_NON_IDENTITY_DRIFT","message":"current binding is reachable but evidence freshness paths changed"}}
```

#### A-2. 機序の再現（3コマンド、いずれも observed で実測）

```
$ git merge-base --is-ancestor fe8c701ba15c0677a4ec18cc3715ff1086318dde b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d ; echo $?
0                                  # binding は event の祖先 → 主分岐（freshness）へ入る

$ git diff --name-only fe8c701ba..b8e3e664f -- packages/framework/core/tools ':(glob)tests/no-silent-drop/**/*.ts'
packages/framework/core/tools/amadeus-lib.ts
packages/framework/core/tools/amadeus-subagent-observability.ts
packages/framework/core/tools/amadeus-subagent-stats.ts     # adapter の広域 set → drift あり → throw

$ git diff --name-only fe8c701ba..b8e3e664f -- ':(glob)tests/no-silent-drop/**/*.ts' tests/no-silent-drop-gate.ts ; echo $?
0                                  # t413 の正準 narrow set → drift なし（空出力）
```

#### A-3. 患部の逐語（observed 実読）

`scripts/no-silent-drop-evidence-adapter.ts:226-240`（freshness 述語）:

```ts
    const freshness = this.run([
      "git", "diff", "--quiet",
      `${registry.currentRevision}..${eventRevision}`,
      "--",
      "packages/framework/core/tools",
      ":(glob)tests/no-silent-drop/**/*.ts",
    ]);
    if (freshness.status === 0) return true;
    if (freshness.status === 1) {
      throw new EvidenceRebindError(
        "REBIND_NON_IDENTITY_DRIFT",
        "current binding is reachable but evidence freshness paths changed",
      );
```

呼び出し側 `scripts/no-silent-drop-evidence.ts:162-171` は `currentBindingIsValidForEvent` が **false を返したときだけ** `proveIdentityOnlyRebind` へ進む。throw はどの回復経路にも到達しない。

正準側 `tests/integration/t413-no-silent-drop-ci-adoption.test.ts:181-195`（選定理由コメント + 述語）:
コメント逐語 "Freshness is asserted over the gate's own implementation only. packages/framework/core/tools is the corpus the gate scans, not the gate: … it needs an evidence-regeneration path, not a pin here."
述語のパスは `":(glob)tests/no-silent-drop/**/*.ts"` と `"tests/no-silent-drop-gate.ts"` の2要素。

第2段 tree 証明 `scripts/no-silent-drop-evidence-adapter.ts:316-324`:

```ts
    const pullRequestTree = this.rootTree(pullRequestHead);
    const landingTree = this.rootTree(eventRevision);
    if (pullRequestTree !== landingTree) {
      throw new EvidenceRebindError(
        "REBIND_PR_LANDING_TREE_MISMATCH",
        "final pull request head and landing commit root trees differ",
      );
    }
```

第1段（`:305-315`）は既に `EVIDENCE_BUNDLE_PATHS` の3ファイルを除外した tree 比較の形を持つ。
`EVIDENCE_BUNDLE_PATHS` の実体は `tests/no-silent-drop/evidence-rebind.ts:24-30` の3定数（`adoption-evidence-manifest.json` / `adoption-evidence.json` / `evidence/adoption-runs.json`）。

#### A-4. 影響範囲についての訂正

§ 「#2385 の記載と observed の食い違い」を参照。

#### A-5. ローカル実行の呼び出し規約（build-and-test 向けの知識）

`bun tests/no-silent-drop-gate.ts check` を **`--base-revision` 無し**で実行すると必ず
`{"code":"BASELINE_INVALID","detail":"check mode requires a non-zero trusted base revision"}` / exit 2。
これは欠陥ではなく規約: `tests/no-silent-drop/engine.ts:250-252` が `trustedBaseSha` の null を拒否し、
`tests/no-silent-drop/ledger.ts:213-223` の解決順は explicit → `AMADEUS_NSD_TRUSTED_BASE_SHA` → `GITHUB_BASE_SHA` → `GITHUB_EVENT_BEFORE`。
さらに base は **HEAD の厳密祖先**でなければならない（HEAD 自身を渡すと
`"trusted base is not a strict ancestor of HEAD: b8e3e664f…"` / exit 2）。

### B. #2330 — advisory choice store の schema 1→2 回復経路

#### B-1. 患部の逐語（`packages/framework/core/tools/amadeus-advisory-choice.ts`、全 1567 行）

- `:653-657` 設計コメント逐語: "Schema 2 (#2253). A schema 1 store on disk is NOT translated: it fails to parse, and the caller's existing `!storeResult.ok` arm turns that into a fail-closed hold. …the safe answer to that question is to ask the human again — which the hold already does."
- `:659-661` `parseStore` は `value.schema !== 2` で reject
- `:681-691` `readStore` は **store 不在時のみ**空の schema 2 を返す（既存 schema 1 ファイルは parse 失敗）
- `:640-651` `parsePending` は `value.schema !== 1` を拒否 = **pending エントリ自体は schema 1 のまま**（salvage に再利用可能）
- `:1516-1532` CLI は `record` / `correct-misattributed` の **2 verb のみ**（USAGE 逐語で確認）。回復 verb は存在しない
- `packages/framework/core/tools/amadeus-orchestrate.ts:797-799` `applyPendingAdvisoryGuard` は
  `if (pending.length === 0) return directive;` で early return → evaluator がもう advisory を raise しない intent では guard 経路自体が走らない

#### B-2. store 分布の再census

§ 「#2385 の記載と observed の食い違い」を参照。

### C. #2358 — degrade 経路で全 unit 被覆後にゲートが発行されない

#### C-1. 患部の逐語（`packages/framework/core/tools/amadeus-orchestrate.ts`）

`degradeUnitResolutionError`（`:3707-3733`）の全被覆アーム（`:3727-3731`）:

```ts
  if (uncovered.length === 0) {
    const done = "Every one of them already holds this stage's required artifacts, so no unit is left to run.";
    const move = "Create the unit directory for this piece of work (its name becomes the unit segment of every artifact path), then re-run `next`.";
    return errorDirective(`${preamble} and ${found} ${done} ${move}`);
  }
```

被覆述語 `unitCovered`（`:3746-3760`）は **produces の実在のみ**で判定し §12a Review の記録有無を見ない（= #2359 と共有する述語）。
単一 unit の解決（`:3807` `if (candidates.length === 1) return { unit: candidates[0], uncovered };`）は covered でも解決する。

#### C-2. 既決ノルム・選挙記録の実在確認

- 選挙記録ディレクトリ実在: `amadeus/spaces/default/elections/260730-e-obb2-cg1/`、`260730-e-obb2-cgs13/`（ほかに `-ras13` / `-res13`）
- `amadeus/spaces/default/memory/project.md:287` に `cid:code-generation:c1-degrade-batch-directive-capture` が実在し、逐語で
  「全 unit covered 後の engine emit は裁定 B（E-OBB2-CG1）どおり fail-closed のため、build 時捕捉が唯一の in-band 経路」と記す
- テスト pin: `tests/integration/t367-degrade-unitname-resolution.test.ts:411-420` が test 13（複数 unit 全被覆 → refuse）を pin。
  直後の test 14（`:428-437`）は「a lone finished unit still resolves, carrying the stage gate」を pin し、
  コメント `:422-426` が E-OBB2-CG1 を「INTENTIONAL と裁定した非対称」と明記する。**詰みは multi-unit 限定**であることを裏付ける

#### C-3. 干渉先の現況

`gh issue list --state open --label bug` → open bug **16 件**（対象3件を含む）。#2359 は **OPEN・未修正**。
したがって #2385 Q4-B（明示宣言）の「宣言受理点を #2359 の hook として空けておく」制約は observed でも有効。

## #2385 の記載と observed の食い違い

### (1) #2313 の影響範囲

| 観点 | Issue #2385 の記載 | observed の実測 | requirements 段で要る判断 |
| --- | --- | --- | --- |
| 影響範囲 | 「全 PR の trusted base ゲートが内容と無関係に `BASELINE_INVALID` になり、あらゆる修正 PR が着地できない」 | **成立しない。** main の最新 CI run **31135183415 は success**（ratchet ステップを含む `Lint and complexity` job も success）。ローカル実測 `bun tests/no-silent-drop-gate.ts check --base-revision <HEAD^ の完全 SHA>` → **exit 0** / `{"schemaVersion":1,"status":"pass","code":"NO_SILENT_DROP_OK","findings":[]}` | 恒久赤は **main 限定の `No Silent Drop Evidence Reconcile` ワークフローのみ**。**S1-FATAL / P1 の根拠文の再判定** |
| 起点 | （記載なし） | **仮説（未確定）**: #2338（events 台帳化、PR #2353 = `fe8c701ba`）の着地で ratchet の入力が `baseline.json` から events 台帳の custody 照合へ移ったこと | 起点の確定を受入基準に含めるか、機序不問で回復経路のみを要件化するか |
| 修正の必要性 | 必要 | **変わらず必要**（reconcile が赤のままなら evidence binding は陳腐化し続け、gate 実装を触る PR の rebind 運用も不明瞭なまま） | — |

### (2) #2330 の store 分布

`find <clone root> -name '.amadeus-advisory-choice.json'` → **6 件**。各ファイルの `jq '.schema, (.pending|length), (.receipts|length)'`:

| schema | pending | receipts | パス（clone root からの相対） |
|---|---|---|---|
| 1 | 1 | 1 | `amadeus/spaces/default/intents/260804-tla-authoring/.amadeus-advisory-choice.json` |
| 1 | 1 | 1 | `.claude/worktrees/docs-maintenance/…/260805-docs-impl-sync/…` |
| 1 | 2 | 2 | `.claude/worktrees/tla-authoring-wt/…/260804-tla-authoring/…` |
| 1 | 3 | 3 | `.claude/worktrees/issue-1971-pr-convergence/…/260805-pr-convergence-plugin/…` |
| 1 | 3 | 3 | `.claude/worktrees/260805-subagent-type-guard/…/260805-subagent-type-guard/…` |
| 2 | 1 | 1 | `.claude/worktrees/xrev-open-bugs/…/260805-xrev-bug-batch/…` |

| 観点 | Issue #2385 §7(b) の記載 | observed の実測 | requirements 段で要る判断 |
| --- | --- | --- | --- |
| 分布 | 「本調査 clone では 260805-subagent-type-guard に 1 件」 | **schema 1 が 5 件・schema 2 が 1 件**、計 6 件 | 回復 verb の**対象範囲**（単一 store か、探索して複数か） |
| 前提 | store は gitignored の per-clone ランタイムであり git から census 不能 | **前提は変わらない。** ただし **1 clone 内で複数 worktree にまたがって schema 1 が滞留する**ことは実測で確定した | 探索する場合の探索根・深さ・誤爆防止の限定 |

## 後続ステージへの申し送り

1. **#2313 は Q1 + Q2-A の同一 PR 制約が実測で裏付けられた。** 主分岐（freshness）と副分岐（回復）は binding の**祖先性**で交互に現れる（observed では `git merge-base --is-ancestor fe8c701ba b8e3e664f` = exit 0 のため主分岐へ入る）。したがって述語の canonical 化（Q1）だけを入れても、祖先性が偽になる将来の断面では副分岐しか走らず回復経路（Q2-A）は検証されない。逆も同様。**両方を同一 PR に入れないと、どちらの分岐も実測で閉包できない。**
2. **#2330 の回復 verb の対象範囲が未確定。** 単一 store（引数で明示）か、clone 内を探索して複数を扱うか。実測では 5 件の schema 1 が複数 worktree にまたがって滞留しており、探索側を選ぶ場合は探索根・深さ・per-clone 前提の扱いを受け入れ基準で固定する必要がある。あわせて回復形（`parsePending` が受理する schema 1 pending の salvage か、破棄して人間へ訊き直すか）も未確定。
3. **#2358 の宣言受理点は #2359（OPEN・未修正）の hook を塞がないこと。** `unitCovered`（`:3746-3760`）は produces の実在のみで判定し §12a Review の記録有無を見ない述語であり、#2359 の射程である。宣言受理点はこの述語の**外側**に置く。あわせて `t367-degrade-unitname-resolution.test.ts:411-420`（test 13）は multi-unit 全被覆 → refuse を pin しているため、`cid:reverse-engineering:c1-pinned-behavior-ruling` により**実装段で着手せず、要件段で仕様裁定とテスト契約の明示改訂をセットで確定する**。
4. **ローカルで no-silent-drop gate を回すときの規約**: `bun tests/no-silent-drop-gate.ts check --base-revision <HEAD の厳密祖先の完全 SHA>`。`--base-revision` 省略は必ず `BASELINE_INVALID` / exit 2、HEAD 自身は `"trusted base is not a strict ancestor of HEAD"` / exit 2。短縮 SHA を手で完全形へ展開しない（`cid:requirements-analysis:sha-no-manual-expansion` — `rev-parse` の実出力のみを使う）。
5. **新規テストは t466 以降。** 使用済み最大は t465、ユニーク採番は 436 個。空き番号は上記 § tNNN 採番の一覧を参照。
6. **配布境界が2つにまたがる。** #2313 の患部は `scripts/`（repo-only、dist 投影なし）、#2330 / #2358 は `packages/framework/core/tools/`（正本 → `bun run build` で再生成、追跡ファイル不変）。Bolt を分ける場合、検証コマンド集合が Bolt ごとに異なる。
7. **台帳への波及**: `amadeus-advisory-choice.ts` / `amadeus-orchestrate.ts` へ行を挿入する修正では `cid:code-generation:c1-allowlist-mechanical-remap`（機械 remap ＋ reason 直読照合）、`cid:code-generation:cg-allowlist-straddle-swell`（span 膨張検査）、`cid:code-generation:c5-ratchet-census-at-final-base`（census は最終 base で採る）、`cid:code-generation:c1-260803-state-integrity`（no-silent-drop 台帳は events 追記のみ。削除・snapshot は maintenance CI 専用）が該当する。
8. **docs 章番号**: `docs/reference` の次の新章は **25** から。発行直前とマージ直前に origin/main 実測で再確認する（`cid:code-generation:shared-ledger-insert-collision` の追補、fail-closed）。
