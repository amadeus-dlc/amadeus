# RE スキャン記録 — 260805-semi-redefine-autonomy-f

## 実行メタデータ

- Date: `2026-08-05`
- Intent: `260805-semi-redefine-autonomy-f`
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Base commit: `b938898f364160d4b5857e153579b40b5ab18372`
- Observed commit: `2f255bc6993316f1a271bcd932fabf773096494e`（commit date `2026-08-05 13:24:20 +0900`）
- 祖先性の実測根拠:
  - `git merge-base --is-ancestor b938898f364160d4b5857e153579b40b5ab18372 2f255bc69` → **exit 0**（base は observed の祖先）
  - base は `re-scans/` の記録済み observed のうち HEAD 祖先で距離最小（`cid:reverse-engineering:rescan-base-ancestry`）
  - observed は origin/main 系譜のコミット（`cid:reverse-engineering:c2-observed-mainline-commit`）
  - 本 worktree HEAD は `bff776fd8`（ideation checkpoint）。`git merge-base --is-ancestor 2f255bc69 bff776fd8` → exit 0、かつ `git diff 2f255bc69 bff776fd8 -- packages tests docs scripts` の出力が **空**であるため、コード実体は observed と同一。以下の file:line はすべて observed 断面として読んでよい。
- 区間規模: **19 commits / 464 files**（`git diff --shortstat` = `464 files changed, 36989 insertions(+), 199 deletions(-)`、`git rev-list --count` = 19）
- 測定 ref: 本記録の file:line・件数はすべて observed `2f255bc69`。行番号は canonical 側 `packages/framework/core/`（`.claude/` は同一内容ミラー）。
- Scan mode: DIFFERENTIAL refresh（Developer scan → Architect synthesis の2段。Architect は焦点 seam を独立に再実測）

## Focus

