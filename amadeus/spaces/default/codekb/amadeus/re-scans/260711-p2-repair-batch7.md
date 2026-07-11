# Re-scan 記録 — 260711-p2-repair-batch7

> #707 契約(per-intent re-scan 記録)。差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `d8de2362bfe850c4724bc45200eb4456c921d495` の短縮 `d8de2362b`(最新祖先 observed = 260710-p3-cleanup-batch5、`fix(orchestrate,jump,state): phase lookup のガード`、2026-07-11 07:59:19)
- **observed**: `37ad36a97fe850c4724bc45200eb4456c921d495`(`git rev-parse HEAD` 実測、`intent/p2-repair-batch7` = origin/main ベース)
- **date**: 2026-07-11
- **intent**: `260711-p2-repair-batch7`(restart-loss クラス5バグ — #834 / #839 / #844 / #845 / #849)
- **scope**: bugfix
- **手法**: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス面は正本 `packages/framework/core/tools/` および `.../hooks/` の実コード直読で file:line 確定。base→observed のフォーカス面 diff は `amadeus-utility.ts` の1コミット(#844 面と非交差)のみ、他5ファイルは**バイト同一**(下記)。
- **base 決定の実測**: `git merge-base --is-ancestor` で候補比較。`11c52f153`(swarm-worktree-batch observed)は HEAD の**非祖先**(未マージ系譜)につき除外。HEAD 祖先の re-scan observed 群(`b845478bb` 07-10 18:30 / `d8de2362b` 07-11 07:59 / `fc5a34cf1` 07-10 12:56)のうち `b845 IS ancestor of d8de2362b` を確認し、最新祖先 `d8de2362b` を base に採用。区間 = 13 コミット。
- **実施体制**: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)

## focus(スキャンスコープ)

- **#834 parked 短絡が --new-intent を検査しない**: `amadeus-orchestrate.ts:1243-1259`(Branch 2.5、ガード条件 `:1243-1249` に `!flags.newIntent` 欠落、parked emit `:1252-1257`)。対する Branch 4a `--new-intent` 処理は後段 `:1357-1377`(`if (flags.newIntent) :1369`、`birthPrintDirective` emit `:1376`)。#832 面の roll-forward latch(`:1121-1151`)は別系統で不関与。運用知識 cid:parked-intent-birth-workaround(#750)の恒久修正面。
- **#839 トップレベル catch / error 分岐が ERROR_LOGGED 非配線**: `amadeus-orchestrate.ts:2913-2920`(`import.meta.main` の try/catch は `console.error` + `process.exit(1)` のみ)、`errorDirective:236`(監査書き込みなし)。対照は `amadeus-lib.ts:4353` `export function emitError`(ERROR_LOGGED を `appendAuditEntry` 記録、コメント `:4333-4342`)。orchestrate は lib から `errorMessage` のみ import、`emitError` を import せず。emit⇔terminal 非対称(cid:symmetric-pair-review)。
- **#844 doctor workspace-shell-ready 2状態判定 + fix 文言**: `amadeus-utility.ts:619-632`(`handleDoctor` の「5. Workspace shell ready」)。`shellReady = existsSync(harnessEngineDir) && existsSync(defaultMemoryDir) :627` の pass/fail バイナリ、fix 文言 `:631` はどちら欠落でも一律。対照は同関数「6. Hook heartbeats」の3状態(コメント `:635-640`)。
- **#845 log-subagent 完了 intent ゲート不在 + agent_type 空文字素通し**: `amadeus-log-subagent.ts`(全61行)。ゲート `:48`(`hasActiveWorkflowAudit` のみ、Status=Completed 除外なし)、`agentType :41`(`?? "unknown"` は空文字 `""` を素通し)、fields 無条件格納 `:50-52`(`agentId :53`/`agentMessage :54` は truthy ガードあり)。
- **#849 learnings readRuntimeStageRow 3経路 hard fail**: `amadeus-learnings.ts:127-153`(不在 `:129-130` / malformed `:135-136`,`:138-139`,`:142-143` / stage 未発見 `:152`)。runtime-graph.json は `.gitignore` 対象 per-intent 生成物 → restart-loss。self-heal 移植 seam = `amadeus-runtime.ts:319` `export function compile(opts: CompileOptions)`(フック `amadeus-runtime-compile.ts:121` はこれを spawnSync 発火するだけ。in-process import で不在時再生成が可能)。

## 差分の焦点影響(`d8de2362b..37ad36a97`)

- `git diff --name-status d8de2362b..37ad36a97 --` を6フォーカスファイルに限定した結果、変更は `packages/framework/core/tools/amadeus-utility.ts`(M)のみ。
  - 内訳コミットは `5c5e042a2`(`fix(doctor): anchor worktree Check 1/3 at worktreeBaseDir (#830) (#855)`)。hunk は `@@ -828 +829`(Check 1)・`@@ -995 +996`(Check 3)・import 追記 `@@ -82 +83`。**#844 の workspace-shell-ready ブロック(`:619-632`)には非関与**。
- **フォーカス面への影響: 無**。`amadeus-orchestrate.ts` / `amadeus-log-subagent.ts` / `amadeus-learnings.ts` / `amadeus-runtime.ts` / `amadeus-runtime-compile.ts` は base の理解時点と**バイト同一**。`amadeus-utility.ts` は #830/#855 の Check 1/3 面のみ改変で #844 面は不変。以下の所見はすべて現 observed HEAD のコード直読に基づく。
- 5欠陥はいずれも observed HEAD に**未修正で現存**。

## archive 参照解の所在

archive ブランチ `archive/main-before-restart-20260706-224926`(tip `bc76b6303`、実在確認済)。全参照解は旧系譜パス `.agents/amadeus/{tools,hooks}/...` で、現行正本 `packages/framework/core/{tools,hooks}/...` へ読み替えて移植する(移植コミットは `bun scripts/package.ts` + `bun run promote:self` を同梱)。

| Issue | 参照解 | 日付 | 対象(旧系譜) |
|---|---|---|---|
| #834 | (なし・新規修正) | — | 切り分けは Issue 本文 |
| #839 | `460f56ba0` | 2026-07-05 | `.agents/amadeus/tools/amadeus-orchestrate.ts` |
| #844 | `a59590b32` | 2026-07-06 | `.agents/amadeus/tools/amadeus-utility.ts` ほか |
| #845 | `a2202f58b` | 2026-07-06 | `.agents/amadeus/hooks/amadeus-log-subagent.ts` ほか |
| #849 | `a62efe182` | 2026-07-06 | `.agents/amadeus/tools/amadeus-learnings.ts`、`.agents/amadeus/hooks/amadeus-runtime-compile.ts` ほか |

## batch6(#841 tryEmitSwarm)との交差観測

- #841 対象 `amadeus-orchestrate.ts` の `tryEmitSwarm`(定義 `:1703`、`readBoltDagBatches` 近傍 `:1717-1720`、呼び出し元 `:1643`/`:1669`)。#834 対象は同ファイル Branch 2.5(`:1243-1259`)。
- **ファイル交差・リージョン非交差**(約450行離れる)。c6 は先行 PR の実 diff でリージョン非交差を再評価する規律。batch6 の #841 PR が in-flight なら (a)着地待ち or (b)実 diff で非交差実測後に並行。本ワークツリーに `intents/*batch6*` record は不在(別ワークツリー進行の可能性)。
- 他4欠陥は #841 と別ファイル/別リージョンで交差なし。

## 焦点影響(合成が反映した先)

- `code-quality-assessment.md` — 先頭に「本 intent(p2-repair-batch7)の観測面」節を新設予定: #834(parked 短絡の --new-intent 検査漏れ)/ #839(ERROR_LOGGED 非配線の emit⇔terminal 非対称)/ #844(shell-ready 2状態 vs heartbeat 3状態)/ #845(完了ゲート不在 + `??` の空文字素通し)/ #849(runtime-graph restart-loss と compile seam)。前 intent 節を履歴ラベルへ relabel(c3-relabel)。
- `reverse-engineering-timestamp.md` — 本 intent メタで鮮度ポインタ更新(前 intent 節温存)。
- restart-loss クラスは cid:symmetric-pair-review(片側実装の非対称)と cid:parked-intent-birth-workaround の恒久修正面が中心。その他成果物(business-overview / api-documentation / code-structure / component-inventory / dependencies / technology-stack)は base→observed 無変更かつ本 intent 観測面と無関係のため温存(churn 回避)。
