# API ドキュメント

## state integrity が対象とする契約（260803-state-integrity、現在、observed `6c15af23a`）

本節の file:line はすべて observed `6c15af23a` 時点。全数列挙は `re-scans/260803-state-integrity.md` を正本とする。本 intent が触れるのは公開 CLI 契約ではなく、**内部の相互排他契約と state フィールドの意味論契約**である。

> **測定 ref の訂正（Step 1 preflight の後追い実施）。** 本 intent の RE は、ステージ Step 1 の preflight（差分リフレッシュ前に trunk を統合する）を**当初スキップしたまま**走った。preflight は事後に是正パスとして実施され、observed はその統合後の HEAD `6c15af23a` である。統合した 6 コミットは患部ソース 6 ファイルを **1 行も変更していない**（`git diff --stat 498c3034a..origin/main -- packages/framework/core/tools/{amadeus-lib,amadeus-state,amadeus-audit,amadeus-jump,amadeus-utility,amadeus-bolt}.ts` が空出力・exit 0。Architect が独立に再実測）。したがって本節の行番号・引用はいずれも preflight 前後で不変である。経緯の全文は `re-scans/260803-state-integrity.md` §実行メタデータ。

### `withAuditLock` / `acquireAuditLock` の内部契約

| 契約要素 | 現在の定義 | 変更が波及する面 |
| --- | --- | --- |
| bucket 決定 | `auditLockIdentity(projectDir, intent?, space?)`（`amadeus-lib.ts:5960-5966`）。`intent` 未指定 → `${projectDir}\x00${WORKSPACE_LOCK_SENTINEL}`、指定時 → `${projectDir}\x00${space}\x00${intent}` | `t164-shard-ordering-and-lock-bucket` が現行意味論を pin |
| 呼び出し形 | bucket 引数は callback の**後**に置く（`withAuditLock(pd, fn, intent, space)`）。したがって bucket は callback の閉じ行に現れる | 開き行だけの grep による bucket 分類は誤りになる |
| 再入 | per-identity depth counter により同一 identity の nested acquire は再入する | `amadeus-audit.ts:429-433` が設計意図を記録 |
| 予算 | `acquireAuditLock(projectDir, maxRetries = 50, retryMs = 100, intent?)`（`:6360-6361`）→ mkdir 試行 51 回・sleep 50 回 = 5000 ms | `fatal-latch.ts:99` は `(5, 50)` = 250 ms で呼ぶ |
| 枯渇時の挙動 | `AuditLockAcquireError` を throw（`:6520-6521`） | `t380` / `t388` がエラーの形を pin。`t145` が fail-closed acquire 契約を pin |
| acquire 成否 | `finalizeAuditLockAcquire`（`:6337-6356`）— `writeOwnerStamp` 成功で `true`。**失敗しても `dead-or-over-age` 方針なら `true`（`:6345`、fail-open）**、それ以外は cleanup して `false` | fail closed 化は `t145` の契約と整合する方向の変更 |
| reap 方針 | `AuditLockReapPolicy` = `dead-or-over-age` ／ それ以外。`liveOwnerMayBeReaped`（`:6274-6282`）は前者でのみ live PID を reap 対象にする | 方針の意味変更は `t161` / `t163` / `t-reap-mutex` に当たる |

### 環境変数ノブ

| ノブ | 既定 | 定義 | 役割 |
| --- | --- | --- | --- |
| `AMADEUS_LOCK_STALE_MS` | `DEFAULT_LOCK_STALE_MS` = 10 分（`amadeus-lib.ts:5945`） | `lockStaleMs()` | live owner の over-age 判定閾値（分岐 B の入口） |
| `AMADEUS_LOCK_UNSTAMPED_GRACE_MS` | `5000`（`:6107-6114`） | `unstampedGraceMs()` | unstamped dir の猶予（分岐 A の入口、判定は `:6294` の厳密比較 `>`） |
| `AMADEUS_LOCK_BASE_DIR` | OS temp 既定 | lock dir の基底 | 実測ハーネスの隔離に使用 |

既定の acquire 予算 5000 ms と `unstampedGraceMs()` 既定 5000 ms が一致しており、unstamped dir が合法的に steal 可能になる時刻が waiter の最終リトライ機会と重なる。これは機序ではなくタイミング上の脆い結合である。

### `Completed` フィールドの契約

`Completed` は state file の派生フィールドであり、**現在 3 つの定義が並存する**。

| 定義 | 導出式 | 供給元 |
| --- | --- | --- |
| R | `countCheckboxes(content, "completed")`（`amadeus-lib.ts:5669`）— `[x]` の生カウント。SKIP suffix 行も数える | `amadeus-state.ts:1455`、`:2286`、`:2367`、`:2536`/`:2554`、`:3422`、`amadeus-jump.ts:564` |
| E | `parseCheckboxes(next).filter(c => c.state === "completed" && effective(c.slug) === "EXECUTE")`（`amadeus-lib.ts:5781`） | `rebuildDerivedPlanFields`（共有書き手）、`amadeus-utility.ts:5236`（inline コピー） |
| G | `graph.filter(s => s.phase === "initialization").length`（`amadeus-utility.ts:4433`） | state 初期化テンプレート `:4513` |

関連契約: 同一関数 `rebuildDerivedPlanFields` が `Total Stages = executeStages.length`（`:5780`）を書く。したがって定義 R の書き手は `Completed > Total Stages` を成立させうる。`t394` はこの不変条件（`Completed <= Total Stages`）を assert する。

**外部から観測できる面（変更時に利用者影響が出る箇所）:**

- CLI JSON 出力: `amadeus-state.ts:1459`（`completed_count`）、`:2318`、`:2433`、`:2592`、`amadeus-jump.ts:638`（`completed_count`）
- append-only audit 行: `amadeus-state.ts:605`（`"Stages completed"`）、`:619`（`Details: Scope: …, N stages completed`）、`:2143`、`amadeus-jump.ts:132`、`amadeus-utility.ts:4568`（`WORKSPACE_INITIALISED`）
- approve の fail-closed 検証: `amadeus-state.ts:3377` — `getField(content,"Completed") !== String(countCheckboxes(content,"completed"))` なら `"completed count"` を返す

**定義を変えると audit 行の数値の意味が変わる。** 監査記録は append-only であるため過去行は再解釈されず、切替点を跨いで同一フィールドが別定義になる。要件はこの切替の扱い（過去行の解釈規約を記すか、resync で現在断面のみ整合させるか）を明示する必要がある。

### text mutation の契約（`7c29e33f7` で導入、#1875 の是正が乗る基盤）

- `TextMutationResult`（`amadeus-lib.ts:5425`）= `changed | not-found` の判別ユニオン
- `StateMutationTargetError`（`:5450`）
- `requireChanged(result, operation)`（`:5660-5667`）— `not-found` で throw。呼び出し点 19（`amadeus-state.ts` 11 / `amadeus-jump.ts` 5 / `amadeus-utility.ts` 3）
- `setCheckbox` / `setStageSuffix`（`:5599` / `:5629` / `:5645`）はユニオンを返す
- `countCheckboxes`（`:5669`）の意味論はこの変更で**不変**のまま残された

### 本 intent が変えない契約

公開 CLI の verb 集合、`amadeus-orchestrate` の directive スキーマ、監査シャードの行形式、stage frontmatter スキーマはいずれも患部外であり、本差分では変更されない。

## registry drift guard が対象とする契約（260802-registry-drift-guard、履歴、observed `64b44a9f8`）

### CLI 契約

- 呼出形: `bun <harness>/tools/amadeus-state.ts <verb> [args]`。実 dispatch は33 verb。
- 未知 verb のエラー契約: `Unknown subcommand: <value>. Valid: ...`。現在の `Valid:` は30 verbで、`set-construction-iteration`、`archive`、`unarchive` が欠ける。phantom verb はない。
- drift guard の契約候補: dispatch集合と表示集合の missing/extra/duplicate/empty を分離して返し、エラーメッセージはどちら側の欠落かを示す。順序を公開契約として固定するかは Requirements Analysis で裁定する。

### stage frontmatter 契約

- accepted top-level fields は25件: `slug`, `phase`, `execution`, `condition`, `lead_agent`, `support_agents`, `mode`, `produces`, `consumes`, `requires_stage`, `inputs`, `outputs`, `number`, `name`, `for_each`, `workspace_requires`, `optional_produces`, `produces_kinds`, `sensors`, `scopes`, `reviewer`, `reviewer_max_iterations`, `bundle`, `when`, `required_sections`。
- `emitStageFrontmatter` の `FIELD_ORDER` も同じ25件で、現時点の集合差分は0。
- `when` は `{ "producer-in-plan": string }` として schema/parser/emitter が受理・検証する active field である。authoritative spec と英日 reference の「reserved」説明は実装契約と矛盾する。
- docs machine registry は完全性検査用であり、既存の詳細H3を全項目へ増やす要求ではない。英日双方で同じ25件を保持することを契約候補とする。

## scope-grid 面間同期が触れる内部契約（260802-scope-grid-face-sync、履歴、observed `47574fbab`）

- 判断: 公開 CLI 契約の変更なし（`/amadeus --scope <name>` の語彙・引数は不変）。触れる内部契約は 2 点 — (1) センサー出力スキーマ: `Finding`（`amadeus-sensor-self-scope-consistency.ts:26-32`）の `reason` 列挙と manifest の `output_schema`（`sensors/amadeus-self-scope-consistency.md:12-20`）が対で、cell-mismatch 系 reason と stage / expected / actual フィールドの追加は両者同時改訂を要する。(2) `scope-grid.json` の flat スキーマ（top-level = scope 名、値 = stages マップ `<slug>` → `EXECUTE` / `SKIP`）自体は不変で、是正はセル値の書き換えに閉じる。詳細は `code-structure.md` 現在節の挿入点表を正本とする。

## 2026-08-03 差分更新 — Issue #2018 projection parity 修復

- project projection の出力契約は、選択済み plugin について host-local staging、composition state、composed files、plugin nodeを含む stage graph、face固有 runnerを決定的に生成し、5 self-install面で version管理すること。生成後の再実行はbyte不変でなければならない。
- startup の `compose --if-stale` 契約は、commit 済み projection が current なら完全な no-op、欠落またはdrift時だけ transactional repair とする。postcondition は「fresh worktreeで初回利用可能」かつ「正常 startup 後の `git status --porcelain` が空」である。
- runner destination は face contract の一部とする。Codex は `.agents/skills`、Claude等は各manifestが定めるhost pathを返し、core plugin CLIが `tools/../skills` を暗黙の全face契約として扱わない。

## formal-model-check 複数モデル化が触れる内部契約（260801-tla-multi-model、履歴、observed `33e196b8`）

- 判断: 公開 CLI 契約の変更なし（`run-model-check.ts --model/--cfg/--out` は不変）。触れる内部契約は 3 点 — (1) `specs/tla/model-map.json` v2 スキーマ: `exactObject`（`amadeus-formal-verif-model-map.ts:204`）が未知キーを拒否するため aux 配列の追加はスキーマ改訂を伴う（optional 追加なら既存 identity 値は不変）。(2) identity 計算: model/cfg は domain-tagged canonical（`canonicalIdentity :33-46`）、entries は生 sha256 — aux の identity 方式の選定が契約追加点。(3) byte-pin source 契約: `run-model-check-source.ts:118-123` が実行対象を canonical U1 ソースに `sameBytes` で pin しており、複数モデル実行にはこの照合のモデル別一般化が必須（CLI 引数だけでは不可）。loader の no-arg pin（`t-formal-verif-tla-model-loader.test.ts:10-13`）の改訂は要件段で宣言（`cid:reverse-engineering:c1-pinned-behavior-ruling`）。

## no-silent-drop が追加・変更する契約（260801-silent-drop-gate、履歴、observed `d72f60b5a`）

### 観測済み契約

- `tests/callsite-guard.ts:33-36` は `--check`／`--update`／`--report` を持ち、`:201-205` で measured count が許容量を超えたときだけ violation とする。
- `tests/complexity-gate.ts:53-69` は root、baseline、tool command を環境変数で差し替えられ、missing tool と malformed baseline をテスト可能にする。
- `setCheckbox(content, slug, state): string`（`amadeus-lib.ts:5399-5411`）と `setStageSuffix(content, slug, action): string`（`:5419-5429`）は slug 不在を表現できない。現契約は `tests/unit/t108.test.ts:207-232` と `tests/unit/t400-lib-record-path-and-field-helpers.test.ts:108-113` が無変更返却として固定している。
- resync は `StateResyncStatus` の `section-unrecognized` と `StateResyncRun` の `invalid-graph` を first-class outcome とし、`tests/integration/t407-resync-noop-detection.test.ts:97-212` と `t411-compose-invalid-graph-visibility.test.ts:1-22` が stderr + exit 1 を固定する。

### 確定した追加契約

- no-silent-drop CLI は check 時に typed result を返し、違反または tool／rule／baseline／exemption の不正、zero scan、partial scan で非0 exit とする。stdout を機械可読出力に使う場合、診断は stderr に分離する。
- rule ID は3 shape と1対1に対応する。catch exemption は非空理由を要求し、直近の catch AST node 1件だけへ作用する。ファイル単位・行範囲単位の免除は受理しない。
- baseline update は減少のみ、exemption update は既存 node の削除・理由修正のみを許し、新規 violation を黙って承認する経路を持たない。
- #1878 は永続化結果を消費し、失敗時に `safety-blocked` の偽成功を返さない。#1874 は `changed | not-found` 相当を表現し、mutation caller が `not-found` を loud failure として処理する。
- #1963 は [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の既存 contract を変更しない。

## kimi bootstrap デッドロック修正が触れる内部契約（260801-kimi-bootstrap-deadlock、履歴、observed `861688c31`）

- 判断: 公開 CLI 契約の変更なし。触れるのは内部ファイル契約1点 — `amadeus/.amadeus-sessions/.current-session` の書込みタイミング（`amadeus-session-start.ts` の state-file ガード後段 `:117` → ガード前段）。読み手側（`amadeus-caller-authorization.ts:96-109` / `amadeus-kimi-lib.ts:399-403` / `readCurrentSessionId` 経由3箇所）の契約は不変。`tests/unit/t10-hook-session-start.test.ts:211` / `:222` が現行挙動を pin しており改訂が必要（`cid:reverse-engineering:c1-pinned-behavior-ruling` に従い要件段で宣言）。

