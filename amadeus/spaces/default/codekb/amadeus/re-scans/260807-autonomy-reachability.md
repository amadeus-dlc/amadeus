# re-scan record — 260807-autonomy-reachability

本ファイルは intent `260807-autonomy-reachability`（scope `self-feature`、Brownfield、Depth Standard、Test Strategy Comprehensive）の Reverse Engineering における**全数列挙の正本**である。共有9成果物の現在断面は本ファイルを要約したものであり、件数・file:line の疑義は本ファイルを参照して解決する。

対象は [Issue #2378](https://github.com/amadeus-dlc/amadeus/issues/2378) — **Intent autonomy（`--autonomy` / semi モード）の到達性**。以下、**事実**（observed 断面の実測・実読に接地）と**仮説**（H1〜H3、§ 12）を明示的に分離する。

## 実行メタデータ

- Date: `2026-08-07`
- Base commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（`cid:reverse-engineering:rescan-base-ancestry` に従い、HEAD 祖先かつ距離最小の observed を選定。`git merge-base --is-ancestor b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d 4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0` = exit 0 を実測。直前の現在断面 `260807-failclosed-recovery-path` の observed）
- Observed commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（= `origin/main` tip = 本 worktree のベース。`git rev-parse HEAD` で一致を実測。`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録）
- 区間規模: **12 commits / 108 files changed（+5711 / −200）**（`git log --oneline base..observed | wc -l` = 12、`git diff --name-only` = 108、`git diff --shortstat` = 実出力からの転記）
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Focus: **Intent autonomy の到達性** — 宣言できない（`--autonomy` が birth 時に使えない）／宣言しても効かない（state 投影の非対称）／宣言が誰にも見えない（導線ゼロ）の3層
- Scan mode: **DIFFERENTIAL refresh + xrev mode**（下記 § scan mode の位置づけ）
- Verification: 本 RE では新規テストを実行していない。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。接地手段は observed 断面での `git log` / `git diff` / `grep` の実測と患部の verbatim 直読、および本 intent 実行中に発生した**ライブ実測4件**（§ 11）

### scan mode の位置づけ

#2378 は `cid:requirements-analysis:issue-cross-review` が要求する「起票者以外2名の独立エビデンス付き verdict」が**成立している**（クロスレビュー run `xrev-2378-20260807T110535Z`）。したがって `cid:reverse-engineering:c1-xrev-single-issue`（単発 Issue への xrev scan mode の適用）が発動する。

**行番号再解決は不要である。** 同 cid が `cid:reverse-engineering:c1-xrev-scan-mode` から継承する免除条件は「当該引用が observed と一致する SHA で検証済みであること」であり、xrev run の検証 SHA は `4a3da7d62` で observed と**完全一致**する。加えて、差分区間 `b8e3e664f..4a3da7d62` が本 intent の patch surface に一切触れていないことを独立に実測した（§ 1）。すなわち免除条件と区間実測の**両方**が成立する。

xrev verdict のうち **2件は本 scan で訂正した**（`AUTHORITY_BOUNDARY` の実在、advisory の occurrence kind）。詳細は finding 3 と finding 10。

## 1. 差分リフレッシュの結論 — 事実

`b8e3e664f..4a3da7d62` の12コミットのうち、本 intent の patch surface に触れるものは **ゼロ件**である。

| ファイル | 区間内の hunk | 本 intent の関心面 | 交差 |
| --- | --- | --- | --- |
| `amadeus-orchestrate.ts` | `@@ -3711` / `@@ -3811` / `@@ -3888`（degrade unit resolution、#2393） | C13 セクション `:1198-1360`、Branch 4ab `:2943-2958` | **なし** |
| `amadeus-advisory-choice.ts` | `@@ -1455,0 +1456,120`（recovery verb、#2392） | advisory→question ルーティング `:520-538` | **なし** |
| `amadeus-intent-autonomy*.ts` | （区間内で一切変更なし） | 全面 | **なし** |

## 2. `--autonomy` が birth 時に使えない — 事実（finding 1）

ガードは `amadeus-orchestrate.ts:1290-1294` の judgment 0 である（verbatim）:

```
  if (stateContent === null) {
    return {
      kind: "error",
      message: "--autonomy needs an active intent. Start the workflow first, then declare the mode with ...",
```

`stateContent` は `amadeus-orchestrate.ts:2819` の `loadStateFileIfPresent(pd)` 由来で、intent 未 birth なら `null` を返す。そして Branch 4ab（`:2952-2958`）は **birth 分岐より手前**に置かれている。配置根拠はコメント `:2943-2946` に明記されている — 「Placed after the scope checks ... and before birth, so a declaration never rides along with a routing move」。

したがって birth 記述と `--autonomy` を同時に渡すと、**birth が起きる前に judgment 0 が発火して error directive で打ち切られる**。宣言してから birth する2手順を踏まない限り、`--autonomy` は宣言時点で必ず失敗する。

**是正が着地する seam（2案）**:

- (a) Branch 4ab を birth の**後段**へ移し、`stateContent === null` かつ birth 分岐が成立する場合は宣言を birth directive に搬送して conductor が birth 直後に適用する。
- (b) judgment 0 を「birth 予定があるか」で分岐させ、birth 直後の再 `next` で宣言を消化する latch を持たせる。

**制約（重要）**: 現行挙動は**テスト2箇所で逆向きにピン留め済み**である — `tests/integration/t450-autonomy-flag-branch.test.ts:83`（`"without a state file the flag is refused, not silently dropped"`）と `tests/unit/t450-autonomy-flag-apply.test.ts:95`（`"H0: no active intent is loud"`）。よって birth-time 宣言は実装段の逸脱ではなく、**要件段での仕様裁定とテスト契約の明示改訂が先行する**（`cid:reverse-engineering:c1-pinned-behavior-ruling`）。

## 3. `SCOPE_OUT` / `MODE_REQUIRES_HUMAN` の消費点がゼロ — 事実（finding 2）

`InteractionKind` は4値（`amadeus-intent-autonomy.ts:14`）。`SEMI_ROUTINE_INTERACTIONS`（`:581`）は `["stage-gate", "question"]`。`authorizeInteraction`（`:719-756`）は4つの拒否経路すべてで `reason: "SCOPE_OUT"` か `"MODE_REQUIRES_HUMAN"` を返す（`:721` / `:724` / `:730` / `:732` / `:747`）。

**この reason の消費点を全域 grep した結果、production コードは1箇所も存在しない。**

- `amadeus-intent-autonomy-production.ts:241` が `{ authorized: false, reason }` へ写像し、`:229` で `ProductionAutonomyContext.authorizationReason` に載せる。
- しかし `authorizationReason` の grep 結果は**定義3箇所とテスト1箇所のみ**: `amadeus-intent-autonomy-production.ts:89`（型宣言）/ 同 `:219`（`"intent-autonomy-unavailable"` 固定値）/ 同 `:229`（代入）/ `tests/integration/t435-intent-autonomy-production.integration.test.ts:155`。
- audit 出力なし、directive 投影なし、CLI 表示なし、ログなし。

`SCOPE_OUT` / `MODE_REQUIRES_HUMAN` 文字列自体の非定義側 grep も **tests 4ファイル + docs 2ファイルのみ**で production 消費ゼロである。

これは `phases/construction.md` の「どのコードも消費しないフィールドを持たせない」に該当する既存構造であり、**完了条件2（なぜ止まったかの可視化）の最短 seam は `amadeus-intent-autonomy-production.ts:227-231` — `autoApprove === false` のときに `authorizationReason` を audit イベントとして emit すること**である。呼び出し元 `amadeus-state.ts:2934-2942` は `context.autoApprove` の真偽しか見ておらず、偽のときは**無言で** presence guard へ落ちる。

## 4. `AUTHORITY_BOUNDARY` は存在しない — 事実（finding 3、xrev verdict の訂正）

xrev reviewer 2 が言及した第3の理由コード `AUTHORITY_BOUNDARY` は production に存在しない（repo 全域 grep = intent record 4件のみ）。

- `260805-semi-redefine-autonomy-f/inception/application-design/component-methods.md:111` が「生成点も消費点も無いため削除した」と明記。
- 同 `.../functional-design/business-rules.md:17` の R5 が2値固定を規則化。

**この点は xrev verdict の訂正対象である。**

## 5. 1 human turn = 1 レビューのラッチ — 事実（finding 4）

該当は `amadeus-autonomy-review-production.ts:348-377` の `commitDecisionReviewLocked`（verbatim）:

```
366:  const latestPriorReview = readStoredReviews(input.projectDir, target)
367:    .filter((event) => event.sourceIntentUuid === source.intentUuid)
368:    .at(-1);
369:  const consumedTurnIndex = latestPriorReview === undefined
370:    ? -1
371:    : turnKeys.lastIndexOf(latestPriorReview.sourceHumanTurnEventId);
372:  if (latestPriorReview !== undefined && consumedTurnIndex < 0) {
373:    return { ok: false, error: "PROVENANCE_REQUIRED" };
374:  }
375:  const latestTurnIndex = turns.length - 1;
376:  if (latestTurnIndex <= consumedTurnIndex) return { ok: false, error: "PROVENANCE_REQUIRED" };
```

turn の identity は `${timestamp}#${ordinal}`（`:353-365`）。ラッチは `latestPriorReview.sourceHumanTurnEventId`（直前レビューが消費した turn）で、判定は「**最新** turn が消費済み turn より後か」。よって1つの HUMAN_TURN で1件レビューすると、2件目は `latestTurnIndex === consumedTurnIndex` となり `:376` で `PROVENANCE_REQUIRED` を返す。ライブ実測（§ 11 (d)）と機序が完全に一致する。

**batch review 経路は存在しない。** `ProductionDecisionReviewInput` は単数の `decisionId: string`（`:338`）のみを取り、`amadeus-bolt.ts:1027-1048` の `handleReviewAutoDecision` も `--decision <id>` 単数。`amadeus-autonomy-review-production.ts` 全域に `batch` トークンは0件である。

**是正 seam**: `:376` の単調性判定を「1 turn = 1 レビュー」から「1 turn = 1 レビュー**コマンド**（複数 decisionId を運べる）」へ変える方向。ただし `:405` の `commandOccurrenceId` と `:392-397` の `reviewCommandContentDigest`（digest は単一 decisionId を含む）が同時に契約変更対象になる。

## 6. state 投影の非対称 — 事実（finding 5）、本 intent で最も影響範囲が広い

**`Intent Autonomy Mode` を state へ書くコードは repo 全体で1箇所だけ** — `amadeus-bolt.ts:1075`:

```
1074:      const schedulingMode = flags.mode === "full" ? "autonomous" : "gated";
1075:      let updated = setOrInsertField(content, "## Current Status", "Intent Autonomy Mode", flags.mode);
1076-1081:  … "Intent Grant" … setFieldStrict(updated, "Construction Autonomy Mode", schedulingMode) … writeStateFile
```

この3フィールド書き込みは `handleSetAutonomy` の**内部**にあり、`applyProductionAutonomyMode`（`amadeus-intent-autonomy-production.ts:436-`）の**外側**にある。C13 は `applyProductionAutonomyMode` を直接呼ぶ（`amadeus-orchestrate.ts:1354`）ため、**audit + projection は commit されるが state 3フィールドは一切更新されない**。ライブ実測（§ 11 (b)）はこれで説明される。

これが単なる表示ズレでない理由は、**state フィールドを読む側が6系統ある**からである:

| 読み手 | file:line | C13 経由宣言時の帰結 |
| --- | --- | --- |
| statusline 表示 | `amadeus-lib.ts:4942` `autonomySegment` | セグメント消失 |
| engine の swarm スケジューリング | `amadeus-orchestrate.ts:1894-1899` `readAutonomyMode` | 宣言が見えない |
| Stop hook 継続キャップ | `amadeus-stop.ts:150-154` `stopContinuationDefaultCap` | 8→2 に退行 |
| Stop hook budget mode | `amadeus-stop.ts:160-162` `stopBudgetMode` | `interactive` に退行 |
| **Stop hook の question carve-out** | `amadeus-stop.ts:196-198`（`mode !== "semi"` → `return false`） | **carve-out が開かない** |
| 回答チェックポイントの guard 免除 | `amadeus-log.ts:180` `isAutonomousMode`（= `Construction Autonomy Mode`） | 免除されない |

`--status` 側は projection を読む（`amadeus-utility.ts:381` `readStatusAutonomy` → `projectIntentAutonomyStatus`）ため `semi` を表示する。`--status` と `amadeus-state.md` が食い違うのは、この二重読み手構造そのものである。

**是正 seam**: state 3フィールドの書き込みを `applyProductionAutonomyMode` 側へ引き上げて canonical 1定義化し、`amadeus-bolt.ts:1075-1081` はその呼び出しに縮約する。これは `cid:code-generation:c1-drift-canonical-renderer` と同型の write⇔read 対称性是正である。

## 7. `--autonomy semi` は Stop hook の question carve-out を開けない — 事実（finding 6）

`packages/framework/core/hooks/amadeus-stop.ts:192-205`（verbatim）:

```
192: export function isQuestionCarveoutIntent(
193:   stateContent: string,
194:   resolvedProjectDir: string = projectDir,
195: ): boolean {
196:   const mode = intentAutonomyMode(stateContent);
197:   if (mode === "full") return isFullyAutonomousIntent(stateContent, resolvedProjectDir);
198:   if (mode !== "semi") return false;
199:   try {
200:     const projection = readProductionAutonomyProjection(resolvedProjectDir);
201:     return projection?.mode === "semi" && projection.modeProvenance.kind === "human-command";
202:   } catch {
203:     return false;
204:   }
205: }
```

判断は2段で、コメント `:189-191` が「state first, so a mode outside {semi, full} answers without reading the projection at all」と明記している。**この state-first 構造が finding 5 の帰結を決定的にする** — C13 経由の宣言は state を更新しないので `:196` が `null` を返し、`:198` で即 `false`。projection は読まれない。

すなわち **`--autonomy semi` は、それが開くために作られた当の carve-out を構造的に開けない。**

## 8. 監査イベントの形状 — 事実（finding 7）、完了条件4の述語に直結

| イベント | 状態 | 根拠 |
| --- | --- | --- |
| `INTENT_AUTONOMY_TRANSACTION_COMMITTED` | **現行の唯一の発行経路** | `amadeus-intent-autonomy-replay.ts:24` が正準定数、`:153` で replay 対象、`amadeus-bolt.ts:1085` が発行報告、`amadeus-audit.ts:95` / `:241` に登録、`otel/event-registry.ts:220` に mapping |
| `AUTONOMY_MODE_SET` | **legacy / 読み取り専用** | `amadeus-bolt.ts:7` の逐語コメント「AUTONOMY_MODE_SET remains replay/doctor-only legacy data.」、`amadeus-intent-autonomy-production.ts:116` が `legacyModeHistory` 判定に**読むだけ**。`amadeus-audit.ts:163` / `:278` と `otel/event-registry.ts:707` に語彙は残るが、**発行点は production に存在しない** |

**したがって完了条件4の回帰計測述語は `INTENT_AUTONOMY_TRANSACTION_COMMITTED` を使うべきで、Issue 本文および xrev で使われた `amadeus.autonomy.mode.set` は legacy 語彙である。** xrev reviewer 2 の指摘（「`mode.set` と `grant.issued` はゼロだが `intent_autonomy.transaction.committed` は4件実在」）がこの機序で裏付けられる。そして C1 の母集団選定基準が `amadeus.autonomy.mode.set` の存在であったこと（C1b: `260805-pr-convergence-plugin` が脱落）は**legacy 語彙で母集団を切った結果**であり、ベースライン自体の再定義が必要である。C2（231件 / 63 intents）は xrev 2名が再現不能と判定済み。

## 9. 導線（conduit）の実測 — 事実（finding 8・finding 9）

`--autonomy` の repo 全域 grep（実装ファイル `amadeus-orchestrate.ts` を除く）は **1件のみ**:

- `packages/framework/core/amadeus-common/protocols/stage-protocol.md:125` — 「The `--autonomy none|semi|full` launch flag is an additional recording means: it is accepted only as the first declaration (while `modeProvenance.kind === "system-default"`); ... `amadeus-bolt set-autonomy` remains the canonical recording path.」

0件の面（すべて実測）:

| 面 | `--autonomy` | `decide-question` |
| --- | --- | --- |
| `harness/claude/skills/amadeus/SKILL.md` | 0 | 0 |
| `harness/codex/skills/amadeus/SKILL.md` | 0 | 0 |
| `harness/kimi/skills/amadeus/SKILL.md` | 0 | 0 |
| `harness/kiro/skills/amadeus/SKILL.md` | 0 | 0 |
| `harness/kiro-ide/skills/amadeus/SKILL.md` | 0 | 0 |
| `harness/pi/skills/amadeus/SKILL.md` | 0 | 0 |
| `harness/cursor/commands/amadeus.md` | 0 | 0 |
| `harness/opencode/commands/amadeus.md` | 0 | 0 |
| `amadeus-utility.ts`（help text） | 0 | — |
| `README.md` | 0 | — |
| `docs/reference/24-intent-autonomy.md` / `.ja.md` | 0 | `:82`, `:86`（モード非限定） |

**cursor と opencode は `skills/amadeus/SKILL.md` を持たず `commands/amadeus.md` が対応面である**（「8 harnesses × SKILL.md」は正確には SKILL.md 6面 + commands 2面）。したがって是正面は **8面**である。

対照として `--new-scope` は `amadeus-utility.ts:248` の help text と `claude SKILL.md:155` の両方に導線を持つ。**`--autonomy` だけが engine 実装のみで全導線を欠く**という非対称が確定する。

### semi の decide-question 手順が存在しない

`stage-protocol.md:131` は semi について「resolves `question` occurrences unattended through the same five-rung ladder as `full`」と**契約を宣言**している。しかし直後の**操作手順段落 `:135` は逐語で「For a question under `full`, ...」で始まり**、semi 版の手順段落は存在しない。`decide-question` の操作手順が書かれているのは `stage-protocol.md:135`（full 限定）と `docs/reference/24-intent-autonomy.md:82-86` のみで、**conductor が実際に読む SKILL.md / commands 8面すべてで0件**である。

これは仮説 H3 の構造的裏付けである — conductor が `decide-question` を通さないのは規律違反ではなく、**手順が conductor の読む面に書かれていない**ためである。

## 10. テスト被覆 — 事実

| test | 何をピンするか |
| --- | --- |
| `tests/unit/t449-autonomy-flag-parse.test.ts:20-` | `takeAutonomyFlag` の argv 消費のみ（値の搬送、値なし検出、flag 形トークンの消費、重複時は最後が勝つ、不在時は両フィールド未設定）。範囲検査はしないことを `:33` が明示 |
| `tests/unit/t450-autonomy-flag-apply.test.ts:93-` | judgment ladder H0〜H9 の純関数判定（ports 注入）。`:95` が `stateContent === null` の loud を、`:225` が read-only でないことをピン |
| `tests/integration/t450-autonomy-flag-branch.test.ts:82-` | `handleNext` 上での分岐の実 CLI 挙動。`:83` が state file 不在時の refusal、`:119` が provenance 要求、`:137` が freeform text の生存をピン |
| `tests/unit/t451-semi-authority.test.ts:129/186/212` | `SemiAuthority` の smart constructor、scope/effect 認可、`decisionAuthorityOf` の投影 |
| `tests/unit/t452-authorize-interaction-semi.test.ts:133/206/292` | `SemiAuthority` の first gate 決定表、ladder 入口 guard、`semiPolicies` の一方向不変条件。**reason 値は `:138-191` で戻り値として assert されるのみ**（audit 観測ではない） |
| `tests/integration/t453-semi-ladder-runtime.integration.test.ts:139` | semi の question が実 runtime でラダーを通ること、`:226` で replay 投影を確認 |

**未ピンであることを確認した3点**:

- **(a) docs / SKILL 導線 parity**: `--autonomy` を含む grep が `tests/` 配下に0件。CLI flag と help / SKILL の parity を検査するテスト自体が repo に存在しない（`--new-scope` の parity も `t198-compose-surfaces.test.ts` / `t189-compose-dispatch.sdk.test.ts` は挙動テストであり導線 parity ではない）。
- **(b) birth-time 宣言**: 未ピンどころか**逆向きにピンされている**（t450-branch:83、t450-apply:95）。改訂が要る。
- **(c) SCOPE_OUT の可観測性**: 戻り値の assert のみ。audit への出現を検査するテストは0件。

## 11. ライブ実測（本セッション内、2026-08-07）

以下4件は本 intent（`260807-autonomy-reachability`）の実行そのものから得た**ライブ再現の一次証拠**である。上記の静的機序（§ 2 / § 6 / § 8 / § 5）と1:1で対応する。

| # | 実測事象 | 対応 finding | 対応する静的機序 |
| --- | --- | --- | --- |
| (a) | **birth と `--autonomy` の同時宣言が拒否された** | finding 1 | `amadeus-orchestrate.ts:1290-1294`（judgment 0、`stateContent === null`）+ `:2952-2958`（Branch 4ab が birth 分岐の手前） |
| (b) | **`--autonomy semi` 宣言後も `amadeus-state.md` の `Intent Autonomy Mode` が `none` のまま残存**（`--status` は `semi` を表示） | finding 5 | state 書き込みが `amadeus-bolt.ts:1075-1081` にあり、C13 が呼ぶ `applyProductionAutonomyMode`（`amadeus-orchestrate.ts:1354`）の外側 |
| (c) | **発行された audit イベントは `INTENT_AUTONOMY_TRANSACTION_COMMITTED` であり `AUTONOMY_MODE_SET` ではなかった** | finding 7 | `amadeus-intent-autonomy-replay.ts:24` が正準定数。`AUTONOMY_MODE_SET` は `amadeus-bolt.ts:7` 逐語で legacy、発行点ゼロ |
| (d) | **`review-auto-decision` で3件キューの2件目が `PROVENANCE_REQUIRED` で失敗**（1 human turn = 1件のラッチ） | finding 4 | `amadeus-autonomy-review-production.ts:376` `if (latestTurnIndex <= consumedTurnIndex) return { ok: false, error: "PROVENANCE_REQUIRED" };` |

**(b) は仮説 H2 の一部を実測へ格上げする**（state が `none` に残ることは確定した）。ただし H2 が主張する「Stop hook のキャップが 8→2 に落ち carve-out も開かない」という**実行体験の退行そのもの**は、実行ログを取得していないため未実測のまま残る（§ 12 H2）。

## 12. 完了条件別の seam 対応表

| 完了条件 | 最有力 seam | 種別 |
| --- | --- | --- |
| **1. birth 前の grant 有効化** | `amadeus-orchestrate.ts:1290-1294`（judgment 0）+ `:2952-2958`（Branch 4ab 配置）。宣言を birth directive へ搬送するか、Branch を birth 後段へ移す | 仕様裁定 + テスト契約改訂（t450 × 2） |
| **2. SCOPE_OUT の可視化 / preview への非自動裁定 kind 列挙** | (a) `amadeus-intent-autonomy-production.ts:227-231` — `autoApprove === false` 時に `authorizationReason` を audit emit（現在ゼロ消費）。(b) `previewProductionAutonomyGrant`（`:338-361`）の preview に「非該当 kind」を追加。**ただし `full` の `allowedInteractionKinds` は `ALL_INTERACTIONS`（`:284`）で4値全許可**のため、full で SCOPE_OUT が出るのは `intentUuid` 不一致か `workflowExecutionState !== "running"`（`amadeus-intent-autonomy.ts:720-722`）のみ。列挙が意味を持つのは semi（`:307` = `SEMI_ROUTINE_INTERACTIONS`）側 | 実装（消費点の追加） |
| **3. engine 迂回質問の観測** | `amadeus-log.ts:180-187` の `QUESTION_ANSWERED` 発行点が唯一の全質問通過点。`isAutonomousMode`（legacy `Construction Autonomy Mode` を読む）で免除される semi / full 経路と、`decide-question` 経由かどうかを区別するフィールドが現状ない | 実装（イベント属性の追加 or sensor） |
| **4. 回帰の計測** | 述語を `INTENT_AUTONOMY_TRANSACTION_COMMITTED`（`amadeus-intent-autonomy-replay.ts:24`）に固定。`AUTONOMY_MODE_SET` は legacy（`amadeus-bolt.ts:7` 逐語）。**ベースライン C2（231件 / 63 intents）は xrev 2名が再現不能と判定**しており C1 / C3 への差し替えが必要 | 計測設計 |
| **5. SKILL 導線（xrev 追加）** | `harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md` + `harness/{cursor,opencode}/commands/amadeus.md` の **8面**。あわせて `claude SKILL.md:248`「AUTONOMY IS NEVER INFERRED」との整合改訂、および `stage-protocol.md:135` の semi 版 `decide-question` 手順の新設 | docs / 正本同期 |
| **6. advisory 起動の autonomy 裁定（xrev 追加）** | **すでに実装済み** — `amadeus-advisory-choice.ts:521` が `kind: "question"`。残るのは `plugins/*/stages/*.md:27` の docs drift | docs のみ（要件の縮小） |

## 13. plugin stage doc の drift — 事実（finding 10、xrev G2 の訂正）

- `plugins/formal-model-check/stages/formal-model-check.md:27` 逐語: ``never runs on `push` / `pull_request`. Amadeus never runs it automatically: the``（続く `:28` で「engine only emits a spec-hash advisory nudge when the watched spec changed」）
- `plugins/pr-convergence/stages/pr-convergence.md:27` 逐語: ``scope's workflow and Amadeus never runs it automatically.``

これに対し `amadeus-advisory-choice.ts:521` は advisory occurrence を **`kind: "question"`** として構成し、`:576-586` の `translateAdvisoryDecision` が `decided` かつ `selectedOptionId === "run-now"` のとき `{ kind: "resolved", choice: "run-now" }` を返す。`question` は `SEMI_ROUTINE_INTERACTIONS`（`amadeus-intent-autonomy.ts:581`）にも `ALL_INTERACTIONS`（`amadeus-intent-autonomy-production.ts:284`）にも含まれるため、**semi / full のいずれでも advisory は無人で `run-now` に解決されうる**。

**docs が言うべきこと**: 「stock scope のワークフローには加わらない（`scopes: []`）」は正しいまま維持し、「Amadeus never runs it automatically」は **「autonomy `none` では人間が起動判断を行う。`semi` / `full` では spec-hash advisory が `question` occurrence としてラダーに掛かり、`run-now` が選ばれれば無人で起動しうる（`amadeus-advisory-choice.ts:521`, `:576-586`）」** へ改める必要がある。

**xrev G2 の主張は訂正を要する。** reviewer は「advisory 起点の起動判断は `InteractionKind` 4値のどれにも該当しない → 構造的に人間へ落ちる」としたが、実コードは `kind: "question"` に**マップ済み**（`:521`）である。したがって #2378 の追加完了条件6（「occurrence kind の追加、または advisory を `question` occurrence として engine 経由で解決する形」）の**後者はすでに実装されており**、残るギャップは新 kind の要否ではなく **docs の drift** である。要件を縮小できる。

## 14. 仮説（事実と分離）

以下は**仮説**であり、上記 § 1〜§ 13 の事実とは区別する。

- **H1**: `--autonomy` が実運用でゼロ件なのは、finding 8（全導線ゼロ）と finding 1（birth 時に使えない）の**積**である。仮に SKILL.md へ導線を書いても、conductor が最も自然に使う `/amadeus --autonomy semi "<説明>"` の形が finding 1 で失敗するため、導線追加**単独**では発動率が上がらない可能性が高い。→ 完了条件5と1は依存関係にあり、5だけ先行着地させると「書いてあるのに動かない」導線を作る。**要件段で順序を固定すべき**。
- **H2**: finding 5 の state 非対称により、`--autonomy` 経由で declare した intent では Stop hook のキャップが 8→2 に落ち carve-out も開かないため、`amadeus-bolt set-autonomy` 経由より**実行体験が悪くなる**。仮に finding 1 だけ直して finding 5 を残すと、この退行が新経路の既定になる。**部分的にライブ実測へ格上げ済み**（§ 11 (b) が state 残存を確定）だが、キャップ退行そのものは実行ログを取っていないため未実測。
- **H3**: 完了条件3の「engine 迂回質問」は、`decide-question` の手順が SKILL.md / commands 8面すべてに無い（finding 9）ことが直接原因であり、検出イベントを足す前に手順を書くほうが効果が大きい。ただし観測なしでは効果測定ができないため、両方が要る。

## 15. Findings（採番）

1. **`--autonomy` は birth と同時に使えない。** ガードは `amadeus-orchestrate.ts:1290-1294`（judgment 0、`stateContent === null`）、原因は Branch 4ab（`:2952-2958`）が birth 分岐の**手前**に置かれていること。現行挙動は `tests/integration/t450-autonomy-flag-branch.test.ts:83` と `tests/unit/t450-autonomy-flag-apply.test.ts:95` で**逆向きにピン留め済み**のため、要件段の仕様裁定とテスト契約の明示改訂が先行する。**ライブ実測あり**（§ 11 (a)）。
2. **`SCOPE_OUT` / `MODE_REQUIRES_HUMAN` は production 消費点ゼロ。** `amadeus-intent-autonomy.ts:721/724/730/732/747` が返し、`amadeus-intent-autonomy-production.ts:241` → `:229` が `authorizationReason` に載せるが、grep 上の消費は型宣言（`:89`）・固定値（`:219`）・代入（`:229`）・テスト1件のみ。audit 出力なし。完了条件2の最短 seam は `:227-231`。
3. **`AUTHORITY_BOUNDARY` は存在しない（xrev verdict の訂正）。** repo 全域 grep で production ヒット0件。`260805-semi-redefine-autonomy-f/.../component-methods.md:111` が削除理由を、同 `business-rules.md:17` の R5 が2値固定を明記。
4. **1 human turn = 1 レビューのラッチは `amadeus-autonomy-review-production.ts:369-376`。** `latestTurnIndex <= consumedTurnIndex` で `PROVENANCE_REQUIRED`。**batch 経路は存在しない**（`decisionId` は単数 `:338`、`batch` トークン0件）。契約変更は `:392-397` の digest と `:405` の `commandOccurrenceId` に波及する。**ライブ実測あり**（§ 11 (d)）。
5. **state 投影の非対称は `amadeus-bolt.ts:1075-1081` が `applyProductionAutonomyMode` の外側にあること。** C13 は `amadeus-orchestrate.ts:1354` で production 関数を直接呼ぶため state 3フィールドが更新されない。読み手は6系統（`amadeus-lib.ts:4942` / `amadeus-orchestrate.ts:1894-1899` / `amadeus-stop.ts:150,160,196-198` / `amadeus-log.ts:180`）。**ライブ実測あり**（§ 11 (b)）。
6. **`--autonomy semi` は Stop hook の question carve-out を構造的に開けない。** `amadeus-stop.ts:196-198` が state を先に読み、`semi` でなければ projection を読まずに `false`。finding 5 の直接帰結であり、`--autonomy` が解決するはずだった問題そのものを再生産する。
7. **完了条件4の述語は `INTENT_AUTONOMY_TRANSACTION_COMMITTED`。** `AUTONOMY_MODE_SET` は legacy で発行点ゼロ（`amadeus-bolt.ts:7` 逐語、`amadeus-intent-autonomy-production.ts:116` は読むだけ）。Issue 本文と xrev の母集団選定が legacy 語彙に依存しており（C1b の脱落例が実証）、ベースライン自体の再定義が要る。C2（231件 / 63 intents）は xrev 2名が再現不能と判定済み。**ライブ実測あり**（§ 11 (c)）。
8. **`--autonomy` の導線は repo 全域で `stage-protocol.md:125` の1件のみ。** conductor が読む面（SKILL.md 6 + commands 2 = **8面**）、help text、README、docs/reference のすべてで0件。対照 `--new-scope` は help（`amadeus-utility.ts:248`）と SKILL（`claude:155`）の両方を持つ。
9. **semi の `decide-question` 操作手順が存在しない。** `stage-protocol.md:131` は semi の契約を宣言するが、操作段落 `:135` は逐語で「For a question under `full`」に限定。`decide-question` は SKILL.md / commands 8面すべてで0件。仮説 H3 の構造的原因。
10. **plugin docs は autonomy 実装より古い。** `formal-model-check.md:27` / `pr-convergence.md:27` の「Amadeus never runs it automatically」に対し、`amadeus-advisory-choice.ts:521` が advisory を `kind: "question"` として構成し `:576-586` が `run-now` の無人解決を許す。**xrev G2 の「4値のどれにも該当しない」は誤り** — 完了条件6の後半は実装済みで、残るのは docs drift のみ。要件を縮小できる。
11. **差分区間 `b8e3e664f..4a3da7d62` は本 intent の patch surface に一切触れていない。** `amadeus-orchestrate.ts` の3 hunk は degrade unit resolution（#2393）、`amadeus-advisory-choice.ts` の1 hunk は recovery verb（#2392）。autonomy 系ファイルは無改変。xrev 引用行は observed と同一 SHA で検証済みのため行番号再解決は不要。
12. **`full` では `SCOPE_OUT` の発生源が2つに限られる。** `allowedInteractionKinds` は `full` = `ALL_INTERACTIONS`（`amadeus-intent-autonomy-production.ts:284`）で4値全許可のため、`amadeus-intent-autonomy.ts:750-752` の `scopeAllows` 失敗は起きにくく、実質 `:720-722` の `intentUuid` 不一致 / `workflowExecutionState !== "running"` のみ。**完了条件2の「grant の既定 scope に `phase-gate` を含めるか」は、full については既に含まれている** — 判断が実効を持つのは semi 側（`:307` = `SEMI_ROUTINE_INTERACTIONS` = `["stage-gate","question"]`、`phase-gate` と walking-skeleton を意図的に除外）。要件段でこの区別を明示する必要がある。

## 16. 後続ステージへの申し送り

1. **完了条件1と5には順序依存がある**（H1）。導線（5）だけを先行着地させると「書いてあるのに動かない」導線を作る。要件段で順序を固定する。
2. **完了条件1は実装段で着手できない。** t450 系2テストが現行挙動を逆向きにピンしているため、`cid:reverse-engineering:c1-pinned-behavior-ruling` により**要件段で仕様裁定とテスト契約の明示改訂をセットで確定する**。
3. **完了条件6は要件を縮小できる。** advisory の `question` 化は実装済み（`amadeus-advisory-choice.ts:521`）で、残るのは `plugins/*/stages/*.md:27` の docs drift のみ。xrev G2 の前提訂正を要件本文へ明記する。
4. **完了条件4のベースラインは再定義が要る。** 述語を `INTENT_AUTONOMY_TRANSACTION_COMMITTED` へ固定し、legacy `AUTONOMY_MODE_SET` / `amadeus.autonomy.mode.set` で切った母集団（C1 / C2）を使わない。C2 は xrev 2名が再現不能と判定済み。
5. **完了条件2の判断が実効を持つのは semi 側のみ**（finding 12）。full は `ALL_INTERACTIONS` で4値全許可のため、「grant の既定 scope に `phase-gate` を含めるか」は semi の `SEMI_ROUTINE_INTERACTIONS` に対する判断として書く。
6. **finding 5 の是正は canonical 1定義化として設計する。** state 3フィールドの書き込みを `applyProductionAutonomyMode` へ引き上げ、`amadeus-bolt.ts:1075-1081` を呼び出しへ縮約する（`cid:code-generation:c1-drift-canonical-renderer` と同型）。読み手6系統すべてが同時に是正される。
7. **finding 4 の契約変更は3点セット。** `:376` の単調性判定だけを緩めると `:392-397` の `reviewCommandContentDigest`（単一 decisionId を含む）と `:405` の `commandOccurrenceId` が不整合になる。
8. **導線是正の面数は8面**（SKILL.md 6 + commands 2）。cursor / opencode は `skills/amadeus/SKILL.md` を持たないため、「8 harnesses × SKILL.md」という表現を要件へ持ち込まない。
9. **配布境界**: 患部は `packages/framework/core/`（正本 → `bun run build` で再生成、追跡ファイル不変）と `plugins/`、`docs/` にまたがる。Bolt を分ける場合、検証コマンド集合が Bolt ごとに異なる。
10. **台帳への波及**: `amadeus-orchestrate.ts` / `amadeus-intent-autonomy-production.ts` / `amadeus-bolt.ts` へ行を挿入する修正では `cid:code-generation:c1-allowlist-mechanical-remap`（機械 remap + reason 直読照合）、`cid:code-generation:cg-allowlist-straddle-swell`（span 膨張検査）、`cid:code-generation:c5-ratchet-census-at-final-base`（census は最終 base で採る）が該当する。
