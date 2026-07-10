# RE スキャン記録 — 260710-bughunt-fix-batch

## 実行メタデータ

- Intent: `260710-bughunt-fix-batch`(scope `bugfix`)
- Stage: `reverse-engineering`(2.1)、Developer スキャン担当
- 手法: 既存 codekb への diff-refresh(フルスキャン禁止、cid:reverse-engineering:c1)
- **Base commit**: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(前回 intent 260710-mint-presence-vectors の observed)
- **Observed commit**: `b845478bbf25a534a59f97f18e5a4a2a5a4e239c`(現 HEAD)
- Date: 2026-07-10

## diff 実測

```
git diff --name-status fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1..b845478bbf25a534a59f97f18e5a4a2a5a4e239c -- ':!amadeus/' ':!dist/'
→ 37 ファイル
```

区間内で本 intent フォーカス面に触れた主なコミット(`git log <base>..<observed> -- <path>`):

| コミット | 内容 | 触れたフォーカス面 |
| --- | --- | --- |
| `9738580ef`(PR #762 = #734) | 自前 project カバレッジゲート(lcov 総計の main ベースライン比 fail-closed) | `tests/coverage-project-gate.ts`(新規)・`ci.yml`・`codecov.yml` |
| `8e212dbbb`(PR #759 = #735) | `package.ts --check` に source 側 unreferenced ファイル検査を追加 | `scripts/package.ts`(+119/-46) |
| `824dca9bf`(PR #756 = #736) | 委任 provenance を per-kind スロット化 | `amadeus-lib.ts`(+132/-49) |
| `3770c7f51`(PR #780 = #754/#745) | learnings の重複候補 id / マーカー衝突を副作用前に拒否 | `amadeus-learnings.ts`(+107/-6) |
| `971f1229d`(PR #781 = #761) | per-unit stage 学習を親完了ウィンドウでカウント | `amadeus-runtime.ts`(+30/-2) |
| `0dae4e6d6`(PR #778 = #777) | main push の CI を cancel-in-progress 対象外に | `ci.yml` |

**重要**: フォーカス5面のコードに base→observed で周辺変更は入っているが、修理対象の欠陥(#771/#773/#775/#776/#779)自体は**全て現行コードに未修正で残存**している。以下は observed(`b845478bb`)の現行コード直読による file:line 裏取り。

## フォーカス面ごとの所見(file:line)

### #771 — package.ts writeHarness が projectRoot 出力層を clean-sweep しない

- `scripts/package.ts:555-583` `writeHarness()`: clean sweep は treeRoot(`:581` `rmSync(treeRoot, …)`、= `dist/<name>/<harnessDir>`)と memoryRoot(`:578` `rmSync(memoryRoot, …)`、= `dist/<name>/amadeus`)の**2箇所のみ**。`harnessFiles` の `projectRoot: true` 出力(dist ルート直下/未宣言サブディレクトリ)は sweep されない。
- 対照(検出側、#701 で導入済み): `checkHarness()` の whole-tree orphan スキャン `:669-676` が `committedDistRoot` 全域を `walk()` し、`harnessSubtreePrefix`(`:669`)配下を除いた全ファイルを `expectedRoot`(`:664-668`、projectRoot エントリ + onboarding を収録)と照合して `ORPHAN in dist` を鳴らす。
- 結論: **検出はできるが再生成が掃かない**非対称。`--check`(dist:check)は赤くなるが write モード単体では stale を残す。

### #773 — resolveUnderRoot の `${root}/` 直書き(セパレータ移植性)

- `packages/setup/src/ports/fsops.ts:83-89` `resolveUnderRoot()`: `:84` が `!target.startsWith(`${root}/`)`(ハードコード `/`)で path-escape 判定。Windows の `\` 区切りで誤 throw。
- 兄弟の正しい実装: `packages/setup/src/internal/tar-archive-extractor.ts:179` `startsWith(`${extractDir}${sep}`)`(`:3` で `sep` import)、`packages/setup/src/modules/applier.ts:134` `startsWith(`${targetRoot}${sep}`)`(`:1` で `sep` import)。
- 同クラスの追随箇所: `scripts/package.ts:644` `!p.startsWith(join(tmp, m.harnessDir) + "/")`(`+ "/"` 直書き)。同ファイルの正しい対照は `:669` `harnessSubtreePrefix = m.harnessDir + sep`、`:488` `harnessSrcRoot + sep`。

### #775 — 4 hooks の pre-init ガードが per-clone シャード存在で誤判定

- `packages/framework/core/hooks/amadeus-audit-logger.ts:73` `if (!existsSync(auditFile)) process.exit(0)`(`auditFile = auditFilePath(projectDir)`、`:71`)
- `packages/framework/core/hooks/amadeus-sensor-fire.ts:100` `if (!existsSync(auditFilePath(projectDir))) process.exit(0)`
- `packages/framework/core/hooks/amadeus-log-subagent.ts:45` `if (!existsSync(auditFile)) process.exit(0)`
- `packages/framework/core/hooks/amadeus-validate-state.ts:60` `if (existsSync(auditFile)) { …SESSION_COMPACTED emit… }`(存在時のみ emit の裏返しで同根)
- 根拠: `auditFilePath()`(`amadeus-lib.ts:1402-1406`)は `auditShardName()` に cloneId を埋めた **per-clone シャードパス**を返す(`:1408-1414` CLONE_ID_FILE 解説)。したがって `existsSync(auditFilePath())` は「この clone が自シャードを既に書いたか」しか見ず、別 clone のシャードが存在してもワークフローを「未開始」と誤判定する。
- 修正済みの対照: `packages/framework/core/hooks/amadeus-runtime-compile.ts:73-84` は `readAllAuditShards(projectDir, intent, space)`(全シャード glob マージ、`:84`)+ `activeSpace`/`activeIntent` で判定し、コメント `:70-84` が「a bare auditFilePath(projectDir) would resolve a per-process/PID shard the hook never wrote」と同じ罠を明記。

### #776 — sync-statusline の Bun.spawnSync が timeout 無し・status 未検査

- `packages/framework/core/hooks/amadeus-sync-statusline.ts:56-59` `Bun.spawnSync(["bun", toolPath, "set-status", …], { stdout: "ignore", stderr: "ignore" })` — timeout 無し、戻り値(exitCode/error)未検査。
- 規約の対照: `amadeus-stop.ts:777-783`(`timeout: ENGINE_TIMEOUT_MS` + `:783` `if (proc.exitCode !== 0) return null`)、`amadeus-sensor-fire.ts:206-232`(`timeout: SUBPROCESS_TIMEOUT_MS` + timeout/error 分類 + `recordHookDrop`)、`amadeus-runtime-compile.ts`(bounded spawn)。

### #779 — 秒精度 ts × 連結位置 tie-break × ファイル名シャードソートの合成

- 入力1(ミリ秒切り捨て): `amadeus-lib.ts:4026-4028` `isoTimestamp()` = `new Date().toISOString().replace(/\.\d{3}Z$/, "Z")` → 秒精度。
- 入力2(連結位置 tie-break): `amadeus-lib.ts:1562-1564` `scanPresenceLedger()` の `events.sort` tie-break が `a.pos - b.pos`(連結バッファ内位置)。
- 入力3(ファイル名シャードソート): `amadeus-lib.ts:1753-1757` `auditShards()` が `entries.filter(.md).sort()`(辞書順ファイル名 `<host>-<clone>.md`)で連結。
- 消費者: `humanActedSinceGate()`(`:1597-`、`lastHuman > lastResolution`)、`humanActedSinceLastAnswer()`(`:1691-1700`、`lastHumanTurn > lastAnyResolution`)、`amadeus-runtime.ts:172-233` `pairStartedCompleted()`(`:210` で COMPLETED に `index+100000` を付す緩和はあるが秒精度依存は残る)。
- 帰結: HUMAN_TURN と消費リゾルーション(GATE_APPROVED/QUESTION_ANSWERED)が同一秒・別シャードで発生すると、順序がファイル名辞書順で決まり presence 判定が両方向に入れ替わりうる。

## 温存判断(churn 回避)

- `architecture.md`: skeleton(one-core-many-harnesses、staged layout)不変・新規 architecture decision 無し。coverage gate は test-infra 構造変化として `code-structure.md` に記録するに留め、architecture.md は温存。
- `api-documentation.md`/`business-overview.md`/`dependencies.md`/`technology-stack.md`/`component-inventory.md`: base→observed で本 intent 観測面と無関係のため温存。
- **c3-relabel の適用範囲**: 更新対象の `code-quality-assessment.md` 先頭の直近マーカー(mint-presence-vectors)のみ履歴ラベル化。他ファイルに残る過去 intent 由来の未リラベル「本 intent(…)」マーカー(business-overview の source-unreferenced-check/bug-zero-batch、architecture 冒頭 等)は本 bugfix diff-refresh のスコープ外の既知ハウスキーピング債として `code-quality-assessment.md` 冒頭に明示。

## codekb 更新箇所一覧

- `code-quality-assessment.md`: 先頭に「本 intent(bughunt-fix-batch)の観測面」節(#771-O1/#773-O1/#775-O1/#776-O1/#779-O1)を追加。旧先頭 mint-presence 節ヘッダを履歴ラベル化。冒頭ガイド文とハウスキーピング債注記を更新。
- `code-structure.md`: 「Coverage CI 経路」節末に「自前 project ゲートの出荷後状態(intent 260710-bughunt-fix-batch スキャン)」小節を追加(PR #762 で出荷済みの新規ファイル群を記録)。
- `reverse-engineering-timestamp.md`: 「最新: 260710-bughunt-fix-batch」メタデータブロックを追加、旧最新を「前回」へ降格。