## CG 計画整合ガードが触れる内部契約（260801-cg-plan-guard、履歴、observed `cb809c4de`）

- 判断: 公開 CLI 契約の変更なし。触れる内部契約は3点 — next の directive 発行前提（bolt_dag 不在時の per-unit 降格が fail-closed 化）、approve の受理条件（SWARM 実績突合の追加）、edge block の受理形式（#1893 裁定依存）。いずれも要件段でテスト契約の明示改訂を宣言する（c1-pinned-behavior-ruling）。

## オープンバグ一括修正バッチ第5弾が触れる内部契約（260801-open-bug-batch-5、履歴、observed `c49e385ac`）
## 価値チェーン3件が触れる内部契約（260731-formal-verif-value-chain、履歴、observed `da51af375`）

file:line はすべて HEAD `16486d3c` 断面の実測。3 Issue が変更・拡張しうる内部契約を、現行の形とともに固定する。

### 契約 1 — plugin manifest スキーマ（#1829 で拡張が必要）

現行の型（`packages/framework/core/tools/amadeus-plugin-compose.ts:105-110` verbatim）:

```ts
export type PluginManifest = {
  name: string;
  stages: readonly StageCopy[];
  seams: readonly SeamContribution[];
  fragments: readonly FragmentSplice[];
};
```

parser（同 `:330-334`）も `parseStages` / `parseSeams` / `parseFragments` の3本のみを呼ぶ。**`tools` を宣言する場所が型にも parser にも無い。** `formal-model-check` の実 manifest も `"seams":[]` / `"fragments":[]` を明示した3フィールド構成。

拡張時に同時に動く契約:

| 契約点 | 現行 | 拡張の影響 |
| --- | --- | --- |
| `PluginManifest` 型 `:105-110` | 3フィールド | フィールド追加 |
| manifest parser `:330-334` | 3 parser | parser 追加 + errors 合流 |
| `composeWriteSet` `:1021` | `hostWrites` = `plan.stageCopies` ∪ `plan.sharedWrites` | 第3の write 源を追加 |
| `ownedPaths` `:557` | stage パス限定 | 所有境界の拡張（drop の逆操作も対称に要る） |
| coverage allowlist trusted path | `tests/.coverage-patch-allowlist.json:35-36` が `plugins/<plugin>/stages/` 始まりに限定と明記 | tools 配布時に**この限定が効く** |

### 契約 2 — projection の入出力契約（#1829 は無改修で通る）

`scripts/plugin-projection.ts`:

- `:158` `discoverPluginSources` — `walkFs` で**全ファイル走査**（`:169-172`）。宣言不要
- 検証は構造安全性のみ（`:194`、`:207-215`）
- 変換規則 `:238-241` verbatim: 「Prose is transformed…; `.json`/`.ts` are verbatim」
- 出力 prefix `:129` — `plugins/<name>/`

すなわち **projection は宣言駆動ではなくディスク駆動**であり、compose だけが宣言駆動という非対称が契約レベルで存在する。

### 契約 3 — activation advisory の出力契約（#1738 の変更対象）

| 契約点 | 現行の形 |
| --- | --- |
| 発火スロット | `amadeus-orchestrate.ts:1293` `const ACTIVATION_ADVISORY_STAGE = "build-and-test";` |
| ガード | `:1306` `if (slug !== ACTIVATION_ADVISORY_STAGE) return;` |
| チャネル | stderr 単線。`:1299-1300` コメント「Writes ONLY stderr — the stdout directive JSON stays byte-pure」 |
| 判定関数 | `amadeus-plugin-activation.ts:272` `activationAdvisoryForHost(hostRoot, fs = defaultActivationFs)` → `string \| null` |
| 戻り値 | `null` = 沈黙（`current`）/ `:209` CHANGED 文面 / `:211` no recorded verdict 文面 |
| 副作用 | 無（`:272` 直上コメント「Never writes state (BR-U6-6). Never throws.」） |
| 第1ゲート | compose 済みか（`:230` 近傍、未 compose なら 0-plugin zero-impact） |
| 重複抑止 | **ラッチ無し**。`:1296-1297` コメント「single guarded call site — emitForSlug — so no latch is needed for BR-U6-8」 |

**発火点を増やす／前倒す設計は、この「単一呼出しゆえラッチ不要」という前提を破る。** advisory の冪等性契約を新設するか、発火点を単一に保ったまま位置だけ動かすかが要件段の裁定対象。

### 契約 4 — model-map ファイル契約（#1510）

`specs/tla/model-map.json` の実体（`schemaVersion 1`）:

| フィールド | 内容 |
| --- | --- |
| `model` | `{ path: "specs/tla/FormalElection.tla", identity: "742b7785…" }` |
| `cfg` | `{ path: "specs/tla/FormalElection.cfg", identity: "92656a5c…" }` |
| `entries` | 5 件、各 `{ implPath, sha256 }`（`amadeus-election*.ts`） |

スキーマ検証（`amadeus-formal-verif-model-map.ts`）: `:49-51` パス定数、`:158` `exactObject(["implPath","sha256"])`、`:161` 境界検査、`:169` ソート/一意、`:186` `exactObject(["cfg","entries","model","schemaVersion"])`。**`exactObject` はフィールド追加を fail-closed で拒否する**ため、entries に更新理由等のメタを足す設計はスキーマ改訂を伴う。

### 契約 5 — 更新拒否と実行時ドリフトの非対称（#1510 の中核）

| 方向 | 実装 | 判定対象 |
| --- | --- | --- |
| 実行時（読取） | `scripts/formal-verif/tla-model-loader-internal.ts:232` `if (sha256 !== entry.sha256) return drift(entry.implPath, "implementation entry hash differs from model map");` | **entries の impl-hash** |
| 更新（書込） | `amadeus-sensor-model-completeness.ts:650-659` — model/cfg identity が一致していれば `{ ok:false, code:"MODEL_UNCHANGED" }` | **model/cfg identity のみ** |

**片側だけが impl-hash を見る非対称**（`cid:requirements-analysis:symmetric-pair-review` の write⇔check 対の破れ）が詰みの正体。読取側の他3分岐は `:221`（種別）/ `:224`（可読性）/ `:229`（バイト読取）。消費側の公開口は `:239` `loadVerifiedTlaSourceInternal`（`:236-237` に「Internal/test-only seam. Production callers must use the no-argument wrapper in tla-model-loader.ts」）。

更新側の API 面: `:691` `updateModelMapInternal`（本体）/ `:729`（公開）/ `:778-779`・`:790`（CLI 分岐）。文書化された唯一の手順は `.claude/sensors/amadeus-model-completeness.md:37`、`:39-41` に MODEL_UNCHANGED 拒否が明記されている。

センサー発火契約は `.claude/sensors/amadeus-model-completeness.md:8` verbatim:

```
matches: "**/{specs/tla/**,packages/framework/core/tools/amadeus-election*.ts}"
```

**impl 変更で発火するが更新に到達できない** — 発火契約と更新契約の間に穴がある。

### 契約 6 — mirror 状態機械の遷移契約（#1738 の新モデル題材）

`amadeus-mirror-state-reducer.ts`:

- 入力: `MirrorTransition`（`:55`、inline 18 種 + `:113` `| ProjectSyncTransition;` の 3 種 = **21 種**）
- 統合口: `:814` `reduceMirrorState`
- 出力: `ReducerResult` = `changed` / `unchanged` / `invalid`（`:127` 直前の union）
- 終端: `:127-132` `TERMINAL_STATUSES` = succeeded / skipped-for-event / safety-blocked / abandoned
- 事前条件（`:692-715` verbatim）: `guardMarkAttempted`（prepared∨attempted）/ `guardClaimCreate`（同 + `createIdentity`）/ `guardRetryNoEffect`（pending ∧ no-effect-confirmed）/ `guardObservedRetry`（pending ∧ outcome-unknown）
- 有限化定数: `:42` `export const MAX_RECEIPTS = 1000;`

boundary → operation の写像契約（`amadeus-mirror-coordinator.ts:230-244` verbatim）:

```ts
if (context.boundary.kind === "manual") return null;
if (context.boundary.kind === "intent-capture-approved") return "create";
if (context.boundary.kind === "workflow-completed") { return nextCompletionOperation({ intentUuid, boundary, state }); }
return state.issueNumber === null ? "create" : "sync";
```