[Issue #2253](https://github.com/amadeus-dlc/amadeus/issues/2253) の2目的:

1. **`semi` の再定義** — 現在の「`none` + phase 内ステージゲート自動承認」から、「`full` − 節目の自動裁定」へ。
2. **起動宣言** — `/amadeus --autonomy semi|full` でワークフロー起動時に autonomy 水準を宣言できるようにする。

対象面: autonomy 判定機構（`amadeus-intent-autonomy*.ts` 4本）、stop hook の carve-out、`amadeus-orchestrate.ts` の flag parser、規約 `stage-protocol.md`、docs 対訳、旧仕様を固定する既存テスト。

## Finding

### F-1. `semi` は無人裁定梯子へ構造的に到達しない

autonomy は2つの独立した関門を通る。

**第1関門** `authorizeInteraction`（`packages/framework/core/tools/amadeus-intent-autonomy.ts:501-531`）。`semi` の分岐は `:510-514`（verbatim）:

```
  if (projection.mode === "semi") {
    const internalGate = occurrence.kind === "stage-gate" && occurrence.phase !== "phase-boundary";
    if (!internalGate || projection.modeProvenance.kind !== "human-command") {
      return { kind: "human-required", occurrence, reason: "MODE_REQUIRES_HUMAN" };
    }
```

`semi` が通すのは **phase 内の `stage-gate` occurrence だけ**。`walking-skeleton`、phase 境界の `stage-gate`、`question` はすべて `MODE_REQUIRES_HUMAN` で人間へ戻る。

**第2関門** のルーティングは `amadeus-intent-autonomy-runtime.ts` の `selectDecision`（`:522-524`、verbatim）:

```
    if (authorization.kind === "semi-mode-gate") return createSelectedGateDecision(projection, input, "mode-semi");
    if (input.occurrence.kind !== "question") return createSelectedGateDecision(projection, input, "grant-gate");
    const resolved = resolveAutoDecision({
```

`semi-mode-gate` は `createSelectedGateDecision` で即決し、`resolveAutoDecision` の梯子へは進まない。**梯子へ進むのは `full` grant を持つ Intent の `question` occurrence だけ**である。

したがって現行の `semi` は「`full` から一部を差し引いたもの」ではなく、「`none` に1つだけ足したもの」と表現するのが正確である。

### F-2. 無人裁定梯子は 5 段（#2253 の「4段」は confirmed-policy を数えていない）

`resolveAutoDecision`（`amadeus-intent-autonomy.ts:699-744`）の実測:

| 順 | 段 | file:line | 競合・失敗時 | reviewState |
| --- | --- | --- | --- | --- |
| — | full ハードゲート | `:702` | `{kind:"invalid", reason:"full-grant-required"}` | — |
| 0 | confirmed-policy | `:706-707` | `confirmed-policy-conflict` | `reviewed` |
| 1 | norm | `:708-717` | `:713` の `{kind:"park", reason:"NORM_CONFLICT"}` | `reviewed` |
| 2 | history | `:718-725` | 競合は不採用（次段へ） | `reviewed` |
| 3 | solo-election | `:726-735` | `invalid-election-result` | **`unreviewed`** |
| 4 | agent-recommendation（縮退） | `:736-744` | `unavailableReason` 未設定なら `invalid-recommendation-result`（fail-closed） | **`unreviewed`** |

full ハードゲートの verbatim（`:701-702`）:

```
  const grant = projection.currentGrant;
  if (projection.mode !== "full" || grant === null) return { kind: "invalid", reason: "full-grant-required" };
```

`reviewState` の分岐は `:605-607`（`basisKind` が `solo-election` または `agent-recommendation` のときのみ `unreviewed`）。

### F-3. `semi` を梯子へ載せる最小介入点は3つ、ただし構造的制約が1つ

| # | 介入点 | file:line | 現行の振る舞い |
| --- | --- | --- | --- |
| 1 | `authorizeInteraction` の semi 分岐 | `amadeus-intent-autonomy.ts:510-514` | phase 内 stage-gate 以外を弾く |
| 2 | `selectDecision` のルーティング | `amadeus-intent-autonomy-runtime.ts:522-524` | `semi-mode-gate` を梯子へ渡さない |
| 3 | `createGateAutoDecision` の入口ガード | `amadeus-intent-autonomy.ts:667-673` | `question` occurrence を throw で拒否 |

介入点3の verbatim（`:667-673`）:

```
  if (input.occurrence.kind === "question") throw new Error("gate-decision-requires-gate-occurrence");
  if (input.basisKind === "mode-semi" && input.projection.mode !== "semi") {
    throw new Error("semi-gate-requires-semi-mode");
  }
  if (input.basisKind === "grant-gate" &&
    (input.projection.mode !== "full" || input.projection.currentGrant === null)) {
    throw new Error("grant-gate-requires-full-grant");
  }
```

**構造的制約**: `resolveAutoDecision:702` の full ハードゲートは mode と grant を同時に見る。`semi` は grant を持たない mode である — 人間コマンドの値域（`:250-257`）で `set-mode` は `"none" | "semi"` のみを受け、`full` grant は `issue-full` / `replace-full` 経由でしか発行されない。したがって `semi` を梯子へ載せることは「**grant なしで梯子を回す**」構造変更を意味する。これが本 intent の最大の設計論点である。

一方、効果適用側 `applySemiDecision`（`amadeus-intent-autonomy-runtime.ts:546-554`）は効果が `workflow-reversible` 分類でなければ `semi-gate-effect-not-authorized` を返す。**「不可逆な効果は semi では通さない」判別軸は既に実在する**ため、「節目」の定義をこの分類へ寄せられるかが設計の焦点になる。

### F-4. 「節目」を判別する述語は存在しない

現行コードで機械的に判別できるのは2軸のみ:

- `occurrence.phase !== "phase-boundary"`（phase 境界か否か）
- `occurrence.kind`（`stage-gate` / `walking-skeleton` / `question`）

`question` occurrence には phase 概念がないため、「どの質問が節目か」を判別する述語は **observed 時点で存在しない**。再定義の実質はこの述語を新設できるかにかかる（要件段の裁定事項）。

### F-5. stop hook に既存の非対称がある

`packages/framework/core/hooks/amadeus-stop.ts`:

| 軸 | 関数 | file:line | `semi` の扱い |
| --- | --- | --- | --- |
| 継続 cap | `stopContinuationDefaultCap` | `:147-151` | `full` と同じ `AUTONOMOUS_BLOCK_CAP = 8`（`:153`） |
| budget mode | `stopBudgetMode` | `:157-160` | `full`=`autonomous` / `semi`=`gated` / それ以外=`interactive` |
| 質問 carve-out | `isFullyAutonomousIntent` | `:167-178` | **`full` 限定**。`semi` は carve-out を得ない |

定数: `AUTONOMOUS_BLOCK_CAP = 8`（`:153`）、`INTERACTIVE_BLOCK_CAP = 2`（`:154`）、`STOP_CONTINUATION_HARD_CAP = 10`（`:155`）。

`isFullyAutonomousIntent` の verbatim（`:171-177`）:

```
  if (intentAutonomyMode(stateContent) !== "full") return false;
  try {
    const projection = readProductionAutonomyProjection(resolvedProjectDir);
    return projection?.mode === "full" && projection.currentGrant?.state === "active";
  } catch {
    return false;
  }
```

呼び出しは3箇所 — tier-2 質問 carve-out `:422`、tier-2b compose gate `:457`、tier-3 conversational `:716`。旧仕様ピンのコメントが `:418-419` に残る（`// question is pending, and Intent autonomy is not \`full\`.`）。

**cap の軸では `semi` は既に自律側、質問の軸では非自律側**という非対称が observed 時点で実在する。再定義はこれを解消する方向の変更であり、述語名（`Fully` を含む）・分岐・3呼び出し点が改訂面になる。

### F-6. `--autonomy` はコード面に 0 件

`grep -rn -- "--autonomy" packages tests docs .claude scripts specs plugins contrib | wc -l` → **0**（observed 実測）。repo 全体の 22 hit は全件が本 intent 自身の record 成果物である。

解釈点は `packages/framework/core/tools/amadeus-orchestrate.ts:1044-1074` の flag parser if/else ladder。既存の値付きフラグ: `--scope` `:1050` / `--stage` `:1053` / `--phase` `:1056` / `--depth` `:1059` / `--test-strategy` `:1062` / `--report` `:1067`。

**落とし穴**（`:1072-1073`）: 未認識の値付きフラグは値が intent 自由文へ漏れる。`--report` が値を consume する理由は verbatim コメント（`:1068-1069`）に残る:

```
      // CONSUME the value: an unrecognized valued flag would leak its value
      // into the freeform intent text (the path would read as intent words).
```

autonomy は監査済みの**状態変更**であるため read-only フラグの絶対優先梯子（`:1014-1016`、Branch 1 は `:2483-2489`）には置けない。既存流儀に整合する候補は「`amadeus-bolt set-autonomy` を名指しする print directive」（先例: `birthPrintDirective` `:2617-2646`）だが、**未確定**。

### F-7. `amadeus-bolt.ts` の CLI 契約（区間内で +96 シフト）

有効サブコマンドの正本は `:1201` のエラー文字列で **17 種**: `start`, `complete`, `fail`, `abort`, `preview-autonomy`, `set-autonomy`, `decide-question`, `observe-quality`, `resume-quality`, `list-auto-decisions`, `get-auto-decision`, `review-auto-decision`, `approve-batch`, `dispatch-event`, `hold-merge`, `release-merge`。

autonomy 支援コマンドは `handleAutonomySupportCommand` のテーブル（`:1212-1221`）が持つ **8 種**:

| サブコマンド | dispatch | ハンドラ |
| --- | --- | --- |
| `set-autonomy` | `:1213` | `handleSetAutonomy` `:1051-1092` |
| `preview-autonomy` | `:1214` | `handlePreviewAutonomy` `:897-907` |
| `decide-question` | `:1215` | `handleDecideQuestion` `:909-925` |
| `observe-quality` | `:1216` | — |
| `resume-quality` | `:1217` | — |
| `list-auto-decisions` | `:1218` | `handleListAutoDecisions` `:961-973` |
| `get-auto-decision` | `:1219` | — |
| `review-auto-decision` | `:1220` | — |

ファイル全体 1312 行。区間内の差分は `100/1`（ハンク `@@ -68,0 +69,6 @@` / `@@ -954,0 +961,90 @@` / `@@ -1105 +1201 @@` / `@@ -1121,0 +1218,3 @@`）で、**`:961` 以降が +96 行シフト**した。`get-auto-decision` / `review-auto-decision` は `2e990c45a`（#2229）が追加した。

### F-8. `--policies-file` の無音破棄（隣接する既存不整合）

`handleSetAutonomy`（`:1051-1092`）は mode に依存せず `:1067` で `policies: readDecisionPolicyInputs(flags["policies-file"]),` を読む。しかし `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:417` の `if (input.mode === "full")` 分岐により、非 `full` は `:430` で `prepareNonFullCommand(before, input.mode)` へ進む。この関数（`:382-395`）のシグネチャは `(before, mode)` のみで **`policies` を受け取らない**。

結果、`set-autonomy --mode semi --policies-file <json>` は警告もエラーもなく exit 0 で policies を破棄する。observed 時点では `semi` が pre-decision policy を使わないため実害はないが、**再定義で `semi` が confirmed-policy 段を使うなら、そのまま実欠陥になる**。

### F-9. mode の値域と永続化3面

- 型: `amadeus-intent-autonomy.ts:11` — `export type AutonomyMode = "none" | "semi" | "full";`
- 実行時バリデータ4箇所: `amadeus-intent-autonomy.ts:952` / `amadeus-bolt.ts:1053` / `amadeus-stop.ts:162-165` / `amadeus-directive.ts:97`。**directive 面のみ `"semi" | "full"` の2値**で `none` を持たない。
- 人間コマンドの値域（`:250-257`、verbatim 要旨）: `set-mode` は `"none" | "semi"`、`revoke-full` の `targetMode` も同じ。`full` は `issue-full` / `replace-full` 経由のみ。
- 初期 projection: `:218-227`（`system-default` / `mode: "none"`）
- 永続化3面:
  1. **canonical** = 監査 journal の replay（`amadeus-intent-autonomy-replay.ts:123` `replayIntentAutonomyAudit`、`:138` `createAuditIntentAutonomyRepository`、読み口 `amadeus-intent-autonomy-production.ts:133` `readProductionAutonomyProjection`）
  2. state の `Intent Autonomy Mode` / `Intent Grant`（書込 `amadeus-bolt.ts:1072-1078`）
  3. 互換投影 `Construction Autonomy Mode`（`amadeus-bolt.ts:1071` — `const schedulingMode = flags.mode === "full" ? "autonomous" : "gated";`）

(3) により **`semi` と `none` はともに `gated` へ潰れ、互換投影面で区別できない**。

### F-10. 表示面の非対称

- `--status` は autonomy を **8 行**出す（Autonomy / Grant / Grant Scope / Workflow State / Policies / Unreviewed / Stop Reason / Resume）。供給元 `readStatusAutonomy` `packages/framework/core/tools/amadeus-utility.ts:323-334`（fail-soft catch）、レンダラ `renderAutonomyStatus` `:336-350`、呼び出し `:381`、テキスト合流 `:493`、JSON 面 `:488`。
- **statusline には autonomy 表示がない** — `grep -n -i "autonom" packages/framework/core/hooks/amadeus-statusline.ts` → **0 hit**（ファイル全体 325 行、セグメント組み立て `:203-206`）。

利用者が常時見るのは statusline 側である。

## 旧仕様ピン（要件段で反転／保存を裁定すべき面）

### P-1. `tests/unit/t431-intent-autonomy.test.ts:307-314`

`test("semi authorizes only phase-internal stage gates", ...)`、verbatim（`:311-313`）:

```
    expect(authorizeInteraction(plan.after, occurrence("stage-gate", ["approve"])).kind).toBe("semi-mode-gate");
    expect(authorizeInteraction(plan.after, occurrence("walking-skeleton", ["approve"])).kind).toBe("human-required");
    expect(authorizeInteraction(plan.after, occurrence("question")).kind).toBe("human-required");
```

- `:313` = **semi の質問封鎖を直接ピン**する行。再定義の射程に入る。
- `:312` = walking-skeleton のピン。`stage-protocol.md:105` / `:808` と対応し、**#2253 の射程では保存対象**。ただし `semi` を `full` 相当へ寄せる度合いによっては裁定対象になりうる。

他の semi ピン: `:184-196`（`none` → `semi` は grant なしの人間限定遷移）、`:257-265`（`semi-gate-requires-semi-mode` の throw）、`:339`（semi と grant gate の決定は queue 非適用）。

### P-2. `tests/integration/t121-stop-hook-enforce.test.ts:1138-1150`

`test("(f) semi + blank question ALLOWS because questions remain human-owned", ...)`。`intentMode: "semi"` + 未回答質問で `expect(r.out).toBe("")`（block しない）を固定する。**テスト名自体が再定義前の前提を明記**しており、再定義後は block 期待への反転が必要。

他: `:827-833`（`isConversationalStop` の semi 挙動）、`:33` / `:1287`（コメント）。

### P-3. 付随同期先

- `tests/.coverage-patch-allowlist.json:5268` — `"function": "isFullyAutonomousIntent"`。述語の改名・分割時は同一変更で同期する。
- `tests/unit/t147-kiro-hook-adapter.test.ts:723` — コメント。

## 同期面の全数（実測）

### 正本知識 `stage-protocol.md` — 9 行

canonical: `packages/framework/core/amadeus-common/protocols/stage-protocol.md`（`grep -n "semi"` 実測）

| 行 | 要旨 | 再定義での扱い |
| --- | --- | --- |
| `:33` | `semi` phase 境界は人間裁定／auto-approve directive の conductor 手順 | **直接反転** |
| `:105` | walking skeleton gate は `none` / `semi` が人間を要する | 要裁定 |
| `:118` | mode 選択肢ラベル | 表示文言 |
| `:125` | `set-autonomy --mode <mode>` の記録手順 | 起動フラグ追加時に同期 |
| `:131` | **`semi` の正本1行定義** | **直接反転** |
| `:133` | 品質不合格は承認でない | 保存 |
| `:442` | Bolt gate は `none/semi/full` に従う | 参照のみ |
| `:796` | 用語集：legacy ladder prompt | 参照のみ |
| `:808` | 用語集：walking skeleton は `none`/`semi` が人間待ち | `:105` と連動 |

**ミラー全数**: `find . -name stage-protocol.md` の on-disk 実測で **14 本** — canonical 1 + self-install 5（`.claude` / `.codex` / `.cursor` / `.kimi-code` / `.opencode`）+ `dist/` 8（claude / codex / cursor / kimi / kiro / kiro-ide / opencode / pi）。`git ls-files` 追跡は **canonical 1 本のみ**（source-only 境界）。編集対象は canonical のみ、他は `bun run build` の再生成物。

### docs — 22 ファイル = 11 対訳ペア

`grep -rln "semi" docs/ | wc -l` → **22**。`.md` / `.ja.md` のペアで 11 組。**#2253 の「11 ファイル」は片側のみを数えた値**である。

| ペア | 主な該当行 | 性質 |
| --- | --- | --- |
| `reference/03-orchestrator` | `:437` | 質問裁定の正本記述 |
| `reference/06-hooks-and-tools` | `:274` | stop hook carve-out の正本記述 |
| `reference/12-state-machine` | `:189` | 状態機械 |
| `reference/04-stage-protocol` | `:794`, `:809`, `:921`, `:928` | 規約投影 |
| `reference/04-stages/construction` | `:46`, `:54`, `:81` | ステージ記述 |
| `guide/glossary` | `:17` | 用語定義 |
| `guide/02-your-first-workflow` | `:162`, `:167`, `:173` | UI 選択肢文言 |
| `guide/04-phases-and-stages` | `:219`, `:231`, `:261`, `:295`, `:316` | フェーズ解説 |
| `guide/16-worked-examples` | `:283` | 実例 |
| `guide/workshop-mode` | `:331` | ワークショップ |
| `harness-engineering/08-construction-and-swarm` | `:37`, `:57`, `:61-62`, `:68`, `:101` | ハーネス側手順 |

### テスト — 14 hit のうち実質 13

`grep -rln "semi" tests/ --include="*.ts"` → 14 ファイル。ただし `tests/unit/t97.test.ts` の hit（`:168`, `:170`）は **`semicolon` の部分一致で autonomy とは無関係**（実読で確認）。

焦点度順: `t431-intent-autonomy`(unit, 最高) / `t121-stop-hook-enforce`(integration, 最高) / `t432-intent-autonomy-runtime`(integration) / `t435-intent-autonomy-production`(integration) / `t393-birth-autonomy-field`(integration) / `t403-plan-integrity-guard`(unit) / `t403-issuance-guard`(integration、**同番号の別ファイル**) / `t428-quality-repair`(unit) / `t429-quality-repair-runtime`(integration) / `t211-swarm-batch-progress`(unit) / `t135-invoke-swarm`(integration) / `t414-swarm-retry-budget`(integration) / `tests/harness/kiro-ide-driver.ts`。

## 区間の影響（base → observed）

### 行シフト

焦点ファイルの**大半は区間内無変更**（シフト 0）: `amadeus-intent-autonomy.ts` / `amadeus-stop.ts` / `amadeus-utility.ts` / `amadeus-orchestrate.ts` / `amadeus-statusline.ts` / `t431` / `t121`。

| ファイル | 差分 | シフト |
| --- | --- | --- |
| `amadeus-intent-autonomy-runtime.ts` | `2/2` | 置換のみ、シフト 0 |
| `amadeus-bolt.ts` | `100/1` | **`:961` 以降が +96** |
| `amadeus-common/protocols/stage-protocol.md` | `2/0` | `:35` 以降 **+2**（履歴節が引く `:129` は observed で `:131`） |

`stage-protocol.md` の区間内追加（`:35` 付近、要旨）: auto-approve directive であっても `phase_boundary` の phase-check artifact は免除されない（state guard は fail-closed で autonomy を知らない）。

焦点パスに触れた commit は5件: `b45dc5c59`(#2233) / `fc862e879`(#2242) / `38df739a2`(#2241) / `b21e7c541`(#2234) / `2e990c45a`(#2229)。

### 新規ファイル（`git diff --diff-filter=A`、core tools / harness 限定）

| 新規ファイル（行数） | 本 intent との隣接性 |
| --- | --- |
| `amadeus-autonomy-review.ts` (1273) | **auto-decision の unreviewed レビュー面**。梯子後段2段が生む `reviewState: "unreviewed"` の受け皿。`semi` を梯子へ載せると未レビュー件数が増えるため直接影響する |
| `amadeus-autonomy-review-production.ts` (484) | 同上の本番結線 |
| `amadeus-harness-registry.ts` | ハーネス登録の集約 |
| `amadeus-intent-completion.ts` | ワークフロー完了判定 |
| `packages/framework/harness/registry.ts` | ハーネス registry 正本 |

前2者（計 1757 行）は **base 時点では存在しなかった**。

### 構成デルタ

| 指標 | base 断面の記載 | observed 実測 | 測定コマンド |
| --- | --- | --- | --- |
| core tools `.ts` | 116 | **119** | `ls packages/framework/core/tools/*.ts \| wc -l` |
| `tests/**/*.test.ts` | 927 | **941** | `find tests -name '*.test.ts' \| wc -l` |
| 最大テスト番号 | — | **t439** | `ls tests/{unit,integration,e2e} \| grep -oE "^t([0-9]+)" \| sed 's/t//' \| sort -n \| tail -3` → 437 / 438 / 439 |

区間内の新規テストは21ファイル。番号付きは t433 / t434 / t436 / t437 / t438 / t439、残る8本は `t-` prefix の番号なし形式。**後続 Bolt は t440 以降を採ること**（`cid:code-generation:swarm-test-number-reservation`）。

### 外部依存

`git diff --stat b938898f3 2f255bc69 -- package.json bun.lock packages/setup/package.json` の出力は **空**。区間19コミットで外部依存の変更は **0 件**。

## Verification

本 Architect synthesis ではテストを再実行していない。coverage も実行していない（`cid:code-generation:c1-coverage-single-owner`）。検証は次の3種で構成した。

1. **observed 断面の機械実測** — `grep -n` / `awk` / `wc -l` / `find` / `git diff` / `git merge-base --is-ancestor`。
2. **焦点 seam の verbatim 直読** — `authorizeInteraction:510-514`、`createGateAutoDecision:667-673`、`resolveAutoDecision:701-744`、`selectDecision:522-524`、`isFullyAutonomousIntent:171-177`、flag parser `:1044-1074`、`t431:307-314`、`t121:1138-1150`。
3. **Developer scan 申告との突き合わせ** — 下記の差分節。

Developer scan 側の一次検証（テスト実行）は本 intent では未実施であり、`semi` 関与テストの現況グリーン性は **未検証**である。

## Developer scan との差分（Architect が実読で訂正した点）

| # | 申告値 | 実測値 | クラス |
| --- | --- | --- | --- |
| 1 | full ハードゲート `:700-701` | **`:701-702`**（`if` 行は `:702`） | 梯子の行範囲が一律1行低い |
| 2 | confirmed-policy `:705-706` | **`:706-707`** | 同上 |
| 3 | norm `:707-716`、競合 `:712` | **`:708-717`**、競合 **`:713`** | 同上 |
| 4 | history `:717-724` | **`:718-725`** | 同上 |
| 5 | solo-election `:725-734` | **`:726-735`** | 同上 |
| 6 | agent-recommendation `:735-743` | **`:736-744`** | 同上 |
| 7 | `handleSetAutonomy :1050` | **`:1051`** | ハンドラ定義行 |
| 8 | `handleListAutoDecisions :960` | **`:961`** | 同上 |
| 9 | `selectDecision` 分岐 `:516-534` / `:517-518` | **`:522-524`** | ルーティング |
| 10 | `applySemiDecision :545-560` | **`:546-554`** | 同上 |
| 11 | `stage-protocol.md` 該当「8行」 | **9 行**（`:33`,`:105`,`:118`,`:125`,`:131`,`:133`,`:442`,`:796`,`:808`） | 件数（申告の列挙自体は9件） |
| 12 | semi 関与テスト 14 ファイル | **13**（`t97` は `semicolon` の偽陽性） | 偽陽性 |

実測一致（訂正なし）: `createGateAutoDecision :666`、`authorizeInteraction :501` / `:510-514`、question-throw `:667-673`、`resolveAutoDecision :699`、`reviewState :605-607`、stop hook の全 file:line、flag parser の全 file:line、`amadeus-utility.ts` の `--status` 全 file:line、`amadeus-directive.ts:97`、`amadeus-bolt.ts` dispatch `:1213-1220`、`t431:307-314`、`t121:1138-1150`、`--autonomy` 0 hit、docs 22 ファイル、core tools 119、テスト 941、最大番号 t439、区間規模 19 commits / 464 files。

## 未確定事項

Developer scan が挙げた6件のうち **3件を解消**、**3件が未確定のまま残る**。

### 解消済み

1. **statusline の配布機構** → 各ハーネス manifest の `coreDirs` にある `{ src: "hooks", dst: "hooks" }` 投影（`packages/framework/harness/claude/manifest.ts:55` 以降で確認）。canonical `packages/framework/core/hooks/` から `bun run build` が全ハーネスへ投影する。
2. **`stage-protocol.md` のミラー全数** → on-disk 14 本（canonical 1 + self-install 5 + `dist/` 8）、`git ls-files` 追跡は canonical 1 本のみ。
3. **`tests/unit/t97.test.ts` の semi 関与内容** → `semicolon` の部分一致であり autonomy とは無関係。実質的な semi 関与テストは 13 ファイル。
4. **`dependencies.md` の外部依存の区間内変更** → `git diff --stat` が空で **変更 0 件**と確定。

### 未確定（推測で埋めていない）

1. **`semi` の phase 内 auto-approve が `phase_boundary` directive を受け取らない保証は未検証**。`authorizeInteraction:511` の `occurrence.phase !== "phase-boundary"` は occurrence 側の値を見るが、その値が engine の `directive.phase_boundary` 算出（`amadeus-orchestrate.ts:2160-2166`）と常に一致することを実 run で確認していない。
2. **#2253 が述べる「11 ファイル」の内訳**（日英どちらを数えたか）は Issue 本文を実読していないため不明。本記録は実測の 22 ファイル = 11 対訳ペアを正とする。
3. **`semi` 関与テスト13ファイルの現況グリーン性**は未実行のため未検証。再定義の影響範囲を確定するには要件段以降で実行が必要。
4. **再定義後の「節目」判別基準**は設計候補すら未確定。本記録が示すのは、現行コードに判別軸が2つ（`occurrence.phase` / `applySemiDecision` の `workflow-reversible` 分類）しかないという事実のみである。

## Updated artifacts

共有9成果物の現在断面を更新し、直前の `260804-phase-boundary-approval` を本文保持のまま履歴へ降格した（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため書き換えていない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）— 区間内で `+96` / `+2` のシフトが生じた箇所は、履歴節を改変せず現在節に実測値と差分の由来を明記した。

- `business-overview.md`
- `architecture.md`（Interaction Diagrams 節: Mermaid 2 図 + テキストフォールバック）
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`
- 本記録 `re-scans/260805-semi-redefine-autonomy-f.md`（新設）
