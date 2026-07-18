# Developer コードスキャン結果(scan-notes)

> intent 260717-state-mirror-fixes の reverse-engineering ステージ Developer スキャン(amadeus-developer-agent、2026-07-18)。
> base `6495e03a12d9e7149c2e80b59f171a90607a2d2c`(HEAD 祖先・距離126)→ observed HEAD `591b6a2a222357f41061128f1b5a93c7f7a877be`。
> 測定 ref: observed HEAD(worktree = origin/main 一致)。

## (1) 区間サマリ

- コミット数: 126(`git log 6495e03a..591b6a2a --oneline | wc -l` = 126)
- 実質コード変更テーマ: 新規 CLI(`scripts/amadeus-mirror.ts` +369 #1169 — 本 intent 対象 / `amadeus-norm-metrics.ts` +863 / `amadeus-sensor-answer-evidence.ts` +129 / `metrics-timeseries.ts`・`metrics-retention.ts` / `team-msg.sh`)、新ハーネス配布(OpenCode #1165 + Cursor #1163 → dist 大量追加が区間 diff +409,637 の主因)、engine(standing-delegation grant #1147、E-OC1 fail-closed #1106、state set fail-closed #1057、diary 自動生成 #1088)
- Focus seam の区間内変更: `amadeus-orchestrate.ts` 20行(per-unit advance 本体不変)/ `amadeus-state.ts` 575行(ただし `withAuditLock` 行の追加削除 0 — RMW ロック機構は区間内不変)/ `amadeus-sync-statusline.ts`・`handleSetStatus` 変更なし / `scripts/amadeus-mirror.ts` 区間内新規追加
- 結論(実測): #1170 の欠陥 seam(set-status の無ロック RMW)は base より前から存在(pre-existing)。#1172 は #1169 で新規導入されたコードの欠陥。

## (2) Issue #1170 seam — state 巻き戻り

### state.md へ書き込む hook の全数列挙(11 hook grep)

- **amadeus-sync-statusline.ts** — 唯一の非エンジン state.md 内容ライター: `:69-73` `Bun.spawnSync(["bun", toolPath, "set-status", "--stage", slug, "--project-dir", projectDir])` → `handleSetStatus`
- amadeus-stop.ts — 間接(`:723` engine `next` → withAuditLock 経由・安全)
- 他9 hook(validate-state / sensor-fire / audit-logger / log-subagent / runtime-compile / session-start / session-end / statusline / mint-presence)— state.md 内容書込なし(read・breadcrumb・heartbeat のみ)

### race window の核心(機序確定)

`handleSetStatus`(`packages/framework/core/tools/amadeus-utility.ts:3666-3690`)は withAuditLock を取らない無防備な read-modify-write:

```
3679  let content = readStateFile(projectDir, flags.intent, flags.space);   // ← スナップショット S0
3680-3685  setField × 6(Lifecycle Phase / Current Stage / Active Agent / In Progress / Status / Last Updated)
3686  content = setCheckbox(content, stage, "in-progress");                  // ← [-] へ
3687  writeStateFile(projectDir, content, flags.intent, flags.space);        // ← S0 ベースで全文上書き
```

- `handleSetStatus` 内に `withAuditLock` / `acquireAuditLock` 呼び出しは皆無(関数内 grep 0)
- 対照: エンジン側 `amadeus-state.ts` の全 RMW ハンドラ(`handleSet:500`、`handleAdvance:1223`、`handleFinalize:1454`、`handleCompleteWorkflow:1573` 等)は `withAuditLock` 保護(C2b、`:251-266`)
- `writeStateFile`(`amadeus-lib.ts:3562-3583`)の自己記述コメント(:3578-3581)が lost-update 未保護を明言: atomic rename は torn-write 防止のみ、「Lost-update safety ... is a SEPARATE, larger change tracked as a follow-up」
- race: `B.read(S0) → A(エンジン).lock/write(S1) → B.write(S0')` で A の進行が古いスナップショット由来書込に上書きされる → checkbox `[-]` 巻き戻り+Current Stage 巻き戻り
- audit が健全な理由: `handleSetStatus` は audit を一切 emit しない → 巻き戻りは state.md のみ。**Issue #1170 の症状(audit 健全・state 巻き戻り)と完全一致**
- 発火経路: sync-statusline は TaskUpdate→in_progress ごとに発火(`:44` status ガード、`:50` activeForm `[slug]` 抽出)。per-unit Construction で各 stage の TaskUpdate ごとに set-status 発火 → engine report/advance と競合
- 並行面: set-status は `stateFilePath(projectDir)`(:3667、intent フラグなし)で active intent の state に解決。同一セッション内の複数サブエージェント/並行 builder の TaskUpdate も同一 state.md へ無ロック発火(set-status 同士も相互 lost-update)

### テスト空白(実測)

- `tests/integration/t145-state-lock-concurrency.test.ts` はエンジンハンドラ(`set`/`reject`/`approve`/`skip` 等、:26-27)のみ対象。`set-status` はテスト本体ヒット 0(`grep -rln 'set-status' tests/`)→ **hook 書込経路は concurrency 未カバー**

## (3) Issue #1172 seam — countStageProgress の SKIP 分母

### 現行実装 verbatim(`scripts/amadeus-mirror.ts:83-105`)

```
83  // Count `- [x]` as approved; `[S]` rows leave the denominator (jump-skipped
84  // stages are excluded from progress, mirroring the statusline convention.
87  export function countStageProgress(stateContent: string): { approved: number; total: number; } {
91    const lines = stateContent.split("\n");
92    let approved = 0;
93    let total = 0;
94    let inProgress = false;
95    for (const line of lines) {
96      if (line.startsWith("## ")) inProgress = line.startsWith("## Stage Progress");
97      if (!inProgress) continue;
98      const m = line.match(/^- \[(x|X| |-|\?|R|S)\] /);
99      if (!m) continue;
100     if (m[1] === "S") continue;      // ← [S] のみ分母除外
101     total++;
102     if (m[1].toLowerCase() === "x") approved++;
103   }
104   return { approved, total };
105 }
```

欠陥: 分母除外の唯一条件が checkbox `[S]`。scope-SKIP は `[ ]`(空)+ 行末 `— SKIP` サフィックスで表現されるため `total++` に混入。

### format-currency-grep 実測(現行様式 verbatim)

260717-mirror-issue-tool(完了 intent)の実データ: scope-SKIP は全て `- [ ] <stage> — SKIP` 形(`- [ ] market-research — SKIP` 等)。EXECUTE 18 / SKIP 14 / 全32行 → countStageProgress は 18/32 を返す(期待 18/18)— 症状再現確定。

全 state ファイル横断のマーカー語彙集計(`grep -rhoE '^- \[.\] [a-z-]+ — (EXECUTE|SKIP)'`):

```
   70  - [ ] X — EXECUTE
  717  - [ ] X — SKIP        ← scope-SKIP は全て空 checkbox
   14  - [-] X — EXECUTE
    1  - [?] X — EXECUTE
  414  - [x] X — EXECUTE
```

`grep -rn '^- \[S\]' amadeus/spaces/default/intents/*/amadeus-state.md | wc -l` = **0** — `[S]` checkbox は実コーパスに 1件も存在しない。`[S]` は `--stage/--phase` jump 時の runtime marker(テンプレコメント+`t145:245` engine `handleSkip` 出力)で、scope 合成時の SKIP は state-init が `[ ] — SKIP` で書く。別語彙。

### 直交2フィールド構造(テンプレート側)

- checkbox setter: `amadeus-lib.ts:setCheckbox:3785`(CHECKBOX_MAP、`[ xSR?-]`)
- suffix setter: `setStageSuffix:3805`(:3799-3803 コメント「setCheckbox owns the marker (run-state); this owns the suffix (the plan)」)
- → checkbox(実行状態)と suffix(計画)は直交。countStageProgress が checkbox だけ見て計画を無視したのが根本原因

### 修正の意味論(Architect 向けメモ)

分母 = 「EXECUTE 計画ステージ」。信頼できる信号は行末サフィックス `— EXECUTE`/`— SKIP`(=計画)。案: total = `— EXECUTE` サフィックス行数、approved = そのうち `[x]`。jump-skip(`[S]`)も分母から外すなら `[S]` 除外は残す — 両条件併用が最も安全。

### テスト空白(偽 green 実測)

`tests/unit/t232-amadeus-mirror.test.ts:72` fixture が実在しない `[S]` 様式(`- [S] market-research — SKIP`)を捏造し :82 で green。実様式 `[ ] X — SKIP` を fixture に含めていれば赤くなった(format-currency-grep-for-parser-intents 違反の典型)。修正 PR は実 state 由来 fixture を追加すべき。

## (4) codekb body 更新要否の判断材料

- technology-stack / dependencies: 変化なし(Bun/TS、新規 runtime dependency なし — gh は scripts 限定 cid:gh-scripts-boundary)→ body 更新不要の材料
- code-structure / architecture: 新ハーネス配布ツリー・新 CLI は追加だが、core 中立層/表層境界・state ロック機構は不変 → bugfix intent の差分リフレッシュとしては body 大幅改訂不要(Architect 最終判断)
- code-quality-assessment: 本スキャンで確定した2欠陥(無ロック set-status RMW / countStageProgress SKIP 語彙取りこぼし)+2テスト空白(t232 偽 green fixture / set-status concurrency 未カバー)は追記価値あり

## (5) テスト・品質機構の関連状況

| 機構 | カバー | 空白 |
|---|---|---|
| t145-state-lock-concurrency | エンジンハンドラの C2b lost-update(並列 spawn) | set-status(hook 経路)対象外 — #1170 の実欠陥経路未カバー |
| t224-state-set-failclosed | `amadeus-state set` の fail-closed | concurrency 非対象 |
| t232-amadeus-mirror(unit) | countStageProgress/render/body | fixture が実在しない `[S]` 様式 → 実様式 `[ ] — SKIP` 未カバーで偽 green |
| t232 integration | mirror CLI create/sync/close | 実様式は同 fixture 系で未検証 |

修正 intent が追加すべきリグレッション(bugfix posture):
1. #1172: 実 state 由来(`[ ] <stage> — SKIP`)fixture の countStageProgress テスト(18/18 assert)
2. #1170: set-status の withAuditLock 参加(またはエンジンロックドメインへの統合)+ set-status ∥ advance の並列 spawn テスト(t145 様式拡張)

## 関連ファイル

- `scripts/amadeus-mirror.ts`(countStageProgress :87-105)
- `packages/framework/core/tools/amadeus-utility.ts`(handleSetStatus :3666-3690)
- `packages/framework/core/tools/amadeus-lib.ts`(writeStateFile :3562-3583、setCheckbox :3785、setStageSuffix :3805)
- `packages/framework/core/tools/amadeus-state.ts`(withAuditLock RMW handlers :493/:1207/:1445/:1550、emitAudit :251-266)
- `.claude/hooks/amadeus-sync-statusline.ts`(set-status spawn :69-73)
- `tests/unit/t232-amadeus-mirror.test.ts`(:72 fixture、:82 assert)、`tests/integration/t145-state-lock-concurrency.test.ts`