`intent-capture-approved` のみ `state.issueNumber` を参照せず `create` を返す — この非対称が [#1838](https://github.com/amadeus-dlc/amadeus/issues/1838)（重複 create）の機序候補であり、新モデルが検査すべき不変量（「issueNumber 記録済みなら create を発行しない」）の第一候補になる。

## オープンバグ4件が触れる内部契約（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）
## perf 分離が触れる内部契約（260731-perf-ci-separation、履歴、observed `da51af375`）
## オープンバグ一括修正バッチ第5弾が触れる内部契約（260801-open-bug-batch-5、履歴、observed `c49e385ac`）

- 判断: 公開 CLI 契約の変更なし。触れるのは内部契約4点 — mirror receipt 遷移（reducer の complete/mark-pending 受理元）、state scaffold のフィールド集合（Construction Autonomy Mode 追加）、report の checkbox ガード挙動（#1849 裁定依存）、metrics publication の problems 分類（一過性 I/O と所有権証拠異常の分離）。テスト pin の明示改訂を伴うものは要件段で宣言する（`cid:reverse-engineering:c1-pinned-behavior-ruling`）。

## OTel メタ情報スキーマ実装が触れる内部契約（260801-otel-meta-schema、履歴、observed `9c8df859e`）

本節の file:line はすべて observed `9c8df859e` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### bootstrap の公開契約

```
ensureOtelBootstrap(projectDir: string): void      // bootstrap.ts:84
ensureTracerBootstrap(projectDir: string): void    // bootstrap.ts:108
resetOtelBootstrapForTests(): void                 // bootstrap.ts:120
```

不変条件（`bootstrap.ts:41-47` `assertSameProject`）: 1プロセス = 1ワークスペース。別 projectDir での再 bootstrap は throw。冪等性の判定源は **API シングルトンへの問い合わせ**（`registeredLoggerProjectDir()` / `registeredTracerProjectDir()`）であり、モジュール内のシャドウフラグではない（`:34-39` の設計コメントが理由を明記 — 「a process whose provider was dropped gets a fresh registration instead of a memo saying it is still standing」）。resource を通す拡張はこの2契約の引数面に現れる。

### プロバイダ登録の契約（3面で同型）

```
registerLoggerProvider({ projectDir, auditExporter, logExporter, redaction? }): void  // logger-provider.ts:154
registerTracerProvider({ projectDir, spanExporter }): void                           // tracer-provider.ts:203
registerMeterProvider({ metricExporter }): void                                      // meter-provider.ts:112
```

- 二重登録は不変条件違反として throw（NFR-3）: `tracer-provider.ts:204-206`、`meter-provider.ts:113-115`
- **非対称が2点ある**。(1) logger / tracer は `projectDir` を受け取り記録する（`registeredTracerProjectDir()`、`:213-215`）が、**meter は projectDir を受け取らない** — bootstrap から metrics arm を生やす際、workspace 一致検査を成立させるには署名の対称化が要る。(2) **logger だけが `redaction?: RedactionPolicy` の注入スロットを持つ**（`logger-provider.ts:154`）— register オプションに横断的ポリシーを差す先例として、resource の注入もこの形（オプションオブジェクトへの追加フィールド）と整合する
- 取得側: `getAmadeusTracer(name = "amadeus")`（`:217-222`）/ `getAmadeusMeter(name = "amadeus")`（`meter-provider.ts:121`）— いずれも未登録時 throw

### Span の契約

```
startActiveSpan(name, [options], [ctx], fn)   // tracer-provider.ts:168
```

**コールバックはスパンを自動 end しない**（FR-TRC-2, #1678）。呼び出し側が `finally { span.end(); }` で終わらせる契約で、`context.test.ts` が pin している（`:8-10` のコメント）。#1868 §5 の subagent lifetime スパンを親プロセスで組み立てる場合、start と end が別 hook（PreToolUse / SubagentStop）= **別プロセス**に分かれるため、この契約はそのままでは使えない — スパンオブジェクトの跨プロセス保持は不可能で、started/completed の2イベントからの後付け構成か、開始時刻の永続化+完了時の遡及生成のいずれかになる。

親 span 解決の順序（`:64-77`）: `trace.getSpan(parentContext)` → `processParentSpanContext()`（env carrier または復元済み intent anchor）→ なければ新規 trace。

```
recordException(exception: Exception, time?: TimeInput): void   // tracer-provider.ts:145
```

現行実装は registry def の durability を実行時検査し（`:151-154`）、`exception.message` のみを addEvent（`:156`）。`Exception` 型は `Error` またはそれ以外を許すが、実装は `exception instanceof Error ? exception.message : String(exception)`（`:155`）で message へ潰す。#1868 §4 の `err.name` / `err.stack` はこの分岐で取り出せる。

```
addEvent(name, attributesOrStartTime?, startTime?): this        // tracer-provider.ts:98
```

引数多重定義を手で判別（`:99-102`）。**フィルタを一切通さず生の bag を push する**（`:103`）— write-time redaction は呼び出し側の責任。

### redaction の公開契約

```
redactAttributes(attrs, policy = DEFAULT_REDACTION_POLICY): Record<string, unknown>   // redaction.ts:120
scrubCredentials(value, patterns = CREDENTIAL_SCRUB_PATTERNS): unknown                // redaction.ts:95
scanForCredentials(text, patterns): string[]                                          // redaction.ts:135
```

- `redactAttributes` は **bag 単位・default-deny・入力非破壊・冪等**（`:116-119` が2層合成の安全性を明記）。単一値向けの API は無い
- `scrubCredentials` は文字列・配列・オブジェクトを再帰走査するので、**stacktrace の複数行文字列にもそのまま効く**
- `DEFAULT_REDACTION_POLICY`（`:73-91`）の safe-key = `REGISTRY_ATTRIBUTE_KEYS`（registry の required∪optional から `Command` 除外、`:65-71`）+ 8 個の追加キー（`Options` / `Rationale` / `Note` / `Event` / `Outcome` / `ExitCode` / `TraceId` / `SpanId`）。opt-in tier は `["Command"]` のみ
- `CREDENTIAL_SCRUB_PATTERNS`（`:35-45`）6 パターン: `aws-access-key` / `github-token` / `api-token` / `bearer-token` / `private-key-block` / `credential-assignment`。**パス系パターンは無い**
- `scanForCredentials` は VER-2 credential-free ゲートが同じ語彙で走査する（`:20-22`、一語彙一源）

### レジストリの公開契約

```
getEventDef(name: RegisteredEventName): EventDef            // event-registry.ts:855
getEventDefByAuditEvent(auditEvent: string): EventDef       // event-registry.ts:866
canonicalAuditEvents(): string[]                            // event-registry.ts:846
assertRegistryConsistent(events?, expectedCanonical?): void // event-registry.ts:883
EXPECTED_CANONICAL_COUNT = 78                               // event-registry.ts:77
EXCEPTION_SPAN_EVENT_NAME = "exception"                     // event-registry.ts:83
```

未登録名・未マップ eventType はいずれも **throw**（fail-closed）。`getEventDef` の引数型が `RegisteredEventName` union（`:842`、テーブルから機械導出）なので、型付き呼び出し側はコンパイル時に排除される。

`EventDef` の形: `{ name, auditEvent, durability, category, requiredAttributes, optionalAttributes, schemaVersion }`。

### 監査 export の accept-set 契約

`audit-log-exporter.ts:130-176` の順序が厳密:

1. `getEventDef(record.eventName)` — 未登録は throw
2. `schemaVersion !== JOURNAL_SCHEMA_VERSION_V2` → throw（BR-13）
3. `def.durability !== "canonical"` → throw（FR-EXP-4、telemetry は監査へ載らない）
4. required 属性の欠落 → throw（BR-10）
5. `redactAttributes` + `Event` 属性付与（`:157`）
6. dry-run encode（`serializeJournalEntryV2`、I/O 前に codec 違反を検出）
7. append。失敗のみ fatal latch を立てる（`:171`）

**不変条件違反（1-4, 6）は latch を触らず throw、書込み失敗（7）だけが latch を立てる** — この分離が #1868 で属性を足すときの失敗モード設計の前提になる。

### ハーネス検出の契約

```
harnessDir(): string                 // amadeus-harness.ts:105
detectHarnessType(): HarnessType     // amadeus-harness.ts:109
rulesSubdir(): string                // amadeus-harness.ts:135
```

`HarnessType` = `"claude-code" | "codex" | "cursor" | "opencode" | "kiro" | "kimi" | "unknown" | "manual"`（`:5-13`）。`detectHarnessType()` の優先順: `AMADEUS_HARNESS_TYPE` env（不正値は `"unknown"`）→ `CLAUDECODE === "1"` → harness dir 解決（fallback 到達時は `"unknown"`）。**`amadeus.harness` の値域はこの union がそのまま使える。**

`rulesSubdir()`（`:135-141`）が `shippedRulesSubdir()` 経由で `tools/data/harness.json` を読む（`:121-133`）— packager 生成データを core が読む既存経路の唯一の実例。

## perf 分離が触れる内部契約（260731-perf-ci-separation、履歴、observed `da51af375`）

本節の file:line はすべて observed `da51af375` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### ランナー CLI 契約（変更に最も慎重を要する面）

`tests/run-tests.ts` の外形は `tests/smoke/t05-run-tests-parallel.test.ts` が byte 単位でピンしている: 不正な `--parallel` → exit 2 と定型メッセージ、smoke バナーが `(parallel=N)` を省くこと、直列と `-P 4` のサマリ同値性、planted-failure の伝播。`PER_TEST_TIMEOUT = 120000` `:163`。**新フラグ・新 tier を足す場合もこれらの挙動を byte 一致で保つ必要がある**。

新フラグを足す場合の接続点は3つ: `ParsedArgs` フィールド定義、`parseArgs` の `case` 追加（`--parallel` の検証様式は `:233` 以降）、そして除外集合の受け渡し（integration は `:1161-1166` の `runFilesPartitioned` 呼び出しが既存の口）。

| 内部関数 | 行 | 契約 | 改訂の要否 |
| --- | --- | --- | --- |
| `levelFiles(level, excludes)` | `:839-850` | ディレクトリ列挙 + **basename** 除外集合 | 改訂不要。既存の口をそのまま使える |
| `runFilesPartitioned(level, effectiveParallel, collector, excludes)` | `:875-880` | `excludes` を受け取る唯一の実行経路 | 改訂不要 |
| `runTier(level, label, collector)` | `:900-909` | **`excludes` を受け取らない** | smoke / unit を除外対象にするならシグネチャ変更が必要 |
| `reportDynamicSizes(collector)` | `:952`、出力 `:984-990` | 実行したファイルのみから drift を報告。`printSummary` の try/catch 内にあり **exit code に影響しない**（advisory） | 改訂不要だが副作用あり（下記） |

### 判定述語の契約（分離後もブロッキング側に残すべき面）

- `tests/lib/latency-median-budget-gate.ts` — `exceedsMedianLatencyBudget` / `median`。消費側は t258 `:524-525` と t257 `:255-256`。落ちる実証は `tests/unit/latency-median-budget-gate.test.ts`（純・合成）。
- `tests/lib/plugin-discovery-overhead-gate.ts` — `exceedsDiscoveryOverhead`。消費側は `t-plugin-stage-discovery-performance.integration.test.ts:213` 近傍。落ちる実証は `tests/unit/plugin-discovery-overhead-gate.test.ts`。

**述語の検証（純・安価）と計測の実行（実時間・負荷感受）は分離可能な2契約である** — 前者を日常 CI に残し後者だけを別面へ移せば、ゲートの落ちる実証は失われない。

### CI 側の契約

- `ci-success`（`ci.yml:648`、name `CI Success`）の `needs` = `:651-659` の8件。この集合が PR ブロックの唯一の定義であり、GitHub ruleset `18843917`（name `main`）の required status check は `CI Success` のみ（2026-07-31 実測）。**新 job を PR ブロック対象にしたい／したくない判断は、この `needs` への出入りだけで決まる**。
- `scripts/detect-ci-changes.sh` の3分類（`:9-32`）: `*.ts` / `tests/*` は `full=true` かつ `coverage=true`。`packages/framework/*` などは `drift=true`。新 workflow を足す場合、`.github/workflows/ci.yml` 自身は `full` にも `coverage` にも該当するが、**他の workflow ファイルはどの分類にも該当しない**。

### 変更の無い契約

区間内で `.github/`、`scripts/`、`package.json`、`tests/run-tests.ts` の変更はゼロ。区間で新設された唯一の本番契約は `mirrorSnapshotStatus(snapshot)`（`packages/framework/core/tools/amadeus-mirror-presentation.ts:250-252`）であり、本 intent とは無関係である。


## オープンバグ4件が触れる内部契約（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）

本節の file:line はすべて observed `6e7a9d701` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 触れる契約の一覧

| Issue | 契約 | 種別 | 改訂の要否 |
| --- | --- | --- | --- |
| #1811 | supervisor の終了契約（run record 消滅で自律終了） | 本番契約（fixture 側が写せていない） | 本番は**改訂不要**。fixture が契約へ寄る |
| #1800 | subprocess 終了チャネルの3分類（`exit-status` / `signal` / `spawn-error`） | テスト内契約 | **改訂不要**。失敗系へ適用を延長するだけ |
| #1797 | corpus スケーリングの比 `2.5` 契約 | テスト内契約 | 数値の改訂可否は負荷スイープ実測から導く |
| #1816 | mirror Issue body の描画契約（`## Status` が snapshot 逐語） | 本番契約（ユーザー可視） | **改訂を要する**（要件段で裁定） |

### #1811 — supervisor の終了契約

本番の契約は「run record が生きている間だけ supervise する」である。

- `packages/framework/core/tools/team-up-codex-safety-wait.ts:643` verbatim: `while (await runRecordIsActive(runRecord, run, session)) {`
- `runRecordIsActive`（宣言 `:561`）は run record 配下の `session` / `runtime` / `status` 3ファイルを読み、読取失敗時は `:580-582` の `catch` で `false` を返す

**fixture 側はこの契約を写していない** — `tests/integration/t-team-up-codex-resume.serial.test.ts:218` の SIGTERM ハンドラのみが終了経路であり、`:219` の `setInterval` が event loop を無期限に保持する。

**PID 追跡の契約**は既に存在する: `packages/framework/core/tools/team-up.sh:508` verbatim: `printf '%s\n' "$pid" >"$member_record/safety-wait.pid"`。掃引はこの契約に乗れる。ただし `afterEach`（`:39-41`）の `rmSync` が同ディレクトリを消すため**掃引は `rmSync` より前**という順序契約が加わる。

fixture が本番契約を写す場合（案 A）、述語は**「run record ディレクトリの実在のみ」に弱める**のが安全である。本番の3ファイル読取まで写すと fixture が本番の内部構造へ過剰結合する。

### #1800 — subprocess 終了チャネルの3分類契約

`tests/integration/t224-upstream-v2-migration-cli.test.ts` は終了状態を `-1` センチネルで正規化する契約を持つ。

- `:170` / `:210` verbatim: `status: result.status ?? -1,`

`-1` は「exit status を持たない終了」を意味し、`signal` と `error` の組で3分類へ解決される。この分類は `:311-313` の `test.each` で契約として固定されている。

- `:311` verbatim: `["exit-status", { status: 1, signal: null, error: null }],`
- `:312` verbatim: `["signal", { status: -1, signal: "SIGTERM" as NodeJS.Signals, error: null }],`
- `:313` verbatim: `["spawn-error", { status: -1, signal: null, error: "spawn EAGAIN" }],`

成功系の診断ヘルパー `expectSuccessfulMigration`（宣言 `:218`）はこの分類を消費して多行メッセージを組む（`:225-238`）。

**契約の改訂は不要である** — `:1411` を同型ヘルパー経由へ寄せるだけで既存契約の適用範囲が失敗系へ延びる。新機構の導入ではなく既存様式への合流である。

### #1797 — corpus スケーリングの比契約

`tests/integration/t259-guard-corpus.test.ts` は「入力2倍で時間・RSS が 2.5倍以内」を契約として持つ。

- `:108` verbatim: `expect(twoMedianMs / oneMedianMs).toBeLessThanOrEqual(2.5);`
- `:109` verbatim: `expect(rssMultiplier).toBeLessThanOrEqual(2.5);`

閾値 `2.5` は初出（`2e157d7fe`、#1424）以来不変。median 化（`median` 宣言 `:46`）は t258 裁定の反映として適用済みである。

**契約の破れは数値ではなく計測設計にある** — `measure(1)`（`:101`）と `measure(2)`（`:102`）が逐次に別プロセスを spawn するため、両者は異なる時間窓で測られる。交互計測（案 (i)）を採る場合、契約の意味論は変わらず**計測手続きだけが変わる**。

閾値そのものを改訂する場合は、負荷スイープの実測から数値を導出する（`cid:code-generation:c1-benchmark-baseline-correlation-verify`）。要件段では数値を固定せず「実測で決める」と書く。

### #1816 — mirror Issue body の描画契約（ユーザー可視）

body の描画契約は `packages/framework/core/tools/amadeus-mirror-presentation.ts` の `renderMirrorIssueContent`（宣言 `:239`）が持つ。body 組立は `:245-267` で、セクション順は `## Intent UUID` / `## Summary` / `## Phase` / `## Stage` / `## Status` / `## Updated At` / `## Mirror Marker` である。

- `:259-260` verbatim: `"## Status",` / `snapshot.status,`

**`snapshot.status` は逐語で描画される。** completion 境界では lifecycle 側の assert が `Running` を強制するため（`amadeus-mirror-lifecycle.ts:311-312` verbatim: `const completionMismatch = completion?.status === "pending" &&` / `(status !== "Running" || completion.stage !== currentStage);`）、最終 body は構造的に `Running` になる。

**close 側は body 契約を一切持たない。** `packages/framework/core/tools/amadeus-mirror-executor.ts:1156-1159` の分岐で、`sync` は `editIssue(permit, context.issueContent.body)`、`close` は `closeIssue(permit)` と body を渡さない。収束判定も同じ非対称である（`:1038-1041` — sync = body 一致、close = `state === "CLOSED"`）。

**改訂設計（案 (a)）の契約面**:

| 項目 | 内容 |
| --- | --- |
| 導出キー | `snapshot.completionInstance` の**存在**。boundary をキーにすると `renderMirrorStatus`（`:298`）が組む drift 診断が close 後に恒久的な偽 drift を報告する |
| `## Status` の終端値 | 要件段で確定 |
| `## Stage` / `## Phase` の終端化 | 要件段の確定事項（`:253-257`） |
| lifecycle assert（`:311-316`） | **改訂不要** — record 断面の整合検査であり表示層の関心ではない |

`completionInstance` は presentation で未消費である（同ファイル内 `grep` 0ヒット）。型は `amadeus-mirror-types.ts:516` / `:527`、codec は `amadeus-mirror-state-codec.ts:567` / `:763` / `:770` / `:775`、lifecycle での供給は `:339`。

**テスト契約への影響**:

| ファイル | 契約 | 改訂 |
| --- | --- | --- |
| `tests/unit/t281-amadeus-mirror-presentation.test.ts` | body の逐語 assert（`:52` `## Stage` / `:55` `## Status`） | 既存2ケースは `completionInstance` を持たないため**改訂不要**。新規ケース追加のみ |
| `tests/unit/t232-amadeus-mirror.test.ts` | body の `## Status` assert（`:35`） | 影響確認の対象 |
| `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts` | close 順序の契約（`:262` `a prepared in-flight completion reaches Done and close before registry seal`） | **改訂不要**（body assert を持たない） |

**仕様裁定マター**: 「record の main 着地前に close する」挙動は PR #1689 の設計帰結であり `t361:262` で契約固定されている。本 intent の実装スコープは**表示層に限定する**旨を要件段で申告する（`cid:reverse-engineering:c1-pinned-behavior-ruling`）。

### 本区間で変化した契約（本 intent の患部外）

| 契約 | 変化 | 由来 |
| --- | --- | --- |
| 選挙 ballot の格納契約 | collecting 中は `pending/<voter>.json` へ voter 単位で隔離し、tally 時に ledger へ統合する。`pendingDir` `:113` / `integratePending` `:205`。pending lane は git 非追跡（`.gitignore` + 7ハーネス `dot-gitignore`） | #1773 修正 |
| 選挙配布ビューのキー集合 | `question` と選択肢 `description` を搬送するよう拡張（`amadeus-election-model.ts` `+36/−9`）。`t234-election-model.test.ts` `+66/−2` で契約を改訂 | #1772 修正 |
| mirror boundary report の create 受理契約 | 「Issue が存在するなら拒否」から「成功 create receipt が存在すれば受理」へ反転。`succeededMirrorCreateExists`（`amadeus-mirror-state-codec.ts:1731`）を `amadeus-orchestrate.ts:4249` で `createRan` として消費 | #1752 修正 |
| release workflow のジョブ契約 | 再実行可能なジョブへ分割（`.github/workflows/release.yml` `+68/−22`） | #1799 |

## オープンバグ3件が触れる内部契約（260730-open-bug-batch-3、履歴、observed `3f73823b1`）

本節の file:line はすべて observed `3f73823b1` 時点。**公開 CLI verb の契約変化は区間内になし**（`amadeus-finding.ts` の新 CLI 1本は本 intent の患部外の新機能）。ただし3件はいずれも**修正時に内部契約を変える**。

### 選挙モデルの型契約（#1772）

| 契約 | 現行の実装事実 | 破断 |
| --- | --- | --- |
| 選択肢の表現 | `amadeus-election-model.ts:48` verbatim: `export type Choice = { internalNo: number; label: string };` | 説明（description）を運ぶフィールドが型に存在しない |
| parse の受理方針 | `parseChoices`（`:73`）はホワイトリスト再構成。`:79` で `internalNo` / `label` の型のみ検査し、`:80` で2フィールドだけを push。未知フィールドは **exit 0 のまま無音 drop**（fail-open） | 起草者が `description` を書いても失われ、警告も出ない |
| 配布ビューのキー集合 | `DistributionView`（`:306-310`）= `electionId` / `voter` / `ordered`。`ordered` の要素は `{ displayNo, internalNo, label }` | `question` が無く、投票者は設問文を配布物から得られない |
| キー集合の固定 | 3重固定 — 型（`:306-310`）・設計コメント（`:304-305`、`BR-2 pins the key set`）・テスト（`tests/unit/t234-election-model.test.ts:190` / `:192`） | 契約変更には**要件段での仕様裁定とテスト契約の明示改訂**が要る（`cid:reverse-engineering:c1-pinned-behavior-ruling`） |
| tally 側の選択肢表現 | `ChoiceCount`（`:427`）= `{ internalNo, label, count }`。構築 `:488`、消費 `:493-494` / `:500` | `Choice` を拡張する場合、tally 側と record render も同時に伝播対象（`cid:functional-design:c3`） |
| 入力契約 | `SKILL.md:18` verbatim: `選挙定義 JSON(electionId・kind・question・choices・voters)を受け取り、次を実行する:` | **question は入力契約に既に存在する** — 欠けているのは入力ではなく配布 |

**同根の write⇔read 非対称（`cid:requirements-analysis:symmetric-pair-review` の棚卸し対象）**: `OriginalBallot` の `reservation`（`:135`）/ `rationale`（`:136`）は書き込まれるが配布ビューには現れない。空 `label` の通過、未知フィールドの無音 drop も同じ parse 方針の帰結である。

### 選挙ストアの格納契約（#1773）

| 契約 | 現行の実装事実 | 破断 |
| --- | --- | --- |
| 票の格納 | `amadeus-election-store.ts:464` で `LedgerFile` を組み `:465` で `ledger.json` へ書込。票オブジェクトは無加工 | 未開票中の全票本文（`goa` / `reservation` / `rationale`）が単一の共有ファイルに平文で載る |
| blind の適用時点 | `materialize`（`:500`、コメント `:498` verbatim: `// Materialize the full ballot set at tally time (blind lift) and fix the`）は **tally 時のみ** | collecting 中は blind lift の保護対象外 |
| 投票済み者の可視 | `timeline.json` へ `kind: "ballot"`（`:468`）と `voter`（`:472`）を追記 | 誰が投票済みかが collecting 中に可視（票内容とは別レイヤ） |
| version control 面 | 選挙ディレクトリは非 ignore（`git check-ignore` exit 1）。tracked な `ledger.json` は 183件 | `git status` / `git diff` が第2の露出面になる |
| 読取の運用契約 | `SKILL.md:51` — voter subagent は配布ビューを読んで投票する。ディレクトリ自体への到達を妨げる機構は無い | 配布面は健全だが格納面から迂回できる |

**健全な面（修正対象外）**: 設計された配布面（`status` / `vote` 出力 / ShortNotification）と blind lift の設計そのもの。破れているのは格納設計と配置の2点のみである。

### mirror boundary report の受理契約（#1752）

| 契約 | 現行の実装事実 | 破断 |
| --- | --- | --- |
| 受理判定のタイミング | `amadeus-orchestrate.ts:4241-4242` が **report 実行時点**の state を再読して `expectedPhase` / `hasMirrorIssue` を導出 | offer 時点の提示内容と report 時点の state が乖離する |
| create の拒否条件 | `:4252-4256` の論理和のうち `:4255` verbatim: `(answer === "create" && hasMirrorIssue)` | ask の指示（`:519-529` で「先に create を実行せよ」）に従うと、自分の成功が拒否条件になる |
| answer 種別の対称性 | `sync` / `skip` には対応する state 照合が**無い** | 片側実装（`cid:requirements-analysis:symmetric-pair-review`） |
| 初回 create boundary（#1791 で新設） | `:486-500`。`:487` で `initialCreateIsOutstanding` 判定、`:488` verbatim: `if (mode !== "auto" && boundary.initialCreate !== "pending") return false;` | **auto モード優先**のため prompt モードは従来 ask 経路へ落ちる。#1752 の再現経路は温存 |
| 既習様式 | `amadeus-mirror-coordinator.ts` の `expectedPrompt` 照合（`:320` / `:560` / `:622` / `:742-746`） | ask 時 binding の永続化はこの様式で実装可能（修正候補 (b)） |

### 区間で追加された内部契約（本 intent の患部外）

| 契約 | 所在 | 性質 |
| --- | --- | --- |
| 階層設定キー `auto-file-findings` | `amadeus-layered-config.ts:51`（`AUTO_FILE_FINDINGS_KEY`）、`:79-81` の union | `auto-mirror` と同一のモード語彙・既定値（`:6` のコメントが明記）。`auto-solo-election` は boolean 単独で既定 `false`（`:7`） |
| boundary kind `intent-initialized` | `amadeus-mirror-types.ts:28` verbatim: `\| { kind: "intent-initialized"; instance: string }` | policy は `amadeus-mirror-policy.ts:65` verbatim: `"intent-initialized": ["create", "sync"],` |
| state フィールド / サブコマンド | `amadeus-state.ts:320`（`MIRROR_INITIAL_CREATE_FIELD`）、`:913`（`case "mirror-initial-create":`）、usage `:1002` / `:1161` | 引数は `<pending\|completed> --from <absent\|pending\|completed>`（`:1161` の usage 文字列） |
| sensor 発火の exact-path allowlist | `amadeus-sensor-invocation.ts`（新規）、消費は `hooks/amadeus-sensor-fire.ts:27` の import | 前 intent #1742 の `matches` 単独判定に対する構造的解決 |
| degrade unit 解決 | `amadeus-orchestrate.ts:3054`（`unitDirsUnderConstruction`）、呼び出し `:3264` | 前 intent #1711 / 本区間 #1774。`directive.unit` 搬送と非一意 fail-closed |

**本 intent への含意**: `self-fix` スコープは units-generation を SKIP するため degrade 経路を自ら通る。#1774 の着地により conductor の手動 directive 解決は不要になっている（`cid:build-and-test:c1-degrade-interim-retired`）。手動解決が再び必要になった場合は退行として扱い Issue 起票する。

## オープンバグ5件が触れる内部契約（260730-open-bug-batch-2、履歴、observed `c42ef4d77`）

**判断: 現時点で実質更新なし（修正方式の裁定後に要再訪）。** 区間 `8b8016f62..c42ef4d77` で公開 CLI verb・型・戻り値の契約変化はない。ただし5件のうち3件は**修正時に内部契約を変える可能性がある** — #1750 は `MirrorBoundary` 型への新種別追加と `MIRROR_BOUNDARY_PHASES`（`amadeus-state.ts:221`）の receipt 表現、#1742 は sensor-fire hook の対象決定契約（`matches` 単独 → `matches` × 宣言 produces）、#1734 は `scopeGridInSync` / `mergeScopeGrid`（`scripts/promote-self.ts:130-142` / `:147-160`）の write⇔check 対称性。いずれも修正方式が未裁定のため、契約面の記述は Requirements / Functional Design での裁定後に更新する。

## SKILL/reviewer 2件が修復する内部契約（260730-skill-reviewer-fixes、履歴、observed `278d61d8e`）

測定 ref: すべて observed `278d61d8e`。

### CLI verb 所有権の契約（#1736）

| 契約 | 現行の実装事実 | 破断 |
| --- | --- | --- |
| `next` verb の所有 | `amadeus-orchestrate.ts` が単独所有。`amadeus-utility.ts:6088` の `switch (subcommand)` に `case "next"` は **0件**（`grep -c` 実測）、`:6182` の `default:` → `die()` で Usage を出して終了する。その Usage 文字列の verb 一覧にも `next` は現れない | harness SKILL.md（13ファイル）の new-work CONFIRM 行が `amadeus-utility.ts next --new-intent` を指示する。conductor が字義どおり実行すると未知 verb として die する |
| `--new-intent` フラグ | `amadeus-orchestrate.ts:818` で型宣言、`:877-878` でパース、`:1995` で `MIGRATION_WORKFLOW_OPTIONS` に許可、`:2405` `if (flags.newIntent) {` → `:2412` `emit(birthPrintDirective(flags.scope ?? scope, flags, flags.intent));` で fresh-start と同一の birth directive を発行 | 契約自体は健全。誤りは呼び出し先ツール名のみ |
| scope 解決の優先順 | `:2412` は `flags.scope ?? scope` — 明示 `--scope` を優先し、稼働中 intent の state scope を勝たせない（`:2406-2411` のコメントが根拠を明記） | 変化なし |

### reviewer 読取スコープの契約（#1711）

| 契約 | 現行の実装事実 | 破断 |
| --- | --- | --- |
| directive の `unit` フィールド | per-unit 経路のみ設定（`amadeus-orchestrate.ts:3086` `directive.unit = lastUnit;` / `:3110` `directive.unit = pickUnit;`）。degrade 経路（`:3050-3057` → `emitRunStageForSlug` `:2888-2894`）は **設定しない** | reviewer の unit 帰属チェック（`amadeus-reviewer.ts:76-78`）が発火せず、`:87` の返り値も unit なし形になる |
| produces パスの解決済み前提 | `amadeus-reviewer-runtime.ts:224-246`（`scopeForDirective`）は `directive.produces` を解決済みパスとして受け、`onDisk` 判定つきで `reviewerReadScope` へ渡す（`:232-244`） | degrade 経路では `{unit-name}` プレースホルダ入りパスが渡り、`amadeus-reviewer.ts:74` が `required review artifact is missing: <path>` を throw する |
| consumes の placeholder exempt | `amadeus-orchestrate.ts:1771-1774` が `if (c.path.includes(UNIT_NAME_PLACEHOLDER)) { present.push(c.path); continue; }` で実在検査を明示除外（コメント `:1759-1760`） | **produces 側に対応する exempt が存在しない**（非対称） |
| reviewer への directive 受け渡し | `stage-protocol.md:898`「Before spawning the reviewer, pass the **unchanged** current `run-stage` directive JSON on stdin」 | 現行の運用回避（conductor が実 unit 名へ解決した JSON を渡す）はこの「unchanged」規定からの逸脱 |
| エラーの外部形状 | `amadeus-reviewer-runtime.ts:623-641` の `runReviewerCommand` が throw を `:637-639` で捕捉し stderr 1行 + `exitCode = 1` へ変換 | conductor からは `exit 1` + missing artifact メッセージとして観測される（project.md `cid:code-generation:degrade-scope-unit-dir-layout` 追補の実測と整合） |

### 区間で追加された内部契約（本 intent の患部外）

| 契約 | 所在 |
| --- | --- |
| `MainConductorAuthorization` = `\| { kind: "authorized" } \| { kind: "denied"; role: string }` | `amadeus-caller-authorization.ts:27-29`。消費側は `amadeus-orchestrate.ts:2108` と `amadeus-state.ts:828` / `:831` の2箇所のみ |
| `WorkflowCompletionPreparation` = `Readonly<{ instance: string; stage: string; status: "pending" \| "completed" }>` | `amadeus-workflow-completion.ts:9-13`。完了を2相化しクラッシュ回復を可能にする |

## Open bug 6件が修復する内部契約（260729-open-bug-batch、履歴、observed `22ee27dbe`）

Amadeus に常駐 REST/GraphQL service や database API はない。公開境界は短命 CLI、Shell command、directive JSON、監査 journal、生成ファイルである。本 intent は原則として verb・flag・schema を追加せず、既存契約の成功判定と診断 envelope を修復する。

| Issue | 現行契約 | 欠落 | 修正後に必要な契約 |
| --- | --- | --- | --- |
| [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667) | Bun test case 120秒、内部 `spawnSync` 180秒 | 外側の期限が内側より短く、child の完了結果を観測できない | outer timeout が verifier timeout を包含し、timeout 時も child 診断を返す |
| [#1664](https://github.com/amadeus-dlc/amadeus/issues/1664) | `migrateWithTool` は status/stdout/stderr を返す | assertion が status だけを表示し診断 payload を捨てる | 非0終了時に stdout/stderr/exit/timeout を同一 failure envelope で提示する |
| [#1663](https://github.com/amadeus-dlc/amadeus/issues/1663) | checkout worker は exit status と stderr を持つ | 親 Shell が個別 status を保持せず、registry + record の最終走査へ圧縮 | member ごとの status/log を収集し、集約失敗に member identity を保存する |
| [#1662](https://github.com/amadeus-dlc/amadeus/issues/1662) | `git diff <base>...HEAD` と LCOV を突合 | diff は committed HEAD、LCOV は dirty working tree を含みうる | 両入力へ同じ source snapshot identity を結び、dirty 状態を拒否または明示取得する |
| [#1336](https://github.com/amadeus-dlc/amadeus/issues/1336) | supervisor PID を保存し、50ms後に `kill -0` / `ps` で確認 | process alive と role-ready を同一視 | supervisor が初期化完了を readiness receipt として返し、親が期限付きで待つ |
| [#1607](https://github.com/amadeus-dlc/amadeus/issues/1607) | final `report` → `complete-workflow` → `done`、次の `next` で completion boundary | registry complete と audit seal 後は mirror receipt を append できない | completion boundary の結果を final commit に含め、再試行 token と同一 completion instance を維持する |

### CLI・journal 互換性

- #1667 / #1664 / #1663 / #1662 / #1336 はテスト・内部 Shell/TypeScript seam の修正であり、既存 CLI の動詞集合と exit code の意味を変更しない。
- #1607 は `report` / `next` の順序と terminal `done` の意味に関わる。新しい公開 verb を足す前に、既存 `mirror-boundary completion` と `complete-workflow` のどちらが transaction coordinator を所有するかを要件で裁定する。
- audit journal の post-complete seal、mirror operation receipt の idempotency、Intent cursor の ownership は後方互換シムで二重化せず、単一の正準完了経路へ統合する。
- 進行中の OTel [#1679](https://github.com/amadeus-dlc/amadeus/issues/1679) は journal entry と state/audit projection を消費するため、#1607 と #1664 の契約確定前にその Construction を重ねない。

## OTel/observability 面の公開契約（260729-otel-upstream、履歴、observed `22ee27dbe`）

区間内で focus 面の公開契約に変更はない（`amadeus-observability.ts` の `registered` はモジュール内部型の未使用フィールドで export 面に現れない）。#1672 の置換が触る現行契約を以下に固定する（いずれも `grep -n "^export"` 実測、測定 ref: observed `22ee27dbe`）。

**(1) Journal codec（`amadeus-journal.ts`、内部 wire 契約）**: `JOURNAL_SCHEMA_VERSION = 1`（reader は `<= current` を受理し、超過は `JournalCodecError`）、`JournalEntry`（`schemaVersion` / `seq` / `cloneId` / `intentId` / `timestamp` / `heading` / `event: string | null`。canonical レコードは `fields`、raw レコード（`event: null`）は `rawBody`、converter 専用 escape hatch の `opaque`）、`journalEntryId`（`intentId:cloneId:seq` のべき等キー）、`forkLineageCloneId`（md5 先頭 12 hex の派生 clone token）、`serializeJournalEntry` / `parseJournalLine` / `splitJournalLines` / `parseJournalShard`。1 レコード = 1 物理行の不変条件を codec が強制し（値中の raw 改行は throw）、key 順固定で同一 entry は常に byte-identical に serialize される。フィールド値の CR/LF は append 側（`escapeAuditValue`）で `\n` リテラル化済みという前提で、codec は再エスケープしない。

**(2) Observability seam（`amadeus-observability.ts`）**: 設定契約は layered `config.json`（global → space → intent）の `observability` 値（`enabled: boolean` 必須、`otlp.endpoint?`、`local.enabled?`、`redactionOptIn?: string[]`）で、narrowest present が全体を上書きし、いずれかの層が malformed なら DISABLED に落ちる。export は `ObservabilityConfig` / `resolveObservabilityConfig` / `observabilityEnabled` / `resetObservabilityConfigCache`（テスト seam）/ `TELEMETRY_DIR`（`.amadeus-otel`）/ `telemetryDir` / `TelemetryEvent`（`v: 1`、`kind: "process" | "operation" | "subprocess"`）/ `appendTelemetryEvent` / `initProcessObservability` / `flushProcessObservation` / `observe<T>` / `observeSubprocess<T>`。`meta` は default-deny の `META_SAFE_KEYS`（`stage` / `phase` / `event` / `tool` / `outcome` / `exitCode` / `command`）+ `redactionOptIn` のみ通過する。`initProcessObservability` は first-caller-wins、`flushProcessObservation` は再呼び出し no-op（`t357` が回帰境界）。全 API は fail-open で、buffer 書込失敗は呼び出し側へ throw しない。

**(3) OTLP projector（`amadeus-otel-projector.ts`）**: `traceIdFor` / `spanIdFor`（sha256 による決定論的 ID）、`buildSpans`（intent → phase → stage → process → operation/subprocess の 5 層 hierarchy、parenting は時間包含）、`buildOtlpTraces` / `buildOtlpMetrics`、`runExport`、`parseCliArgs`（`{ projectDir?, force }`）、`OtlpSignalResult = "posted" | "failed" | "skipped"`、`ExportSummary`。消費側は CLI 起動点と `hooks/amadeus-session-end.ts` の piggyback で、Core は import しない。`OTEL_EXPORTER_OTLP_ENDPOINT` env が config 値に優先し、export 失敗は exit code を緑のまま維持する（fail-open 端到端）。

**(4) Journal converter（`amadeus-journal-convert.ts`）**: `convertShardText` / `assertLosslessRender`（byte-exact round-trip 不成立で `JournalConvertError`、部分出力を残さない）/ `parseLegacyBlock` / `cloneIdFromShardName` / `intentIdFromShardPath` / `handleConvert`。CLI 契約は `bun tools/amadeus-journal-convert.ts <shard.md> [--allow-unmerged-forks]` で、doctor の fix-hint が案内する正規手順（convert → 生成 .jsonl 検証 → .md 削除）と一致する。

**(5) 区間の他面（focus 外）**: `amadeus/config.json` に `mirror-projects` キー（例 `[{ "project": "amadeus-dlc/5" }]`）が新設された。`package.json` description のインストール導線は `bunx @amadeus-dlc/setup install` 表記へ更新。直後の `260728-slop-cleanup` 断面は履歴として保持する。

## Slop cleanup の API 影響（260728-slop-cleanup、履歴、observed `ca8ff0af4`）

外部 API、CLI 動詞、exit code、JSON/Markdown wire format、関数シグネチャに変更はない。`amadeus-journal.ts` はコメントのみの更新、`ProcessObservation.registered` はモジュール内部の未使用型フィールドであり公開 export ではない。`initProcessObservability` / `flushProcessObservation` の first-caller-wins、flush、再 flush no-op 契約は維持する。直後の `260727-plugin-verb-skills` 断面は履歴として保持する。

### 履歴: 260727-plugin-verb-skills

> **2026-07-28（intent `260727-plugin-verb-skills`、amadeus-feature / Brownfield）: plugin CLI の公開契約が #1596 バッチで確定した。本 intent はこの契約面の拡張可否を扱う（測定 ref: observed `afb93a825917220660a3d9bbfdb23d83474b94a6`、base `0c4709102`（祖先 exit 0）、距離 **16**）。** **(1) 動詞集合（4 種、`install` は不在）**: `compose [--if-stale] [--project-root <dir>]` / `doctor [--project-root <dir>]` / `drop <plugin-name> [--project-root <dir>]` / `status [--project-root <dir>]`（`amadeus-plugin.ts:100-106` USAGE、`:71-75` 判別 union `PluginCliCommand`、`:146-153` `parsePluginCliArgs`）。未知動詞は `unknown verb: <v>` で fail-closed に落ち、**プラグイン導入は「staging root へ置く」+ `compose` の 2 手であって CLI に `install` 動詞は無い**。 **(2) 結果 union と exit code 規約**: `PluginCliResult`（`:87-94`）は `composed` / `noop` / `dropped` / `doctor` / `status` / `usage-error` / `failure` の 7 値、`failure.stage` は `discover | trust | plan | apply | recover` の 5 値。exit code は `renderPluginCliResult:645-670` 直読で **成功 0 / `doctor` は `degraded ? 1 : 0`（`:658`）/ `usage-error` 2（stderr にメッセージ + USAGE、`:663-665`）/ `failure` 1（`:666-668`）**。 **(3) 既定ホストルート（#1591 裁定 B、公開挙動）**: `--project-root` を省略した場合、CLI は**自身が設置されたハーネスディレクトリ**を host root にする（`defaultPluginHostRoot:293-297`）。これは出荷 INSTALL doc が印字する compose コマンドを cwd 非依存にするための契約であり、`t341:20-23` が「`--project-root` を与えない」形で被検体にしている。 **(4) `doctor` の 0-plugin 出力（#1585 解消）**: standalone / 統合の両面が同一レンダラ `doctorPluginRows` を通り、0-plugin ホストでも `Plugins: 0 installed` の 1 行を返す。前区間の「standalone は stdout 0 バイト」は**失効**。 **(5) `drop` の完了宣言（#1586 解消）**: `baseline restored` の宣言根拠が composition record 単独から **record 空 AND FS 実測**へ変わった（`:422`）。境界は設計コメント `:426-431` が明示 — 内容を持つディレクトリは restore 失敗ではなく、`.amadeus-plugin-drops.json` は射程外。 **(6) 統合 CLI には `plugin` 動詞が無い**: `amadeus-utility.ts:5945` の `switch (subcommand)` に `case "plugin"` は不在（`grep -n '"plugin"'` = 0 hit）。統合 CLI へ委譲を足すなら `handleMigrate:5900` が唯一の先例で、**case・`die` の usage 文字列（`:6033`）・`HELP_TEXT_TAIL`（`:216`、`t67` が pin）の 3 面同期**が要る（現状すでに `die` 文字列は `init` / `state-init` を列挙しない不一致がある）。 **(7) スキル面の公開契約**: ユーザー起動スキルは正本 `core/skills/` に置かれるが**投影は面ごとの明示列挙**で決まり、`amadeus-mirror` は 7 面・`amadeus-election` は claude / codex / kimi の 3 面（`find dist -type d -name amadeus-election` 実測）。新スキルの公開範囲は設計判断。詳細は本 scan の `architecture.md` / `code-quality-assessment.md` 新節。

> **2026-07-27（intent `260727-e2e-plugin-conformance`、Issue #1575 / #1585 / #1586 / #1589、Brownfield）: ユーザー可視契約は plugin CLI の 2 動詞出力（doctor / drop）— 契約の追加はなく、既存契約の未充足を是正する（測定 ref: observed `0c4709102`、base `1673c433`（祖先 exit 0）、距離 **60**）。** **(1) `doctor` の出力契約（#1585）**: 統合 doctor 面は 0-plugin ホストで `Plugins: 0 installed` の 1 行を返す（`amadeus-plugin.ts:534-536` verbatim `if (section.lines.length === 0) return [{ pass: true, label: "Plugins: 0 installed" }];`、設計コメント `:531-533` が BR-U5-4 として「a 0-plugin host degrades to a single passing line … never flips a healthy exit」と明記）。一方 standalone CLI（`bun amadeus-plugin.ts doctor --project-root <dir>`）は `:591-593` で `result.lines` を直接ループするため 0-plugin では **exit 0 / stdout 0 バイト / stderr 空**。同一契約に対する 2 面の出力差であり、standalone 側を 0 件行へ揃えるのが是正方向。対照として `status` は 0-plugin でも `Plugins: N installed, ...` を出力する（`:594-596`）。 **(2) `drop` の完了宣言契約（#1586）**: CLI は `dropped <name> (baseline restored), recompiled` を出力する（`:589`）が、その `baselineRestored` の根拠は composition record のみ（`:377` `backend.readComposition().plugins.size === 0`）で FS 残渣を見ない。「baseline restored」というユーザー可視宣言の意味（ファイル面のみか、ディレクトリを含む導入前ゼロ状態か、エンジン dot-state `.amadeus-plugin-drops.json` / `-composition.json` / `-audit.json` を含むか）は**要件段で定義すべき契約**。 **(3) CLI 動詞の一覧（不変）**: `compose [--if-stale] [--project-root <dir>]` / `doctor [--project-root <dir>]` / `drop <name> [--project-root <dir>]` / `status`（`:8` / `:100` USAGE、`:136` `parseNoArgVerb`、`:569-577` dispatch）。 **(4) `--single` なしでの plugin stage 到達（#1589 の未検証契約）**: `emitComposedPluginStageIfInstalled`（`amadeus-orchestrate.ts:1017-1034`）が「compose 済み plugin stage は `--stage <slug>` のみで到達できる（`--single` 不要）」という公開挙動を実装しているが、これを出荷ホスト上で確かめる検証は存在しない（既存参照テストのうち `t-formal-verif-plugin-lifecycle` はヘッダ `:8` verbatim が `--single` **付き**）。 **(5) #1575 は内部 export の契約**（`scripts/` 内、ユーザー可視 CLI 契約ではない）。詳細は本 scan の `architecture.md` / `code-quality-assessment.md` 新節。

> **2026-07-27（intent `260727-install-doc-mismatch`、[Issue #1569](https://github.com/amadeus-dlc/amadeus/issues/1569)、amadeus-bugfix / Brownfield）: ユーザー可視契約は「install 手順ドキュメント」1 件（測定 ref: observed `46a75f2e7c53aaa475a19cc217d10c9172ad4129`、base `0d83aa48b`、距離 70）。** #1569 が触るユーザー可視面は、各 face が同梱する `INSTALL.md` と `docs/guide/19-plugins.md`（EN）/ `19-plugins.ja.md`（JA）の**プラグイン導入手順の文言**である。CLI 契約（`amadeus-plugin.ts` の `compose` / status サブコマンド）は不変で、修正対象は install bundle が案内するコピー先を discovery が実走査する `.amadeus-plugin-src/<name>/`（`amadeus-plugin.ts:278`）へ整合させることに限る。`manualComposeCommand`（`plugin-projection.ts:557-559`）が生成する `bun <harnessDir>/tools/amadeus-plugin.ts compose` は正しく、CLI の呼び出し契約は変更しない。ドキュメント正本は installDoc（生成器）で、dist 6 面 INSTALL.md は再生成物、docs EN/JA は手書き対訳（cid:requirements-analysis:docs-language-ownership）。

> **2026-07-27（intent `260727-docs-impl-sync`、amadeus-document / Brownfield）: 本 intent は契約を変更しない。ただし区間内で新設された 2 つの公開契約が docs に未反映。** 測定 ref: observed `aabc0527d`、base `1673c4332`（祖先 exit 0 / 距離 **47**）。 **(1) `amadeus-plugin.ts` CLI 契約（#1554、新設）**: `usage: amadeus-plugin.ts <verb> [flags]` — `compose [--if-stale] [--project-root <dir>]` / `doctor [--project-root <dir>]` / `drop <plugin-name> [--project-root <dir>]` / `status [--project-root <dir>]`（`packages/framework/core/tools/amadeus-plugin.ts:95-101`）。結果は判別 union（`composed` / `noop` / `dropped` / `doctor` / `status` / `usage-error` / `failure`、`:88` / `:412-442`）で、**未知フラグ・引数過多は silent read-past せず usage-error → stderr に usage + exit 2**（ADR-3 / BR-U2-4、`:103-109` `takeProjectRoot` と `parseCompose` の leftover 検査）。`--project-root` は値必須で `--` 始まりの値を拒否する（`:107`）。 **(2) SessionStart hook 契約（12 番目）**: `core/hooks/amadeus-plugin-compose.ts` は `handlePluginCli(["compose","--if-stale","--project-root",projectDir])` を呼び、非 0 終了・例外いずれも **stderr 1 行の警告 + exit 0**（セッションを決してブロックしない、`:15-23`）。 **(3) `metrics-visualize.ts` の `--check` 契約**（#1504）: 決定性（同一入力 → 同一バイト列、wall clock / 乱数 / 環境値を埋め込まない）を前提にしたバイト比較ドリフトガード。env seam は `AMADEUS_METRICS_ROOT`。 **(4) 投影面の公開約束**: `PACKAGE_HARNESSES` = 7 / `SELF_INSTALL_HARNESSES` = 5（`scripts/plugin-projection.ts:41-49` / `:55`）は型 + ランタイム両面の閉じた union として公開される契約だが、これを説明する `docs/guide/19-plugins.{md,ja.md}` は 6 / 4 のまま（`grep -ci kimi` = 0）。**契約自体は正しく、docs の記述のみが誤っている**点が本 intent の性格である。詳細は `code-quality-assessment.md` / `architecture.md` の同 intent 節、`re-scans/260727-docs-impl-sync.md`。

> **2026-07-27（intent `260726-answer-manual-binding`、[Issue #1548](https://github.com/amadeus-dlc/amadeus/issues/1548) bug、amadeus-bugfix / Brownfield）: 本 intent 断面は対象外（公開契約に変化なし）。** 測定 ref: observed `ad1ff5de9`、base `09c669901`、距離 2。区間 2 コミットは record-only で mirror answer/guard スタックの source 変更ゼロ。#1548 は mirror lifecycle の **manual-boundary ask への answer 不成立**（`amadeus-mirror-lifecycle.ts:969-985` の `manualOperation`/`invocationId` 転送欠落 + guard `:257-265`）で、CLI verb（`answer approve/skip` 等）の**呼び出し文法・フラグ・exit code 規約は不変**。修正で manual ask answer が通るようになっても公開 API 契約は変わらない見込み。詳細は上流入力 `re3-dev-scan-result.md` と本 scan の `architecture.md` / `code-quality-assessment.md` 新節、`re-scans/260726-answer-manual-binding.md`。

> **2026-07-27（intent `260726-t258-p95-flake`、[Issue #1511](https://github.com/amadeus-dlc/amadeus/issues/1511) bug/P2/S3-MAJOR、amadeus-bugfix / Brownfield）: 本 intent 断面は対象外（公開契約に変化なし）。** 測定 ref: observed `09c669901`、base `f9a0fb86a`、距離 2。区間 32 ファイルはすべて `amadeus/` record で source/test 変更ゼロ。#1511 は `tests/integration/t258`（`:461-462`）/ `t257`（`:240-241`）の**テスト内部の絶対 p95 性能 assert**の CI ジッタ偽赤であり、公開 CLI/API 契約には一切触れない。詳細は上流入力 `re2-dev-scan-result.md` と本 scan の `code-quality-assessment.md` / `architecture.md` 新節、`re-scans/260726-t258-p95-flake.md`。

> **2026-07-26（intent `260726-mirror-state-split`、[Issue #1547](https://github.com/amadeus-dlc/amadeus/issues/1547) + [Issue #1534](https://github.com/amadeus-dlc/amadeus/issues/1534)、amadeus-bugfix / Brownfield）: mirror CLI の公開契約は無変化、内部状態表現契約が分裂（測定 ref: observed `f9a0fb86a`、base `1673c4332`、距離 38）。** mirror CLI の公開面（`create | sync | close | status` verb、`--instance` / `--intent` フラグ、exit code 規約 = mutating 0/1/2・status 0/1/2）は区間内で無変更（scan-notes §7）。ただし record（`amadeus-state.md`）内部の状態表現に **2 系統の非対称契約**が現存する — write（lifecycle）は **v1 sentinel ブロック**（`amadeus-mirror-state-codec.ts:38-39`）を、read（status `amadeus-mirror.ts:169` / orchestrate `:314` / `:3522`）は **legacy「Mirror Issue」フィールド**を権威とする。両者が別表現のため、`amadeus mirror status` は lifecycle create 後も `mirror-missing`（exit 1）を返し続ける（`amadeus-mirror.ts:249-258`）。修正で read を v1 権威へ寄せても CLI の公開契約は変わらない見込み（status の返り値は正常化するが verb/フラグ/exit 規約は不変）。#1534 の legacy 10 record 復旧に marker adopt/backfill を新設する場合は repair 系の内部契約に触れる。dead legacy 群（`handleCreate` `:379` / `handleSync` `:425` / `handleClose` `:450` / `writeMirrorIssueField` `:363`）は export されているが CLI から不到達で公開契約を構成しない。詳細は上流入力 `inception/reverse-engineering/scan-notes.md` と本 scan の `architecture.md` / `component-inventory.md` 新節。

> **2026-07-26（intent `260726-plugin-host-delivery`、amadeus-feature / Brownfield）260726-plugin-host-delivery 差分リフレッシュ: 区間で公開挙動が変化した面は 3 件（測定 ref: observed `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`、base `1673c4332`、距離 43）。** (1) **mirror gateway の envelope 修正**（[PR #1537](https://github.com/amadeus-dlc/amadeus/pull/1537)）— 前節が仮説とした「`--slurp` 撤去なら外部契約が変わる」が現実化した: `--paginate --slurp` は廃止され、find は `FIND_PER_PAGE = 100`（`amadeus-mirror-gateway.ts:120`）の明示ページ walk（`:695`）へ移行、bare-LF ステータス行も受理される。auto-mirror の 5 verb はこれで実 `gh` 出力に対して成立する。 (2) **Kimi Code ハーネス**（[PR #1522](https://github.com/amadeus-dlc/amadeus/pull/1522)）— 第7ディストリ面 `dist/kimi/` と self-install 第5面 `.kimi-code/` が公開配布面に加わり、`scripts/plugin-projection.ts:60` の self-install 集合は closed five。 (3) **metrics 可視化 CLI**（[PR #1500](https://github.com/amadeus-dlc/amadeus/pull/1500)/[PR #1504](https://github.com/amadeus-dlc/amadeus/pull/1504)）— `scripts/metrics-visualize.ts` の `--write` / drift guard が CI 配線込みで追加（配布対象外の repo-local scripts）。CLI verb・監査イベント・スキーマのその他公開面に区間内の追加・変更はない。
> **2026-07-26（intent `260726-mirror-envelope-lf`、[Issue #1498](https://github.com/amadeus-dlc/amadeus/issues/1498) P1/S2、amadeus-bugfix / Brownfield）: 区間で公開挙動が変化した面が 4 件、患部の公開契約は無変化（測定 ref: observed `e39402224`、base `1673c4332`、距離 27）。** 区間の公開挙動変化は前 intent の 6 修正の着地分 — (1) election `verify` が自己相関引数をやめ独立読取で検証（[PR #1516](https://github.com/amadeus-dlc/amadeus/pull/1516)）(2) `Election.parse` が空 choices / 重複 internalNo / 重複 voter を fail-closed 棄却（[PR #1517](https://github.com/amadeus-dlc/amadeus/pull/1517)、従前は無音受理）(3) audit シャードの bare `intents/` ルート書込を拒否（[PR #1524](https://github.com/amadeus-dlc/amadeus/pull/1524)）(4) distributed report transition で `reportDelivery` が配線され timeline が記録される（[PR #1523](https://github.com/amadeus-dlc/amadeus/pull/1523)）。加えて `discoverPluginStageFiles` の dangling symlink が raw ENOENT を投げず skip される（[PR #1518](https://github.com/amadeus-dlc/amadeus/pull/1518)）、benchmark dispersion gate が単一スパイクで偽赤にならない（[PR #1507](https://github.com/amadeus-dlc/amadeus/pull/1507)）。**本 intent の患部 `amadeus-mirror-gateway.ts` の公開面（5 verb の argv 構築と `MirrorGateway` の返り値型）は区間内で無変更**であり、修正が返り値型を変えない限り消費側 `amadeus-mirror-lifecycle.ts:29` は無改修見込み（仮説）。ただし find の修正方式として `--slurp` 撤去（`findArgv:118-132`）を採る場合、`gh` 呼び出しの外部契約が変わる。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-crossreviewed-bug-batch`、クロスレビュー済みバグ7件、amadeus-bugfix / Brownfield）: 区間に新規公開契約なし（測定 ref: observed `1673c4332`、base `e12259ba7`、距離 2）。** 区間の正本変更は `amadeus-lib.ts` の [Issue #1497](https://github.com/amadeus-dlc/amadeus/issues/1497) 修正（内部述語 `standingGrantSatisfiesGate` の解決方式差し替え、35 insertions / 3 deletions）のみで、CLI verb・監査イベント・スキーマの公開面に追加・変更はない（前 intent 節で既報の契約がそのまま有効）。ただし後続の修正で**公開契約に触れうる候補が2件**ある — [#1458](https://github.com/amadeus-dlc/amadeus/issues/1458) の「既定 transport（`subagent`）廃止 + agmsg 必須化」案は CLI 契約変更に当たり、[#1388](https://github.com/amadeus-dlc/amadeus/issues/1388) は `team-up.sh` が `scripts/` から `packages/framework/core/tools/`（配布対象）へ移動済みのため、変更が配布面の契約に及ぶ。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-metrics-visualization`、amadeus-feature / Standard）: 変更なし、確認済み（測定 ref: observed `1c43438df`、base `11f1ad61f`、距離 5）。** 区間内でユーザー可視の API/CLI 公開契約に変化なし（`scripts/` と `.github/` の diff は 0 ファイル）。**ただし本 intent は新規の公開契約を追加しうる**: (1) 可視化 CLI の引数体系 — 既存 `metrics-timeseries.ts` の `parseArgs` `:171`（`--collector` / `--last`）と `metrics-snapshot.ts:169`（`--write` / `--check`）、`metrics-retention.ts` の `--apply` が既習様式で、exit コード規約は usage=2 / 実行時失敗=1 / 成功=0 (2) `metrics-timeseries.ts` の module 公開面 — `formatValue` `:117-119` の export 昇格が設計判断点（cid:application-design:dual-key-consumer-inventory の対象）(3) `package.json` の `scripts` エントリ — 全 15 中 metrics 系 **0** のため、実行導線を足すなら新規公開契約になる。**なお `metrics-timeseries.ts:3-4` の「must not import any fs write API (AC-1c; grep-checkable)」は grep 検査可能な内部契約であり、可視化を同モジュールへ足す設計はこれを破る**（詳細は `architecture.md` / `code-quality-assessment.md` の同 intent 節）。
> **2026-07-26（intent `260726-grant-scope-gate`、[#1497](https://github.com/amadeus-dlc/amadeus/issues/1497)、amadeus-bugfix / Brownfield）: 公開契約に追加あり（測定 ref: observed `e12259ba7`、base `11f1ad61f`、距離 4）。** 詳細は下の同 intent 節。

## solo standing grant の公開契約（260726-grant-scope-gate、履歴、Issue #1497）

測定 ref: observed `e12259ba7`。file:line は同 commit の実ファイル直読。

### 区間で追加された CLI verb

[PR #1483](https://github.com/amadeus-dlc/amadeus/pull/1483) が `amadeus-state.ts` の subcommand 集合へ 2 verb を追加した（`:732-737`、有効一覧は `:782` のエラーメッセージが列挙）:

| verb | 引数（`amadeus-state.ts:3490` の使用法コメント） |
| --- | --- |
| `grant-standing-delegation` | `[--scope stage-gates] [--ttl-ms <n>] [--include-phase-boundary] [--user-input <text>]` |
| `revoke-standing-delegation` | — |

`--scope` の値 `stage-gates` は **グラント自身の適用面を表す固定語彙**（`StandingGrant.parse`、`amadeus-lib.ts:3774-3816` の `:3790`）であり、**ワークフローの scope（`amadeus-bugfix` 等）とは別物**である。#1497 が扱うのは後者の解決であり、この CLI 引数ではない。

### 監査イベント契約

`core/knowledge/amadeus-shared/audit-format.md`（区間 `+13`）に 3 イベントが追加された: `GRANT_ISSUED` / `GRANT_REVOKED` / `GATE_AUTHORIZATION_SELECTED`。前 2 者は**汎用 audit CLI からの手動 mint が拒否される**（`amadeus-audit.ts:850-854`、コメント verbatim: 「a fabricated GRANT_ISSUED would open every stage gate for its TTL, so the general audit CLI must refuse to mint them」）。書けるのは実 HUMAN_TURN に裏付けられた `grant-standing-delegation` / `revoke-standing-delegation` のみである。

### directive 契約への影響

グラントがゲートを覆う場合、engine は directive を差し替えて `GATE_AUTHORIZATION_SELECTED` receipt（`Route Id` フィールド付き、`amadeus-grant-authorization.ts:776`）を append する。覆わない場合は **directive を無変更で返す**（`:762`）— すなわち directive 契約上は「グラントが存在しない場合」と区別がつかない。approve 側で受理できない場合は `printAwaitApproval`（`amadeus-state.ts:3198`）が `reason: "standing-grant-no-longer-authorizes"` を返す。**#1497 の修正はこの契約面（無変更返却 / await-approval reason）を変えず、`standingGrantSatisfiesGate` の内部解決方式のみを対象とする**のが現時点の観測に基づく境界である。

> **2026-07-26（intent `260725-worktree-ref-fixes`、[#1482](https://github.com/amadeus-dlc/amadeus/issues/1482) / [#1481](https://github.com/amadeus-dlc/amadeus/issues/1481) / [#1455](https://github.com/amadeus-dlc/amadeus/issues/1455)、amadeus-bugfix / Minimal）: 変更なし、確認済み（測定 ref: observed `11f1ad61f`、base `ec624022f`、距離 10）。** ユーザー可視の API/CLI 公開契約に変化なし。患部はいずれも**内部解決関数とテストヘルパー**である — `resolveProjectDirFromHook`（`amadeus-lib.ts:247`）は export されているが framework 内部の hook 専用シームであり CLI 契約面には現れない。`currentGitSha` はテストファイル内のローカル関数で公開契約ではない。**ただし #1482 の修正が rung 順序に及ぶ場合、`tests/unit/t202-hook-project-dir-worktree-marker.test.ts:105` が固定する「`CLAUDE_PROJECT_DIR` が marker rung に優越する」という内部契約の変更を伴う** — 公開 API ではないが、テストで明文化された契約であるため要件段での裁定を要する。

> **2026-07-25（intent `260725-teamup-launch-hardening`、[#1476](https://github.com/amadeus-dlc/amadeus/issues/1476) / [#1478](https://github.com/amadeus-dlc/amadeus/issues/1478)、amadeus-feature / Standard）: 変更なし、確認済み（測定 ref: observed `4a0f91ad0`、base `ec624022f`、距離 9）。** ユーザー可視の API/CLI 公開契約に変化なし。`team-up.sh` の CLI フラグ・exit code の意味づけは PR #1477 でも不変（`watcher_status` は検証がスキップされる場合 0 のまま）。関与するのは内部起動フロー（検証 → `mux_attach` の順序、worktree 作成ループ）と、repo 外の外部 agmsg CLI 契約（`watch.sh` の位置引数、ready sentinel path、`delivery.sh` の mode）の**消費**のみ。**なお #1476 は stderr へ出る advisory 文言（team-up.sh:1099）を消滅させるため、運用者可視の出力面には変化が生じる。**

> **2026-07-25（intent `260725-teamup-attach-latency`、[#1449](https://github.com/amadeus-dlc/amadeus/issues/1449)、amadeus-bugfix / Minimal）: 変更なし、確認済み（測定 ref: observed `ec624022f`、base `6d4df9056`、距離 125）。** ユーザー可視の API/CLI 公開契約に変化なし。関与するのは `team-up.sh` の内部起動フロー（watcher 検証 → `mux_attach` の順序、exit code 分岐）と、repo 外の外部 agmsg CLI 契約（`watch.sh` の位置引数、ready sentinel path）の**消費**のみ。

## Issue #1466 solo standing grant（260725-solo-standing-grants、2026-07-25、履歴）

base `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、observed `4491310cc0b432eb404524ef30a7d8a0a3f68f73`。[Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466)。[PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は凍結試作で参考のみ、実装前提にしない。

現行 CLI は `grant-standing-delegation` / `revoke-standing-delegation` を team-only とし、grant を設定ではなく監査イベントとして発行・取消する。`delegate-approval` は remote target 用の team 契約である。`next` の `RunStageDirective` は `gate` を持つが grant identity を持たず、`report` flags も Grant Id を `approve` へ運ばないため、commit は route で選んだ ID の同一性を再検証できない。

## 後続 API 裁定

候補は exact `grant_id` carrier、opaque authorization claim、commit-only selection。commit 時不適格は「state 未変更、`GATE_APPROVED` / `STAGE_COMPLETED` / `ERROR_LOGGED` なし、人間ゲート再提示」を表す typed non-error 契約が必要である。具体 field / outcome は未決定。standing grant の audit-derived 性質と protected event mint 禁止は維持する。

## Mirror 公開契約と欠落面（260725-mirror-review-fixes、履歴）

観測 HEAD は `70336937529f5be31c011de5d368c0f03e534506`、差分 base は `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`。

### 正準 lifecycle CLI

- `boundary intent-capture|phase|park|completion --instance <id> [--phase|--stage ...] [--repo owner/name] [--space <space>] [--intent <dir>] [--project-dir <dir>]`
- `manual create|sync|close --instance <id> [共通オプション]`
- `repair status|relink|abandon ...`

現行 parser は上記3群だけを受理する。既定 `prompt` で返る `MirrorBoundaryOutcome { kind: "ask", event, operation, question, workflowMayAdvance }` に回答する公開コマンドがなく、outcome と `MirrorPromptAnswer` のどちらにも `bindingId` がない。後続契約では approve/skip と保存済み `bindingId`、event/operation、`answerId` を受ける surface、または orchestrator の既存 ask/report 往復への接続が必要である。

### CLI 終了契約

- usage は exit 2、top-level error は exit 1。
- 現行 boundary/manual は `runMirrorLifecycleBoundary` が top-level `ok` なら inner outcome に関係なく exit 0。
- 修正後の契約は、要求した mutation が `completed` のときだけ exit 0 とし、`pending`、`safety-blocked`、不一致による `suppressed` は非0または専用 machine-readable result にする必要がある。`ask` は回答待ちとして workflow receipt と区別する。

### Legacy CLI

`amadeus-mirror.ts <create|sync|close|status> [--intent <dir>]` は現行公開 help に残る。`create|sync|close` は直接 `gh issue` を呼ぶため lifecycle 安全契約を迂回する。修正時は mutation verb を `manual` へ委譲するか usage error として拒否し、`status` の read-only 診断契約（clean=0、diverged=1、precondition/usage=2）は維持対象である。

### 内部関数契約

- `driveMirrorBoundary(input)` は `answer?: MirrorPromptAnswer` を既に受ける。
- `handlePromptAnswer` は保存済み `expectedPrompt` を参照するが、approve の `approveMirrorPrompt` は event/operation だけを照合し、回答が保存済み `bindingId` を提示する契約はない。skip は `approveMirrorPrompt` を通らず event-scoped skip を書くため、approve/skip の双方で外部回答と durable binding の一致を検証する必要がある。
- `resolveMirrorConfig` は `off | prompt | auto` のみ受理し、Global < Space < Intent の precedence、全層 fail-closed を維持する。
- `parseMirrorState` は duplicate key、unknown field、depth/size、invariant に加え、JSON 文字列中の未エスケープ U+0000–U+001F をすべて拒否する契約へ揃える必要がある。

> **2026-07-25（intent `260725-kimi-harness`、amadeus-feature）: 変更なし、確認済み。** 区間変化はフレームワーク内部構造（ハーネス検出モジュール分離、plugin の中立バンドル出荷・sha256 信頼層、intent birth の `Harness` フィールド記録）に閉じ、ユーザー可視 API/CLI/directive 契約の変更なし。`Harness` フィールドは state 生成ファイルの内部フィールド追加で公開契約面は不変（base `6d4df9056` → observed `d31b8a5db`）。

> **2026-07-24（intent `260724-watcher-timeout-fix`、[#1449](https://github.com/amadeus-dlc/amadeus/issues/1449)、amadeus-bugfix / Minimal）: 変更なし、確認済み。** `team-up.sh` の内部制御フロー（watcher 検証 → mux_attach 順序、exit code 分岐 0=全 armed / 非ゼロ=未 armed）は既存契約のまま。ユーザー可視 API/CLI 契約に変化なし（base `a81c11dde` → observed `6d4df9056`）。

## 260723-t241-ci-residency の関連契約（履歴: 2026-07-23）

差分リフレッシュ（base `a81c11dde` → observed `78bce876`、距離 35、bugfix / Minimal、[#1294](https://github.com/amadeus-dlc/amadeus/issues/1294)）。ユーザー可視 API/CLI 契約に変化なし。関連する内部契約は `tests/run-tests.ts` の profile flag（`--ci`=smoke+unit+integration:197-202 / `--release`=+e2e:203-211、banner :124-127）と `package.json` test scripts（:14-16）、および ADR-6 の layer (i)=integration 契約（`application-design/decisions.md:41-48`）。t241 の e2e 配置がこの設計契約からの実装逸脱（測定 ref: scan-notes @ observed HEAD `78bce876`）。

## 260722-teamup-prompt-race の関連契約（2026-07-22、履歴）

bugfix / Minimal（observed `a81c11dde`）。本 intent は HTTP/CLI/directive 公開契約を変更しない。関わるのは内部起動契約と外部 agmsg CLI 契約の消費のみ: (1) `scripts/team-up.sh` → `scripts/run-claude.sh` の位置引数（init_prompt `/agmsg mode monitor`）、(2) 対照の agmsg `spawn.sh` handshake（`status=ready`、`--ready-timeout` default 90s `:46-47`）と ready センチネル path（`agmsg_ready_path` `lib/actas-lock.sh:69-73`）、(3) 再注入に使う `herdr pane send-text` + `send-keys enter`（send/submit 2段、cid:code-generation:herdr-send-submit-two-step）。いずれも既存契約の消費であり公開 API 面の追加・変更はない。

> 以下は過去 intent の履歴。

## upstream-sync-230 の公開契約（2026-07-20、履歴）

Amadeus に HTTP service API はない。公開面は CLI、directive JSON、hook payload、stage/plugin manifest、生成ファイル契約である（測定 ref: core CLI 30、switch arms 134、core exports 501、setup exports 101、hooks 11）。

| 契約 | 現行状態 | 24項目で必要な変更 |
|---|---|---|
| `amadeus-orchestrate.ts next/report` | directive JSON を stdout に返す | gate next-stage 名、DAG 自己修復、help 予約 routing |
| `amadeus-swarm.ts prepare/check/finalize` | Unit worktree と merge 成否を決定 | 現行の全 batch 走査は EQUIVALENT 候補として固定テスト化 |
| `amadeus-utility.ts compose/recompose` | Running workflow を再構成 | pending marker 鮮度と autonomy guard を fail-closed 化 |
| stage frontmatter | 既存 schema の固定キー | `number` / `name` / `bundle` / `required_sections` / kind を追加、`when` 予約契約を明示変更 |
| plugin manifest | 不在 | discovery、compose hook、projection、no-clobber、reference plugin を公開 |
| harness hook adapter | 6ハーネス別 payload | `process.execPath` 経由 spawn、Kiro IDE 実 payload/context、project-dir quote |
| `scripts/package.ts --check` | 6/6 PASS 実測 | plugin source/dist/host を byte/orphan/unreferenced 検査へ組み込む |

`gate-next-stage-naming` は PARTIAL である。`amadeus-state.ts:1543,2560` の state/audit に next-stage 情報はあるが、ユーザーが消費する directive には投影されず、stage protocol の静的 prose に依存する。plugin API は非アクティブ時の出力バイト同一を保護する opt-in 契約とする。

> 以下は過去 intent の履歴。

## swarm driver 関連の現行 CLI／directive 契約（2026-07-13、履歴）

### `invoke-swarm` directive

```typescript
type InvokeSwarmDirective = {
  kind: "invoke-swarm";
  units: string[];
  repo?: string;
};
```

engine が返す外形は上記だけであり、driver、harness、task topology、capability probe、fallback reason、native evidence は含まれない。eligibility は autonomous Construction の未完了 batch に限定される。

### swarm referee CLI

```bash
bun <harness-dir>/tools/amadeus-swarm.ts prepare \
  --batch <n> --units <a,b,...> [--base <branch>] [--repo <name>] \
  [--degraded-from <subagent|ultracode>]

bun <harness-dir>/tools/amadeus-swarm.ts check <unit> \
  --check-cmd "<command>" [--test-file <protected-spec>]

bun <harness-dir>/tools/amadeus-swarm.ts finalize \
  --batch <n> --units <a,b,...> --claimed <a,...> \
  --check-cmd "<command>" [--test-file <protected-spec>] \
  [--reasons <unit>=<reason>,...]
```

- `prepare`: Unit ごとの worktree／Bolt state を作り、`SWARM_STARTED` を発行する。`--degraded-from` は旧 `subagent|ultracode` のみで、fallback は `subagent` として `SWARM_DEGRADED` に記録される。
- `check`: convergence command と protected file を検査する advisory API。監査イベントは発行しない。
- `finalize`: claimed Unit を再検証し、genuine pass のみ直列 merge する。成功は exit 0、未収束／merge failure は failure envelope と exit 2。

現行 contract には `AMADEUS_SWARM_DRIVER` の5値、explicit unavailable hard error、`auto` fallback、requested／selected／reason／capability evidence／native trace の受け口がない。後続設計では、engine の read-only 性と referee の audit ownership を維持しながら、選択結果を worker 起動前に確定・監査へ渡す必要がある。

### packaging 契約の現行訂正

`scripts/package.ts --check` は現在、再生成 byte diff に加えて `dist/<name>/` 全域の orphan scan（`:692-709`）と harness source-side unreferenced scan（`:711-725`）を実行する。以下の #735／#701 節は発見当時の履歴であり、両ギャップを現存問題として扱わない。

## 公開 API サーフェス

この repository に HTTP API、GraphQL API、service endpoint は存在しない。公開されている契約は CLI コマンド(`@amadeus-dlc/setup`、AI-DLC 内部ツール群)である。当該スキャン intent(260709-bug-zero-batch)は既存契約の変更ではなく内部欠陥の修理であったため、CLI サーフェスの外形は維持される想定。以降の一連の bugfix intent(バッチ D=tools-dispatch-batch まで)も既存契約の変更を含まない。

> **2026-07-10 更新(intent 260710、#735)**: 前回 intent の2バグは出荷済み — **#685 は #729 で解消**(`delegate-rejection` subcommand + `DELEGATED_REJECTION` イベント追加。`amadeus-state.ts` dispatch L262-263)、**#670 は #727 で解消**(worktree write パスのアンカー化)。下記「#685」「#670」節は歴史的記録。

## `scripts/package.ts` の packaging CLI 契約(#735 に関連)

> **履歴・解決済み**: source-side unreferenced scan は現行 `scripts/package.ts:711-725` に実装済み。以下は修正前の契約記録。

```bash
bun scripts/package.ts [<harness>]            # write: dist/<name>/ を再生成(clean-sweep)
bun scripts/package.ts --check [<harness>]    # check: 再ビルドと committed dist を byte-diff、drift で exit 1
bun scripts/package.ts codex trust --project <abs-dir> [--hooks-json <abs-path>]  # codex trust-seed 出力
```

- write 契約(`writeHarness`, L521-549): `harness/*/manifest.ts` を発見(引数なし時)または名指しで、`dist/<name>/<harnessDir>/` と workspace-root method tree を clean-sweep 後に `buildTree` で再生成する。
- check 契約(`checkHarness`, L554-634): tmp に再ビルドして committed dist と byte-diff。`MISSING`/`DIFFERS`/`ORPHAN` を集め、1件でもあれば exit 1(最大40件表示、L672-678)。`dist:check`(package.json script)がこれを呼ぶ。
- **#735 のギャップ**: この `--check` の orphan 検出はすべて**出力側**(dist)で完結する。`harness/<name>/` の authored ソースが manifest 未参照でも、それは dist に出力されないため `--check` は何も鳴らさない。source 側に「全 authored ソースが `harnessFiles` 参照集合または既知 build 機構(`manifest.ts`/`onboarding.fills.ts`/`emit.ts`)に属するか」を照合する契約が存在しない。

## `amadeus-state.ts` gate resolution 契約(#685 に関連、前 intent、履歴)

```bash
bun packages/framework/core/tools/amadeus-state.ts approve <slug> [--user-input <text>]
bun packages/framework/core/tools/amadeus-state.ts delegate-approval <slug> --to-intent <record-dir> [--to-space <space>] [--user-input <text>]
bun packages/framework/core/tools/amadeus-state.ts reject <slug> [--feedback <text>]
```

- `delegate-approval` の契約(L1449-1541): 呼び出し元(leader session)が自身の audit shard に持つ実 `HUMAN_TURN` を根拠に、`--to-intent`/`--to-space` で指定した別セッション(conductor)の record dir へ `DELEGATED_APPROVAL` を発行する。対象側の `approve`/gate チェックは `verifyDelegatedApproval` でこの根拠を検証してから human act として受理する。
- **#685 の欠陥**: `reject` に相当する `delegate-reject`/`delegate-rejection` subcommand は存在しない(`amadeus-state.ts` の subcommand dispatch、L257-303、および `packages/framework/core/` 全体を grep して確認)。agent-team topology でリモートの conductor がゲートを REJECT する手段が構造的に存在しない — 唯一の経路は conductor 自身のセッションが実 `HUMAN_TURN` を持つことだが、それは leader 側の human turn では満たせない。

## `amadeus-worktree.ts` create / `amadeus-bolt.ts --worktree` 契約(#670 に関連、前 intent、履歴)

```bash
bun packages/framework/core/tools/amadeus-worktree.ts create --name <dev> [--repo <name>]
bun packages/framework/core/tools/amadeus-bolt.ts start --worktree ...
```

- 契約(`amadeus-worktree.ts:112-132` `assertNotSiblingWorktree`): `create`(L204)、L277、L512 近傍(`bolt --worktree` の release/merge 経路)は、呼び出し元の `git rev-parse --show-toplevel` がメインチェックアウトと一致しない限り無条件にエラー終了する。
- **#670 の欠陥**: この契約は「Bolt 自身が作るネストしたワークツリー(`.claude/worktrees/<dev>/`)からの呼び出しを防ぐ」ことを意図しているが、実装は cwd が**いずれの** git worktree であっても区別なく拒否する。マルチワークツリーのチーム体制(人間/エージェントごとに独立した sibling worktree を持つ運用)では、正当な sibling worktree から `amadeus-worktree create`/`bolt --worktree` を呼ぶユースケースそのものがブロックされる。

## `amadeus-swarm.ts finalize` の契約(#674 に関連)

```bash
bun packages/framework/core/tools/amadeus-swarm.ts finalize --batch <n> --check-cmd "<cmd>" \
  [--claimed <csv>] [--units <csv>] [--test-file <path>] [--reasons <unit>=<reason>,...]
```

- 出力: `{ batch, units: UnitResult[], converged, failed, merge_failures }` の JSON envelope(`amadeus-swarm.ts:620-627`)。
- exit code 契約: 0 = 全 claimed unit が genuine に converge かつ merge 成功。2 = いずれかの unit が failed、または `merge_failures` が非空(L630)。
- **#674 の欠陥**: exit code 契約は merge 失敗を正しく検知する(`mergeFailures.length > 0` を見ている)が、`units` 配列と、それに基づいて発行される `UNIT_CONVERGED`/`UNIT_FAILED` audit イベントは merge 失敗を反映しない。呼び出し元が JSON の `units[].status` だけを見た場合、merge に失敗した unit も `"converged"` と誤認する。

## `amadeus-state.ts` の gate 系サブコマンド契約(#675 に関連)

```bash
bun packages/framework/core/tools/amadeus-state.ts approve <slug> [--user-input <text>]
bun packages/framework/core/tools/amadeus-state.ts reject <slug> [--feedback <text>]
```

- `approve` の契約: autonomous Construction または `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` のいずれでもない限り、直前の gate 解決以降に `HUMAN_TURN` イベントが記録されていなければ拒否する(`amadeus-state.ts:1321-1337`)。
- **#675 の欠陥**: `reject` にはこの契約が存在しない。ドキュメント化された契約(`approve` 側のコメント、L1316-1337)は「gate はここで人間の判断が必要」と明言しているが、`reject` の docstring(L1279-1285 相当のコメントに `reject` 用のものはない)にも実装にもこの制約が反映されていない。

## `amadeus-bolt.ts start`/audit 契約(#676 に関連)

```bash
bun packages/framework/core/tools/amadeus-bolt.ts start --worktree --slug <slug> \
  --name <bolt-name> --batch <n> [--intent <id>] [--space <name>]
```

- 契約: `--worktree` 指定時は `BOLT_STARTED` audit イベントを、`--intent`/`--space` で指定された(または解決される)intent の record dir に書き込む。
- **#676 の欠陥**: `--intent`/`--space` が渡されても、内部の `recordDir()` 解決に失敗すると `auditFilePath()`(`amadeus-lib.ts:1267-1270`)が space レベルの bare fallback に静かに切り替わる。この切り替わりを呼び出し元(conductor)に通知するエラーや警告は出力されない。

## `@amadeus-dlc/setup` Http ポート契約(#677 に関連)

```typescript
type Http = {
  getJson(apiPath: string): Promise<Result<unknown, FetchError>>;
  downloadArchive(url: URL): Promise<Result<ReadableStream<Uint8Array>, FetchError>>;
};
```

- 契約(`ports/http.ts:9-12`): 両メソッドとも例外を投げず、必ず `Result` で解決する。
- **#677 の欠陥**: `getJson()`(L23-28)の `checked.value.json()`(L27)がこの契約の外にある。GitHub API が 200 かつ不正な JSON ボディを返した場合、`getJson()` は `Promise<Result<...>>` ではなく reject された Promise を返し、呼び出し元(`resolver`/`fetcher` 等)は `Result` のみを想定したハンドリングをすり抜ける。

## `extractTarGz` 契約(#678 に関連)

```typescript
export async function extractTarGz(
  archivePath: string,
  extractDir: string,
  tmpWrite: TmpWrite
): Promise<Result<void, FetchError>>
```

- 契約(`tar-archive-extractor.ts:33`): アーカイブ全体をストリーミングで読み、`extractDir` 配下に安全に展開する。PAX(`x`)/GNU(`L`)longname を含む `git archive` 形式の tar をサポートする(冒頭コメント L8-19)。
- **#678 として持ち越す論点**: この契約自体は変更しないが、PAX/GNU longname がネットワークチャンクの境界を跨ぐ入力に対する挙動が実測未検証。

## `codekb-path` コマンド契約(#668 に関連)

```bash
bun .claude/tools/amadeus-utility.ts codekb-path [--repo <name>] [--json]
```

- 契約(`amadeus-utility.ts:2690-2699`): 「決定的な per-repo codekb ディレクトリ」を出力する。`--repo` が指定されない場合は `codekbRepoName(projectDir, space)` の解決結果を使う。
- **#668 の欠陥**: `codekbRepoName()` の fallback(`amadeus-lib.ts:503`)がワークツリーのディレクトリ名を使うため、「決定的(deterministic)」であるべき per-repo ディレクトリが worktree ごとに変わってしまう。本スキャン自体が `codekb/claude-engineer-1/` に出力されている(この codekb ファイル群自体)ことが直接の実例である。

## `scripts/package.ts` CLI 契約(#701 に関連)

> **履歴・解決済み**: dist root を含む whole-tree orphan scan は現行 `scripts/package.ts:692-709` に実装済み。以下は修正前の契約記録。

```bash
bun scripts/package.ts [<harness>] [--check]
```

- `--check` の契約: `dist/<name>/` が現行 manifest から生成される内容と byte 一致することを検査し、不一致(`MISSING`/`DIFFERS`/`ORPHAN`)があれば非 0 で exit する drift ガード。全 harness 対象時は `[<name>] --check: OK` を harness ごとに出力する。
- 検査は5スキャンで構成(`checkHarness` `:554-624`): (1) harness 内 built→committed、(2) harness 内 committed→built orphan、(3) projectRoot ファイルの明示 diff `:586-592`、(4) harness 外 emit ファイルの diff、(5) harness 外 orphan スキャン `:611-618`。
- **#701 の盲点**: (3) は built→committed 方向のみで committed→built の orphan 検査が無い。(5) の walk ルートは `[".agents","amadeus"]`(`:611`)のハードコード2件のみ。→ dist ルート直下(`dist/<name>/` の非 `<harnessDir>/`・非 `.agents/`・非 `amadeus/`・非 manifest 宣言)の stale ファイルはどのスキャンにも当たらず、`--check` を exit 0 で通過する。契約が謳う「完全な drift 検出」に穴がある。

## リリース契約(#702 に関連)

- **起動経路**: `.github/workflows/release.yml` の `workflow_dispatch`(inputs: `bump`、`dry-run`)→ `npx release-it` が bump→commit→tag→push を `main` へ直接。初回は `--no-increment`(bootstrap)、`dry-run` は `--dry-run` + `npm publish --dry-run` でリハーサル。
- **同期フック**: `packages/setup/.release-it.json` の `hooks.after:bump` = `bun ../../scripts/release-version-sync.ts ${version} && git add -A :/`。`git.tagName` = `v${version}`、`requireBranch: main`、`requireCleanWorkingDir: true`、`github.release: false` / `npm.publish: false`(publish は release.yml 側)。
- **`release-version-sync.ts <semver>` の契約**: 引数 semver(prerelease サフィックス受理、`:22`)で version 面3点 — `packages/framework/core/tools/amadeus-version.ts` の `AMADEUS_VERSION`、`README.md` のバージョンバッジ、`packages/setup/package.json` — を同期する。いずれかの patchFile で期待パターンが見つからなければ `process.exit(1)`(`:37-40`)。
- **#702 の欠陥**: version 受理は prerelease を許すのに、README バッジの patch 正規表現(`:53-54`)は `X.Y.Z-blue` 固定で prerelease を許さない非対称。prerelease 版へ bump すると次回実行でバッジ patch が exit 1 に張り付き、かつ version.ts を先に書いた後の half-applied 状態を残す。release.yml の1ボタン運用が prerelease 到達時点で前進不能になる。

## Issue #857 差分スキャン（2026-07-23）

現行 `doctor` CLI の外部契約は、各診断行と集計を stdout に出力し、失敗なしで0、失敗ありで1を返すことである。加えて audit 追記、stale lock cleanup、および t37/t83/t210 が固定する spawn CLI/cwd 契約を維持する。これら41ケースは成功しているが、別プロセス実行のため LCOV は1/771行 hit であり、spawn テストだけでは内部分岐のカバレッジを表現できない。

`handleDoctor` は export 済みだが、正式な戻り値 API はなく、in-process テストは `process.exit`・stdout・env の monkeypatch に依存する。6ファイル104ケースは成功し、LCOV 437/771行 hit である。

## Functional Design で確定する契約

候補Aは `runDoctor(): number` とし、出力と診断結果は既存副作用に残す。候補Bは `{ results, output, exitCode }` を返し、薄い CLI wrapper が stdout と `process.exit` に変換する。どちらでも既存 CLI の表示、集計、exit 0/1、audit、cleanup、cwd 契約は不変条件とする。

## 記録系 round-trip PBT が触れる内部契約（260802-record-roundtrip-pbt、履歴、observed `9750f8aea`）

- 判断: 本 intent での実質変更なし — 公開 CLI verb・flag・directive JSON スキーマの追加も変更もない。触れるのは内部関数契約 2 点で、いずれも `architecture.md` 現在節の seam ペア表を正本とする — (1) `readJson<T>`（`amadeus-election-store.ts:71`、`:80` 無検査キャスト）の戻り型契約を「無検査キャスト」から「検証済み値または棄却」へ強める（`Store.load` `:503-510` が呼出元）、(2) 読み側 fail-closed 化により、従来は受理されていた不正記録が `Result` の err 側／throw へ回るため、消費側の分岐が増える。いずれも境界ごとの一本化であり、4 境界を貫く単一の汎用バリデータ API は新設しない。

