# Code Generation Plan — U2 walking-skeleton-claude(Bolt 2 = walking-skeleton Bolt)

> 上流入力(consumes 全数): functional-design(business-logic-model / business-rules / domain-entities)、nfr-design(logical-components / performance-design / security-design / reliability-design / scalability-design)、nfr-requirements(security-requirements)、application-design(component-methods)、harness-capability-matrix

Bolt 内順序(business-logic-model「engine 移設(C2)の実行順」= リスク制御)に従い、移設を先頭に置き各段で検証 green を確認してから次へ進んだ。

## 実装順序と各段の検証結果(exit code 転記)

### 段1: engine 移設(C2)— コミット `edb8164db`
- `git mv scripts/plugin-composition.ts → packages/framework/core/tools/amadeus-plugin-compose.ts`(シグネチャ不変)。旧パス互換 re-export なし(BR-U2-7 / org.md Forbidden)。
- import 修正: 自己相対(`./amadeus-lib.ts` / `./amadeus-stage-schema.ts`)。`ReadOnlyFs` / `nodeReadOnlyFs` seam を core へ**同居移設**(単一定義 — C2「二重定義しない」)、`scripts/plugin-projection.ts` は core から import + 再 export(既存消費者維持)。
- 消費側 import 更新: t252 / t253 / t254 / t-formal-verif-plugin-lifecycle の import path + `covers:` ヘッダを新パスへ。
- 検証: `bun run typecheck` → **exit 0** / t252+t253+t254+t-plugin-projection*+formal-verif(88 tests)→ **0 fail**(挙動不変の実証)/ `biome check`(移設2ファイル)→ **exit 0**。

### 段2: CLI(C1)— `packages/framework/core/tools/amadeus-plugin.ts`(新設 437 行)
- `parsePluginCliArgs(argv): CliParseResult`(純関数・fail-closed 判別 union)、`handlePluginCli(argv, deps): number`(in-process seam)、`runPluginCli` / `renderPluginCliResult`。
- verb compose/doctor/drop/status、`--if-stale` no-op 高速路(`isRecordCurrent` = discover+record 比較のみ、inspect/plan/apply/recompile 不到達)、`--project-root`、未知 verb/フラグ/余剰引数 fail-closed(usage+exit 2)。
- `buildHostSnapshot`(engine の serializeStageSeams native 形を読む)、`nodeTx`(verify seam)、compose/drop 成功後に既存 `amadeus-runtime.ts compile` を spawn(deps.recompile)。
- host モデル: discovery/install は staging dot-dir `.amadeus-plugin-src`(host snapshot から除外)、composed owned は compile 可視 `plugins/<name>/`(engine の owned-path 契約と一致、t254 の discovery/host 分離を踏襲)。
- ドメインモデル: `ownedStageDigests` を engine の単一定義として export し planPluginComposition と共有(no-op 判定と同一計算)。
- 検証: `bun run typecheck` → **exit 0** / `biome check` → **exit 0**。

### 段3: claude 最小投影(C3 claude 面)— `scripts/plugin-projection.ts`(+86 行)+ `scripts/package.ts`
- `projectPluginForHarness(plugin, "claude", outDir)`(出力先安全検査: symlink/file/非空 dir 拒否 = ADR-5 claude 面最小、全集合は U3)、pure builder `claudeInstallArtifacts`、`claudeMarketplaceManifest` / `claudeHooksSnippet`。他ハーネス面は U3(throw で明示)。
- 生成物: `.claude-plugin/plugin.json` + `hooks/hooks.json`(SessionStart 1 行 `compose --if-stale || true`)+ `plugins/<name>/` claude 変換内容。
- package.ts の `neutralBundleExpected` へ `plugins/<name>/claude/` を編入(0-plugin 時 no-op = byte-identical 維持、drift ガード対象)。
- 検証: `bun run typecheck` → **exit 0** / `biome check` → **exit 0**(hook 文字列の shell `${}` は意図的 biome-ignore)。

### 段4: claude フック配線(C4 claude 面)
- `packages/framework/harness/claude/settings.json.example` の SessionStart に `bun "${CLAUDE_PROJECT_DIR:-.}/.claude/tools/amadeus-plugin.ts" compose --if-stale || true` を追加(`|| true` = 失敗時 stderr 1 行警告+セッション継続 / BR-U2-4)。

### 段5: E2E / 統合テスト
- `tests/integration/t299-plugin-cli-walking-skeleton.integration.test.ts`(in-process handlePluginCli、injected deps): fail-closed(BR-U2-4)、compose 着地 + compiled graph 反映(`discoverPluginStageFiles`、FR-4)、no-op 高速路 applyPluginPlan 到達 0(BR-U2-3)、冪等 compose×2 byte-identical(BR-U2-2)、drop → baseline 復元(BR-U2-8)、verify 失敗の三面不変(BR-U2-5)、status/doctor 射影。
- 同ファイル内 real-subprocess テスト: 実 `bun amadeus-plugin.ts compose` を spawn し composition record 実書込を assert(BR-U2-6 verification theatre 禁止 — 配線実在検査ではない実起動)。
- `tests/unit/t300-plugin-cli-args.test.ts`: parser の受理/拒否全列挙(純関数、unit 層 = fs-tests-integration-first)。
- 検証: t299+t300 → **10 pass / 0 fail**。

### 段6: dist 同期(BR-U2-9)
- `bun scripts/package.ts` → **exit 0** / `bun run promote:self` → **exit 0** / `bun run dist:check` → **exit 0** / `bun run promote:self:check` → **exit 0**。
- coverage registry `--check` → **exit 0**(fresh、ガード green、ratchet held — regen 不要)。

### 段7: 全検証
- 転記は code-summary.md 「検証コマンドと exit」節に集約。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T19:04:32Z
- **Iteration:** 1
- **Scope decision:** none

BR-U2-1/3/4 は実コード裏取り済み、逸脱申告 3 件は妥当。Major 2: (1) BR-U2-11 DropsRecord 骨格が無申告で未実装(grep 0 件、FR-4(d) dropped-with-log 未実現) (2) BR-U2-6 の実起動テストが hook ファイル本体を迂回し CLI 直 spawn のみ(ラッパー分岐が未実行検証)。

### Findings

- [Major] BR-U2-11 DropsRecord 骨格の無申告未実装
- [Major] BR-U2-6 の hook ファイル実起動検証の欠落(CLI 直 spawn のみ)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T19:22:08Z
- **Iteration:** 2
- **Scope decision:** none

Major 2 件の実測閉包を確認。DropsRecord 骨格は生きた配線(compose/drop 対称)+U5 正本形状一致、範囲限定は engine 実挙動の正確な記述。t299 は正準 hook の実 spawn 両分岐(15 pass 自走確認)。新規指摘なし。

### Findings

- None
