# API ドキュメント

## Issue #3029 に関係する内部契約

### Sensor dispatcher の truth table

`amadeus-sensor.ts` の `fire` は per-sensor script の終了状態を `FireOutcome` に分類し、監査イベントへ射影する。branch 0（`error`、`status === null`、`signal === null`）は `script-error: spawn-failed`、branch b（`status === 127`）は `SENSOR_PASSED` と `Note: tool-unavailable`、exit 0 の malformed output やその他の非ゼロ終了は `SENSOR_PASSED` と `script-error:` note になる。

### Blocking completion predicate

`evaluateBlockingSensors(blockingSensorIds, audit, stageSlug, currentDigest?)` は `never-fired`、`unresolved`、`stale`、`script-error` のいずれかを返すか `null` を返す。現行の `null` 条件は最新 terminal が `SENSOR_PASSED`、fire receipt と digest が一致し、note が `script-error:` で始まらないこと。したがって `tool-unavailable` は `null` となり、blocking stage completion を拒否しない。

この API の意味を exit 127 に対して変更する場合、戻り値の finding 種別・拒否メッセージ・t511 の unit/integration fixture・audit-format の `SENSOR_PASSED` 説明を同時に更新する必要がある。RE では互換性の裁定を保留する。

## Lifecycle Guard Runtime の公開契約と新設リファレンス（260814-fmc-macos-provider、履歴、observed `5f6b5bf97`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: observed = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`、差分 base = `89532174c30ef9cc7ff29496cd6916586fdda00a`（9 commits）。正本は `re-scans/260814-fmc-macos-provider.md`。

### 新設リファレンス

`docs/reference/26-lifecycle-guard-runtime.md`（222 行）と対訳 `.ja.md`（214 行）が `0fbbec42b`（#2986）で新設された。**Runtime の意図・信頼境界・不変条件を宣言する文書側の正本**であり、直下の 260813 節が記した「判定語彙 5 系統」問題への回答をここで明文化している（逐語: `those answers were expressed in five different result vocabularies and wired by hand into every commit path, so adding a guard meant editing every handler and a missed wire was a silent fail-open rather than a failing test.`）。文書は Runtime を「既存機構の一般化であって隣に建てた新サブシステムではない」と位置づける。

### 型・関数の公開面（`packages/framework/core/tools/amadeus-lifecycle-guard.ts`、236 行）

| 契約 | 位置 | 形 |
|---|---|---|
| `LifecycleCheckpoint` | `:42-46` | `"intent-birth" \| "stage-completion" \| "phase-transition" \| "workflow-completion"` |
| `GuardAuditDisposition` | `:54` | `"error-logged" \| "none"` — 拒否を監査台帳へ書くか |
| `GuardRefusal` | `:56` | `reason`（先頭に逐語表示）+ `recovery`（末尾）+ `evidence` + `audit` |
| `LifecycleGuardVerdict<P>` | `:74-78` | `allowed`(receipt 任意) / `denied` / `unknown` / `not-applicable` |
| `LifecycleGuardAdapter<C, P>` | `:80-89` | `{ id, checkpoint, order, evaluate(context) }`。`id` は checkpoint 内で一意かつリリース間で安定 |
| `LifecycleGuardDecision<P>` | `:96-111` | `allowed` / `blocked` の判別ユニオン。`blocked` は `policyId` / `blockingKind`（`"denied" \| "unknown"`）/ `refusal` を持つ |
| `evaluateLifecycleGuards<C, P>` | `:208` | `{ checkpoint, targetRevision, context, adapters }` → `LifecycleGuardDecision<P>`。**最初の blocking verdict で停止**。checkpoint 不一致の adapter は `not-applicable` として記録（`:214-218`） |
| `guardReceipt<P>` | `:153` | 許可 adapter が解決した値を取り出す。receipt 不在なら throw（`:161`） |
| `formatGuardRefusal` | `:137` | `reason [+ " " + recovery] [+ " (evidence: k=v; …)"]` |
| `guardAllowed` / `guardDenied` / `guardUnknown` / `guardNotApplicable` | `:118` / `:122` / `:126` / `:130` | verdict コンストラクタ |

`unknown` は `denied` と同じく blocking である。Runtime は同期であり自前の締切を持たない — 時間予算を持つ adapter が失効を `unknown` として報告し、同じ規則でブロックする（`:25-28`）。

**登録 API は存在しない**（`:36-38`）。registry は checkpoint を所有するファイルの module-level frozen 配列（`amadeus-state.ts:329` / `:353` / `:369` / `:387`、`amadeus-utility.ts:4123`）で、プロジェクトはシステム不変ガードを外せない。ユーザ空間の policy は adapter 経由でのみ入る（現状は `stage-completion.blocking-sensors` のみ）。

### 「バイパス不能」は測定述語として固定されている

`tests/integration/t2771-lifecycle-guard-census.integration.test.ts`（155 行）が **ソースを読んで** commit path を全数列挙する（`readFileSync` で `packages/framework/core/tools/` を直読。当該テストは Runtime を import しないため `git grep -l "amadeus-lifecycle-guard"` の 8 ヒットには現れない）。固定する不変条件は 3 つ — `setCheckbox(…, "completed")` を書く全関数が chokepoint を呼ぶこと、各 chokepoint 本体が `evaluateLifecycleGuards` を呼ぶこと、宣言済み registry が**ちょうど 1 本**の commit path から到達されること。5 つ目の完了ハンドラを chokepoint 無しで足すと赤くなる。

jump は phase-transition のみを評価し stage-completion を評価しない（`[S]` / `pending` 化であって完了ではない）。この非対称は文書上も census 上も**意図的**として固定されている。

### 本 intent の患部が触れる公開契約（`plugins/formal-model-check`、base..observed で無変更）

| 契約 | 位置 | 内容 |
|---|---|---|
| `ModelCheckProvider` | `run-model-check-domain.ts:7` | `"auto" \| "sandbox-exec" \| "docker"`。CLI 既定は `auto`（`:240`）、受理値は `parseProvider`（`:191-198`）の 3 値のみ |
| `selectTlcSpawnPlanner` | `tlc-spawn-planner.ts:520-539` | `(provider, config, environment, platform = process.platform) => Result<TlcSpawnPlanner, TlcToolchainError>`。**同期**。明示 `sandbox-exec` × 非 darwin は `PROVIDER_PLATFORM` で拒否 |
| `createNotRunPlannerReceipt` | `tlc-spawn-planner.ts:62-75` | `(provider, platform, runId, priorFailureCode) => EnvReceipt`。`docker` 判定は `provider === "docker" \|\| (provider === "auto" && platform !== "darwin")`（`:68`） |
| `amadeus.env-receipt.v1` | `run-model-check-domain.ts:93-98` | receipt スキーマ。**provider 中立**であり、フォールバック導入に schema 変更は不要 |
| `EnvInspectionId` | `run-model-check-domain.ts:71-76` | `image-digest` / `jar-sha256` / `network-deny` / `jdk-snapshot` / `sandbox-profile` の 5 値。Darwin / Docker の plan は同じ 5 値で not-applicable 理由だけが異なる |
| JDK ピンの**型レベル**契約 | `tlc-toolchain.ts:709-710` | `readonly vendor: "OpenJDK"` / `readonly version: "26.0.1"`。緩和は型変更を要し、`fs-tlc-toolchain.ts:659-660` と `tests/unit/t401-directive-and-toolchain-rejections.test.ts:67-68` へ波及する |
| `ENVIRONMENT_UNAVAILABLE` の文言 | `tlc-spawn-planner.ts:161-165` | `tests/integration/t-formal-verif-run-model-check.integration.test.ts:263-272` が `OpenJDK 26.0.1 verification failed` を 3 箇所で `toContain`。**文言変更は既存テストを赤にする** |

## ライフサイクルガードの内部契約（260813-lifecycle-guard-runtime、履歴、observed `89532174c`。**#2986 着地前の断面**であり、以下のシグネチャ表は移行前のもの。着地後の公開面は上の 260814 節）

**観測 ref**: すべて observed = `89532174c30ef9cc7ff29496cd6916586fdda00a`。差分 base = `854692fd7a11b124236b0427fe3d59e2fe6bf785`（35 commits）。全数列挙（G1〜G40）は `re-scans/260813-lifecycle-guard-runtime.md` を正本とする。

### checkpoint ガードのシグネチャ（observed 断面）

| 契約 | 位置 | シグネチャ / 返り値 | 呼出 |
|---|---|---|---|
| `verifyStageCompletionGuards` | `amadeus-state.ts:2539` | `(pd: string, stage: VerifiableStage): void` — 内部で `verifyStageArtifacts` → `verifyBlockingSensors` を順に呼ぶ。拒否は `error()` = process exit | `:2763` advance / `:2877` finalize / `:3054` complete-workflow / `:3998` approve |
| `verifyStageArtifacts` | `amadeus-state.ts:2460` | `(pd: string, stage: VerifiableStage): void` | `verifyStageCompletionGuards` のみ |
| `verifyBlockingSensors` | `amadeus-state.ts:1835`（export） | `(pd: string, stage: {...}): void` | `verifyStageCompletionGuards` |
| `evaluateBlockingSensors` | `amadeus-state.ts:1752`（export） | → `BlockingSensorFinding \| null`（`never-fired` / `stale` / terminal）。**純関数、exit しない** | 上記 + テスト |
| `verifyPhaseCheckArtifact` | `amadeus-state.ts:392`（export） | `(pd: string, phase: string): void` | `:2775` / `:2926` / `:3059` / `:4009` + `amadeus-jump.ts:581` |
| `verifyPreparedWorkflowCompletion` | `amadeus-state.ts:6011` | `(pd, content, completedSlug, requestedInstance): void` | `:3002` |
| `verifyMandatoryPluginStages` | `amadeus-state.ts:4689` | `(pd, content, completedSlug): void` | `:3008` |
| `authorizeWorkflowCompletion` | `amadeus-workflow-completion.ts:161` | receipt を返す。未確定時は `WorkflowCompletionNotSettledError` を throw（呼出側が catch して `awaitCompletion` / `error()` へ分岐） | `amadeus-state.ts:3030` / `amadeus-orchestrate.ts:613` |
| `IntentOperationGuardResult` | `amadeus-lib.ts:3042`（`:3085` returns） | `{kind:"allowed"} \| {kind:"rejected", error:{..., recovery}}` — **復旧案を型に持つ唯一の系統** | intent 操作（archive / unarchive / select 等） |
| `admitProductionStageFailure` ★ | `amadeus-intent-autonomy-production.ts:1102`（export） | `(input: ProductionStageFailureInput): ProductionStageFailureResult` — 判別ユニオン。`:1128` `return stall === null ? { kind: "error", reason: "repair-stall-envelope-missing" } : { kind: "parked", stall };` | `amadeus-orchestrate.ts:5816` |
| `stageFailureDirective` ★ | `amadeus-orchestrate.ts:5779`（export） | 上記結果を directive へ射影する出口 | `:5816` |
| `commitProductionStageGateDecision` | `amadeus-intent-autonomy-production.ts:794`（export） | `{ readonly kind: "not-authorized"; readonly reason: string } \| ...` | stage gate 梯子 |

> **引用の訂正（2026-08-14、intent `260814-failopen-error-paths`、observed `cd64486a68c6a1144db50fbe3fde8273f5e18455`）**: 上表と下の off-switch 表が引く `verifyBlockingSensors`（`amadeus-state.ts:1835`）は observed `89532174c` 断面の記録であり、**現行断面に当該シンボルの定義も呼出も存在しない**（#2986 の Lifecycle Guard Runtime 移行で置換。`git grep -n "verifyBlockingSensors" -- packages/` は exit 0 / **1 hit** だが、それは `amadeus-sensor-schema.ts:21` の**散文コメント内の stale な言及**であり定義・呼出ではない — この 1 件は未是正で残っている）。現行の対応面（`git grep -n` 実測、observed `cd64486a6`）:
>
> | 旧引用 | 現行 |
> |---|---|
> | `verifyBlockingSensors` `amadeus-state.ts:1835`（export） | Guard adapter `evaluateBlockingSensorGuard`（`:2023-2068`、非 export。registry へは `:347` `evaluate: evaluateBlockingSensorGuard,` で結線）。返り値は `void` ではなく `LifecycleGuardVerdict` |
> | `evaluateBlockingSensors` `amadeus-state.ts:1752`（export） | `evaluateBlockingSensors`（`:1932-1995`、export のまま）。`BlockingSensorFinding` = `"never-fired" \| "unresolved" \| "stale"`（`:1860-1863`） |
> | `blockingSensorGuardDisabled()` `amadeus-state.ts:1817` | `:1997-1999`。`blockingSensorIdsForStage` は `:2004-2013`。off-switch 名 `AMADEUS_SKIP_BLOCKING_SENSOR_GUARD` と cutoff `BLOCKING_SENSOR_CUTOFF_YYMMDD = 260809`（`:846`）は不変 |
> | fail-closed 宣言文字列 | `A blocking sensor that never ran is not a pass.` は **`:2052`**（packages/ 内で単一 hit） |
>
> 履歴節の本文は当時の記録として保存し、行番号のみをこの注記で現行断面へ対応づける。

★ **`admitProductionStageFailure` / `stageFailureDirective` は base 以後の新規契約**（`16d94927d` / #2945）。full autonomy の型付き stage failure を Quality Repair / REPAIR_STALLED へ接続する。移行対象に加算される。

### 判定語彙は 5 系統に分裂している（呼出側契約の非一様性）

(a) `error()` process-exit、(b) 判別ユニオン + `recovery`、(c) boolean、(d) typed error class、(e) `{ok, reason}` Result。`export type ...(Guard|Verdict|Outcome)... =` は core tools で **38 件**（述語は re-scan §2 P6）。単一 Runtime を導入するなら、この 5 系統をどう畳むかが公開面の設計論点になる。

### 環境変数による off-switch 契約（4 種）

| 変数 | 実装 | 消費するガード |
|---|---|---|
| `AMADEUS_SKIP_ARTIFACT_GUARD` | `artifactGuardDisabled()` `amadeus-state.ts:1653` | `verifyStageArtifacts` / `verifyPhaseCheckArtifact`（**共有**） |
| `AMADEUS_SKIP_BLOCKING_SENSOR_GUARD` | `blockingSensorGuardDisabled()` `amadeus-state.ts:1817` | `verifyBlockingSensors` |
| `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` | `humanPresenceGuardDisabled()` `amadeus-lib.ts:5342` | approve/reject gate・delegate-approval・delegate-rejection・question 応答記録 |
| `AMADEUS_SKIP_GATE_REVISION_RECOVERY` | — | gate revision 復旧 |

加えて `BLOCKING_SENSOR_CUTOFF_YYMMDD = 260809`（`amadeus-state.ts:667` / `:1841`）が intent 日付による適用除外を持つ。**これらは公開契約であり、Runtime 化時に意味論を保存する必要がある。**

## coverage 免除台帳のデータ契約（260811-allowlist-semantic-audit、履歴、observed `854692fd7`）

**観測 ref**: すべて observed = `854692fd7a11b124236b0427fe3d59e2fe6bf785`。正本は `re-scans/260811-allowlist-semantic-audit.md`。

`tests/.coverage-patch-allowlist.json` は `tests/coverage-patch-gate.ts` が唯一の読み手となるデータ契約であり、公開 API と同じく**破ると CI が赤くなる**面である。observed 断面の契約は次のとおり（`parseAllowlist` `:360-382` の実読）。

### 受理されるエントリ形状

```
{
  "file":     <repo-relative source path>,
  "selector": { "function": <scope name>,
                "fingerprint": "sha256:<hex>",
                "anchorLines": <positive int>,
                "targetLines": "<n>" | "<n>-<m>" },
  "reason":   <non-empty string>,
  "expiry":   <string, optional>
}
```

- キー和集合は observed で `expiry` / `file` / `reason` / `selector` の 4 つのみ、`selector` は `anchorLines` / `fingerprint` / `function` / `targetLines` の 4 つのみ（`jq` の `keys | add | unique` 実測）。
- **旧形式の絶対行ピン（`lines` キー）は受理されない**。`t229-coverage-patch-gate.test.ts:176` `legacy absolute line pins are rejected` が契約として固定。observed の台帳に残存 **0 件**。
- `selector` に契約外のフィールドを足すと throw（同 `:329`）。`expiry` が string 以外なら throw（同 `:337`）。`targetLines` が `n` / `n-m` 以外なら throw（同 `:321`）。
- `reason` は**空白のみで拒否**（同 `:315` `reason-less entry throws (fail-closed ledger)`）。それ以上の検査は無い。

### 解決契約（fail-closed）

`resolveSemanticSelector(file, source, selector)` は、`selector.function` が指すスコープが**ちょうど 1 つ**でなければ throw し、そのスコープ内で指紋が**ちょうど 1 箇所**に一致しなければ throw する。エラー文言は逐語:

- `coverage-patch-gate: function ${selector.function} in ${file} resolved ${scopes.length} times (expected exactly one)`
- `coverage-patch-gate: source fingerprint for ${file}#${selector.function} resolved ${matches.length} times (expected exactly one)`

いずれも `runCheck` が捕捉し、`coverage-patch-gate: STALE semantic allowlist entry: ...` を stderr へ出して exit 1 を返す（`:552-553`）。ソースが存在しない場合も throw（`:391` `coverage-patch-gate: source not found for semantic allowlist entry: ${entry.file}`）。

`targetLines` は**アンカー窓内の相対**指定であり、絶対行への復元は `:312` 逐語 `return { start: matches[0] + relative.start - 1, end: matches[0] + relative.end - 1 };`。

### 契約が守っていないこと（明示）

`reason` は非空であること以外に一切の契約を持たない。`findStaleAllowlistEntries` / `evaluatePatch` / `allowlisted` のいずれも `reason` を引数に取らないため、**`reason` が解決先の実コードと無関係でもこの契約は破れない**。observed で確定した転位は 18 件（`re-scans/260811-allowlist-semantic-audit.md` §4、全数照合未実施のため下限）。

### CLI 面

`bun tests/coverage-patch-gate.ts --check` が唯一の CI 入口（`.github/workflows/ci.yml` の `Patch coverage gate` ステップ、PR イベント限定）。base ref は環境変数 `AMADEUS_PATCH_BASE_REF` で与える。

## TLA+ receipt API の入力ドメイン（260812-tla-proof-receipt、履歴、observed `854692fd7`）

**観測 ref**: 本節の file:line はすべて observed = `854692fd7a11b124236b0427fe3d59e2fe6bf785`（= 本 worktree HEAD）時点。正本は `re-scans/260812-tla-proof-receipt.md`。パスは `plugins/formal-model-check/tools/` 配下。

### `createVerifiedTlaModelReceipt(source: VerifiedModelSource)`（`tla-model-receipt.ts:89-130`）

- 読む入力は `source.moduleIdentity` / `source.cfgIdentity` / `source.auxIdentities` の 3 つのみ（`:104-112`）
- **identity をバイト列から再計算しない** — 呼び出し元が置いた値をそのままコピーし、`identityInput` オブジェクト全体を `:124-127` でハッシュして `modelIdentity` を作る
- したがって identity のエンコーディングは本 API ではなく `VerifiedModelSource` の**生産者**が決める。現在の生産者は 2 系統あり形式が異なる（loader = デコード済み文字列 `tla-model-loader-internal.ts:279`、referee の `describeMutant` = オブジェクト `{bytes: base64}` `tla-referee-toolchain.ts:47`）。この「コピーであって計算ではない」性質が、2 つのエンコーディングを無検出で共存させている

### `validateVerifiedTlaModelReceipt(input: unknown)`（`tla-model-receipt.ts:142`）

- 名目上の入力は `unknown` だが、**実効的な入力ドメインは「登録済み model-map に存在するモデルの receipt」に限られる**
- 基準値は引数ではなく loader から作られる: `:154` `loadVerifiedTlaSources()` → `:156` `selectVerifiedModel(loaded.value, input.modelName)` → `:158` `createVerifiedTlaModelReceipt(selected.value)`
- 拒否は 2 段階 — 未登録なら `:157` `verified model is unavailable: ${input.modelName}`、登録済みでも identity 比較（`:161-169`）が合わなければ `:169` `"receipt differs from the selected verified model"`
- 形状検査は `exactPlainObject(input, VERIFIED_RECEIPT_KEYS)`（`:145`、実装 `:69-75`）で**キー集合の完全一致**を要求する。union へ新しいメンバを足す設計はこの厳格さを踏まえる必要がある
- ディスパッチャは `validateModelCheckReceipt`（`:184`、`:187` で `isVerifiedTlaModelReceipt` により verified 分岐へ委譲）

### `canonicalIdentity(value, domain)` の呼び出し規約（現状は不統一）

| 呼び出し元 | 渡す値 | file:line |
|---|---|---|
| referee | `{ bytes: Buffer.from(bytes).toString("base64") }` | `tla-referee-toolchain.ts:47` |
| loader | デコード済みソース文字列 | `tla-model-loader-internal.ts:279` |
| toolchain のバイト照合 | デコード済みソース文字列 | `fs-tlc-toolchain.ts:731` |

同じ `domain` に対して 2 種類の入力形式が使われており、同一バイト列から異なる sha256 が出る。この規約は型で強制されていない（`canonicalIdentity` は任意の JSON 値を受ける）。

### `loadVerifiedTlaSourcesInternal(moduleUrl, fs)`（`tla-model-loader-internal.ts:463`）

- 公開 API ではなく test 専用 seam。本番呼び出し元は無引数ラッパ `loadVerifiedTlaSources`（`tla-model-loader.ts:31-33`）を使う契約
- 直上コメント `:461-462` は逐語で `// Internal/test-only seam. Production callers must use the no-argument wrapper` / `// in tla-model-loader.ts so runtime input cannot select a root or filesystem.`
- **この禁止は方針であって能力の制約ではない** — `findRepositoryRoot`（`:151-168`）により root は実際に選択でき、`tests/integration/t403-tla-loader-generalization.test.ts:94-100` が合成ワークスペースでその能力を使っている。選べないのは root から独立した任意の model-map パスのみ

## PR 収束 CLI の外部境界と内部契約（260811-pr-convergence-gate、履歴、observed `854692fd7`）

### External CLI Surface

本リポジトリに HTTP server API はない。Issue #2838 の外部境界は plugin CLI と `gh` である。

#### `create`

```text
bun <harness>/plugins/pr-convergence/tools/pr-convergence-cli.ts create \
  --repo <owner/repo> --head <branch> --title <title> --body-file <path> \
  [--base <branch>] [--record <record> --bolt <slug> --unit <slug>]
```

- linked mode では `--record`、`--bolt`、`--unit` を3点セットで要求する。
- canonical title prefix と `## Amadeus Work` section を追加し、Intent registry の UUID/record path に結び付ける。
- `--head` は `gh pr create` に明示的に渡す。
- 現在は local branch の clean、commit 済み、push 済み、remote head SHA 一致を検査しない。
- 成功 `0`、usage/GitHub boundary failure `2`。

#### `status`

```text
bun <harness>/plugins/pr-convergence/tools/pr-convergence-cli.ts status \
  --repo <owner/repo> --pr <number> --unit <slug> --record <record> [--unlinked true]
```

- GitHub GraphQL snapshot と全 review threads を読み、JSON verdict を stdout に返す。
- `0`: converged または landed、`1`: not converged、`2`: GitHub/parse failure、`3`: linked PR provenance violation。
- `--unlinked true` は PR title/body provenance だけを省略し、GitHub read と convergence 判定は省略しない。

#### `report`

```text
bun <harness>/plugins/pr-convergence/tools/pr-convergence-cli.ts report \
  --repo <owner/repo> --pr <number> --unit <slug> --record <record> [--unlinked true]
```

- current PR state を再評価する。
- active PR が未収束なら exit `1` で report を書かない。
- converged または landed の場合、`<record>/construction/<unit>/code-generation/pr-convergence-report.md` を書く。
- report schema は `converged | override | landed` の3 kind。
- 現在の schema は execution receipt、report digest、audit event ID、signature を持たない。

#### `override`

```text
bun <harness>/plugins/pr-convergence/tools/pr-convergence-cli.ts override \
  --repo <owner/repo> --pr <number> --unit <slug> --record <record> --reason <text>
```

- audit shards 内の最新 `HUMAN_TURN` を要求する。
- 収束済み PR の override を拒否する。
- `amadeus-log.ts decision` の成功後にのみ `override` report を書く。
- PR content provenance 検査は意図的に省略する。

### GitHub Adapter Contract

`pr-convergence-gh-runner.ts` は次を提供する。

- `parsePrRef(repo, number)` — `owner/repo` と正整数 PR 番号を検証する。
- `createGhRunner()` — `gh --version` と `gh auth status` が成功した後だけ runner を返す。
- `fetchRawPrState()` — GraphQL から `mergeable`、`mergeStateStatus`、`title`、`body`、`state`、`mergedAt`、`mergeCommit.oid`、check rollup を1 snapshot で読む。
- stderr 本文は外へ出さず短い SHA-256 digest に変換する。

### Internal Contracts

| Contract | Owner | 概要 |
|---|---|---|
| `ConvergenceReport` | `pr-convergence-cli.ts` | 3 kind の render 入力 union |
| `ConvergenceVerdict` | `pr-convergence-predicate.ts` | merge state と violating thread count による純粋判定 |
| `ThreadLedger` | `pr-convergence-ledger.ts` | paged thread の terminal/non-terminal 集計 |
| `ProvenanceVerdict` | `pr-convergence-provenance.ts` | canonical title/body と record/unit の整合性 |
| `applyPluginScopeBindings` | `amadeus-graph.ts` | host binding を既存 scope row へ加算 |
| `unitCovered` | `amadeus-orchestrate.ts` | per-unit required produces の全件存在判定 |
| `verifyStageCompletionGuards` | `amadeus-state.ts:2539` | direct transition の artifact/sensor chokepoint。呼出 4 経路 `:2763` / `:2877` / `:3054` / `:3998`（observed `89532174c` で再解決、2026-08-14） |
| `evaluateReportFormat` | report sensor | Markdown field shape と自己矛盾の検査 |

### Report Format Sensor Contract

入力は `--stage` と `--output-path`。対象 basename 以外、またはファイル不在は clean pass として扱う。shape finding があっても JSON verdict を stdout に出し exit `0` となる。CLI flag 不備だけが exit `1` である。この advisory 契約は観測には適するが、Issue #2838 が要求する completion gate には不足する。

## テスト時間設定 API の現状（260810-test-time-factor、履歴、observed `ce3c3ccfd`）

| 入力/API | 現状 | 備考 |
|---|---|---|
| `TEST_TIME_FACTOR` | 未実装 | 環境変数参照、parse、scale helper は0件 |
| `--test-timeout-ms <ms>` | 実装済み | `tests/lib/run-tests-args.ts` が正整数と上限を検証 |
| `AMADEUS_TEST_TIMEOUT` | 実装済み | live model/driver 用の秒単位 override。共通係数ではない |

要件化すべき公開契約候補は、未指定時 `1`、有限の正値のみ受理、基準ミリ秒に係数を乗算することである。丸めと上限、明示 `--test-timeout-ms` に係数を掛けるかは requirements-analysis で固定する。

## plugin advisory 宣言の解決契約（260810-plugin-manifest-resoluti、履歴、observed `7b9391be2`）

**観測 ref**: すべて observed = `7b9391be2db4fad791d637293ea442d5a1462bac`。正本は `re-scans/260810-plugin-manifest-resoluti.md`。

Issue #2823 が欠陥とするのは、次の 3 契約の**継ぎ目**である（個々の契約はすべて実装どおりに動く）。

### 契約 1 — manifest 解決（読み手側）

`pluginManifestPath(projectRoot, plugin)` = `<projectRoot>/plugins/<name>/plugin.json`（`amadeus-advisory-declaration.ts:295-297`）が宣言の**唯一の**解決規則。読み手は `declaredAdvisoriesForPlugin`（`:312`）と `declarationFor`（`:392`）の 2 箇所のみ。`projectRoot` は `projectRootForHost(hostRoot) = dirname(hostRoot)`（`amadeus-plugin-activation.ts:110-112`）で導かれる。**manifest 不在はエラーではなく zero-impact**（`:312-313` で `return []`、無音）。`declaredFormalCheckArgv`（`:403-410`）/ `declaredHandoffStage`（`:413-420`）は宣言が読めないとき `null` を返し、呼び出し側（`amadeus-advisory-choice.ts:948-978` / `:729-741`）は route/handoff なしの素の振る舞いへ落ちる — すべて無音。

### 契約 2 — evaluator spawn

`spawnEvaluator(projectRoot)`（`:347-357`）は argv ベクトルを shell なし・`cwd: projectRoot` で同期 spawn する（timeout 60s、maxBuffer 8MiB）。manifest が持つ argv の相対要素は **projectRoot 基準**で解決される。timeout・truncation・非 JSON verdict は unreadable verdict として **hold 方向に fail-closed**（`:340-343` の設計コメント）。出荷 manifest の argv（`plugins/formal-model-check/plugin.json:59-65`）は `:61` が repo ルート相対 `plugins/formal-model-check/tools/tla-authoring.ts` であり、この契約の下では projectRoot に authoring ツリーが在る場合のみ解決する。

### 契約 3 — 供給側（何が consumer の projectRoot に届くか）

- compose は `plugin.json` を**配送しない**（`amadeus-plugin-compose.ts:895` / `:1390-1408` — stages/tools のみ）
- folder-drop（`installDoc` primary 腕、`plugin-projection.ts:634`）は `<harnessDir>/.amadeus-plugin-src/<name>/` にのみ置く — project supply は作られない
- `install <path>` verb は dot-dir ホストへ投げると persistent 腕（`amadeus-plugin.ts:1117-1118`）に入り、**FULL bundle（plugin.json + tools）を `<projectRoot>/plugins/<name>/` へ永続化する**（`:1160`）。永続化の pin は t353 `:254-274`（4 面: project supply / config / staging / composition）と rollback `:276-324`

### ワイヤ上の振る舞いまとめ

| 供給状態 | 発火（checkpoint） | run-now route | handoff |
|---|---|---|---|
| manifest なし（folder-drop / marketplace 経路） | 無音でゼロ | null → 提示なし | null → 素の item |
| manifest あり・argv 解決可（install verb / self-install） | 宣言どおり発火 | 宣言 argv から構築 | 宣言 stage を載せる |
| manifest あり・argv 解決不可（手作り hybrid のみ） | 発火するが unreadable verdict → **hold** | — | — |

## stage-stats attribution API 契約（260809-cg-attribution-stats、履歴、observed `82e2f30c0`）

### CLI 契約

現行 usage は `--project-dir` / `--space` / `--format` / `--json`（`packages/framework/core/tools/amadeus-stage-stats.ts:728-798`）。Issue #2695 は次を追加する。

```text
bun amadeus-stage-stats.ts \
  [--project-dir <path>] [--space <name>] \
  [--stage <safe-slug>] [--outliers <0..100>] \
  [--format markdown|csv|json] [--json]
```

| option | 既定値 | 検証・意味 |
| --- | --- | --- |
| `--stage <slug>` | `code-generation` | 安全な stage slug。attribution target だけを選び、既存の全 stage duration 表は維持する |
| `--outliers <N>` | `10` | 10進整数かつ0〜100。0は outlier 行を表示しないが集計は変えない |

`--outliers -1` / `101` / 小数 / 非数値、値欠落、安全でない stage slug、未知 flag は usage error（exit 2）。安全な stage でも attribution population が0なら exit 0 の正常空レポートで、`n=0` と比率 `n/a` を返す。既存 exit ladder（正常0、unreadable shardを含む部分 sweep=1、usage=2）は `main`（`:941-965`）のまま保存する。

### report semantic model

既存 `StageStatsReport`（`:515-527`）の `scanScope` / `exclusions` / `stages` / `sensors` / `models` / `reviewBuckets` は不変。次の attribution section を同じ report に追加する（名称の最終確定は後続 design stage、意味契約は固定）。

| セクション | 必須意味 |
| --- | --- |
| measurement ref | target stage、scan scope、measured/attribution population、`zero-net-attribution` / `ambiguous-window-identity`、採用・不採用 event rule |
| category stats | category、正の union を持つ `n`、observable duration median/p95、attribution 全窓を母集団とする net share median/p95 |
| coverage stats | observable/unattributable seconds、coverage/unattributable rate の median/p95 |
| overlap stats | category 間で重なった秒数と「category 値を単純加算できない」注記 |
| outliers | `unattributableSeconds` 降順上位N。tie は `intent → startedAt → completedAt` 昇順 |
| missing instrumentation candidates | candidate×reason、`unattributableRate > 0.5` 件数、exact lifecycle の terminal 欠落。`candidateBoundary` 仮説は observed facts と別フィールド |
| methodology | event→category rule、identity key、stage identity、half-open、clip、idle subtraction、category/global union、除外条件 |

各 window の機械契約は次である。

```text
observableSeconds + unattributableSeconds = netSeconds
coverage + unattributableRate = 1
0 <= observableSeconds <= netSeconds
```

category share は `categoryUnionSeconds / netSeconds`。category 間の overlap を許すため、その合計を100%にしない。category 名は lifecycle 名であり、`sensor-execution` を「検証時間」、`unit-pool-lifecycle` を「実装時間」へ変換しない。

### event / event-set 入力契約

| family | start | terminal | identity | stage identity |
| --- | --- | --- | --- | --- |
| Sensor | `SENSOR_FIRED` | `PASSED` / `FAILED` / `BUDGET_OVERRIDE` | `Fire id` | `Stage slug` |
| Execution event set | inner `operation-started` | inner `operation-finished` | `operationId` | outer/inner `origin.stage` |
| Unit-pool event set | inner `unit-acquired` | inner `unit-settled` | `attemptId` | 同 envelope 内の明示 stage 属性 |
| Bolt/Swarm/Subagent/Loop monitor/Merge dispatch/transaction | event固有 | event固有 | event固有 | 明示 `Stage` / `Stage slug` / `origin.stage` |

intent と target stage は完全一致のみ。window containment / timestamp containment は stage identity API ではない。missing stage/start/terminal/identity、duplicate start/terminal、terminal<=start、malformed/digest/duplicate event set は fail-closed の理由コードとして出力し、区間を作らない。`GATE_*` は idle subtraction で消費済みなので candidate category API から除外する。

Execution contract は operation lifecycle と `origin.stage` を定義済み（`amadeus-execution-contract.ts:30-46`, `:101-154`）。一方、現 execution decoder は invalid inner を silent skip する（`amadeus-execution-lifecycle.ts:336-359`）、unit-pool decoder は throw と Event Set ID dedup を行う（`amadeus-unit-pool-runtime.ts:113-159`）。本 report API はこの差を隠さず、candidate×reason で malformed/duplicate を観測可能にする。

### 出力形式の同値契約

Markdown（`:632-667`）、CSV（`:676-699`）、JSON（`:701-723`）は同じ semantic model を描画する。見た目の表現は異なっても、target、母集団、rule、exclusion、category/coverage/overlap/outlier/missing-instrumentation の値は一致しなければならない。JSON は Map を決定的配列へ変換する現行 ordering 契約を維持し、Markdown/CSV の外部値 sanitization と CSV quoting も維持する（`:582-603`, `:670-673`）。

実 corpus 相当サイズでは、Markdown/CSV consumer が EOF まで読め、JSON は pipe 後に `jq empty` が成功することを契約に含む。既存 #2700 テストは JSON 約104 KiBだけを証明する（`tests/integration/t487-stage-stats.integration.test.ts:337-389`）ため、3形式を個別に64 KiB超へする fixture が必要である。

## 監査 journal の wire 契約と正規化 API（260807-intent-2328-tests-e2e-au、履歴、observed `a5621236c`）

### wire 形の2版

| 版 | 定数 | キー |
|---|---|---|
| v1 | `JOURNAL_SCHEMA_VERSION = 1`（`amadeus-journal.ts:30`） | `event` / `heading` / `fields` |
| v2 | `JOURNAL_SCHEMA_VERSION_V2 = 2`（`:34`） | `eventName` / `attributes`（`attributes.Event` が旧 `event`） |

v2 serializer は `serializeJournalEntryV2`（`:329-345`）で、キー順を固定して1エントリ1行を出力する（`schemaVersion` / `eventId` / `seq` / `timestamp` / `eventName` / `attributes` / `intentId` / `space` / `cloneId` / `traceId` / `spanId` / `traceFlags` / `idempotencyKey` / `canonical`）。

リーダー契約は `JOURNAL_SCHEMA_VERSION_MAX` 以下の全版を受理し、それより新しい版を拒否する（BR-10）。

### 読み取り側の正準 API（`tests/harness/audit-records.ts`）

| 関数 | 所在 | シグネチャ相当 | 挙動 |
|---|---|---|---|
| `normalizeAuditRecord` | `:26` | `(raw: unknown) => NormalizedAuditRecord` | `schemaVersion !== 2` は素通し。v2 は `attributes.Event` → `event`、`EVENT_HEADINGS` 経由で `heading` 復元、`attributes` → `fields` |
| `auditRowsFrom` | `:49` | `(body: string) => NormalizedAuditRecord[]` | 行分割 → 空行 skip → 全行 parse（不正行は loud fail） |
| `countAuditEvent` | `:57` | `(body: string, event: string) => number` | 両スキーマ横断の計数 |

`NormalizedAuditRecord` は `{ event: string \| null; fields: Record<string, string>; [key: string]: unknown }`。

**依存**: `:18` で `EVENT_HEADINGS` を `../../dist/claude/.claude/tools/amadeus-audit.ts` から import（sandbox 配布形での解決性が理由、コメントに明記）。

## 決定的レポート CLI の契約生態（260807-stage-perf-report、履歴、observed `4a3da7d62`）

本節の file:line はすべて observed `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0` 時点。差分 base は `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（祖先性 exit 0、距離 12 commits / 108 files）。全数列挙は `re-scans/260807-stage-perf-report.md` を正本とする。

### `amadeus-subagent-stats.ts` — read-only 決定的レポータの既習契約

新規レポート CLI がもっとも近縁とする core tool。**契約は逐語で継承できるが、コードの大半は file-private である。**

| 契約要素 | file:line | 内容 |
| --- | --- | --- |
| Usage 行（第一級の doc） | `packages/framework/core/tools/amadeus-subagent-stats.ts:3` | `//   Usage: bun amadeus-subagent-stats.ts [--project-dir <path>] [--space <name>] [--json]` |
| 引数 parse | `:412-431` | parse-don't-validate。未知フラグ / 値のないオプションは `{error}` を返す |
| 測定 ref 先頭出力 | `:192-197` | 出力の第一節が measured at / scan scope / shards / events |
| `--json` の安定順序 | `:174-176, 237-254` | `Record<string, unknown>`。Map は `sortedEntries`（件数降順・キー昇順）で平坦化 |
| exit 階梯 | `:463-465` | `0` 正常 / `1` コーパスの穴（`unreadableShardCount > 0`）/ `2` 使用法エラー |
| in-process seam | `:433` / `:468` | `export function main(argv: readonly string[]): number` + `if (import.meta.main) process.exit(main(process.argv.slice(2)));` — lcov 計測可能性の要（`cid:requirements-analysis:bun-coverage-spawn-blindspot`） |
| UNKNOWN / ADR-5 | `:141-148` | 非空の `Model` のみ計数、それ以外は `unresolvedModelCount` を増やす。"absence is the record of absence" |
| no-silent-drop | `:323-340` | 行ごとに `parseSkipped` を計数し隠さない。`continue` が "the explicit terminal the no-silent-drop rule requires" |
| レンダー時点サニタイズ | `:178-187` | 監査値は信頼境界の外。`sanitizeAdvisoryValue` はレンダー時のみ。compose と `--json` は verbatim |

**export 面の再利用可能性:**

| 面 | 行 | export | 汎用性 |
| --- | --- | --- | --- |
| `recordFromLine` | `:278` | **なし** | 2 スキーマ正規化そのものが import 不能 |
| `scanAuditCorpus` | `:345` | あり | `ScannedAudit.records: readonly SubagentAuditRecord[]` に hard-wire。イベント型に汎用でない |
| `composeStatsReport` / `renderStatsText` / `serializeStatsReport` | `:105` / `:191` / `:237` | あり | subagent 固有の純関数 |

すなわち**「拡張 vs 新設」は import 可能性だけでは決着しない** — 移送可能な資産は契約であってコードではない。

### `amadeus-journal.ts` — 使われていないスキーマ非依存 API

core に export 済みの正規化層が実在し、`amadeus-subagent-stats.ts` はこれを**迂回している**。

| 関数 | 行 |
| --- | --- |
| `isJournalEntryV2` | `packages/framework/core/tools/amadeus-journal.ts:103` |
| `journalRecordKey` | `:109` |
| `journalRecordField` | `:130` |
| `parseJournalLine` | `:481` |
| `splitJournalLines` | `:501` |
| `readJournalRecords` | `:534` |
| `mergeShards` | `:612` |

`journalRecordField` の doc（`:113-129`）は逐語で *"the NormalizedJournalRecord view (domain-entities.md) the tool readers consume **so they never branch on the schema version**"* と述べる。`.claude/tools/amadeus-journal.ts` が self-install ツリーに実在するためハーネスへも出荷される。

**反対圧力（設計判断であることの根拠）:** `amadeus-subagent-stats.ts:21-23` が逐語で *"This module deliberately does NOT import amadeus-lib.ts (the FD fixes the dependency direction stats -> observability only); the two small path idioms it needs are mirrored locally."* と依存方向の裁定を記録している。`resolveProjectDirLocal`（`:377`）/ `activeSpaceLocal`（`:390`）はローカル再実装。

### `amadeus-observability.ts` — 書き手 seam、CLI なし（名前空間使用不可）

384 行。**`import.meta.main` なし・argv 処理なし・サブコマンドなし**（`process.argv|subcommand|import.meta.main` の grep で 0 hit）。export は全てライブラリ関数（`appendTelemetryEvent:244` / `observe:309` / `observeSubprocess:362` ほか）。ヘッダ `:1-19` の契約は `observability.enabled` による opt-in、machine-local な `<record>/.amadeus-otel/buffer-<clone>.jsonl` への追記、そして **fail-open**（*"a buffer write failure never throws into the caller"*）。

**提案されている読み手は fail-closed であり契約が正反対。** 名前空間は使用不可（クロスレビュー reviewer-1 の指摘は observed で成立）。

### `amadeus-runtime.ts summary` — 遡及不能な契約

`summarize()`（`:1067-1070`）は `runtimeGraphPath(projectDir)` の `existsSync` を見て JSON を読むだけで、ヘッダ `:982-984` が逐語で *"Reads the materialised snapshot only — **never re-walks audit**"* と宣言する。`RuntimeSummary`（`:1019-1044`）は `workflow_id` / `scope` / `started_at` / `duration_minutes` / `stages{}` / `by_phase` / `memory{}` / `sensors{}` / `learnings{}` を持つが、**per-stage 所要時間・モデル・レビューイテレーションを持たない**。

遡及は構造的に不可能である: `.gitignore:71` = `amadeus/spaces/*/intents/*/runtime-graph.json`、`git ls-files | grep -c runtime-graph.json` → **0**。`.claude/skills/amadeus-session-cost/SKILL.md`（`classification: read-only`、*"This skill does no counting of its own"*）はこの薄いラッパであり、単一ワークフロー限定。

### レビューブロックの parse 契約

書き手は `packages/framework/core/tools/amadeus-reviewer-runtime.ts:96-97`:

```ts
const REVIEW_MARKER = (iteration: number): string =>
  `## Review — Iteration ${iteration}`;
```

（em-dash U+2014、両側に半角スペース。`:629` で書き込み、`:659` で冪等性検査。）

ブロック本体は `reviewBlock`（`:618-644`）が emit し、`ReviewResult`（`:80-89`）が `verdict: "READY" | "NOT-READY"` / `iteration: number` / `reviewer: string` を型で固定する。フィールドパーサ `reviewField`（`:672-677`）は `^- \*\*<Label>:\*\* (.+)$` の**ちょうど1件**の一致を要求する（`if (matches.length !== 1)`）。**これが読み手が写すべき parse 契約である。**

**実コーパス（observed 再計測）: 1,010 ブロック / 691 ファイル。** うちサフィックス付き見出し `## Review — Iteration 2（rebase後・裁定A反映）` が **3 件**で、これが様式ドリフトの全数。書き手自身のマッチャ `existingReviewBlock`（`:660`）は `/^## Review(?:[ \t].*)?$/gm` で走査してから trim 完全一致でフィルタするため、サフィックス付き見出しは**見出しとしては発見されるが iteration N としては一致しない**。読み手は同じ二段構えを採り、残差を**捨てるのではなく parse 不能として計数**すべきである。

## subagentStartFields の契約と2 payload 形状（260807-subagent-start-pair、履歴、2026-08-08、observed `5f2ad9195`）

測定 ref は observed `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b`。全数列挙は `re-scans/260807-subagent-start-pair.md`。

### シグネチャと入口ガード

`packages/framework/core/tools/amadeus-lib.ts:4160-4161` verbatim:

```ts
export function subagentStartFields(payload: ClaudeCodeHookInput, agentsDir?: string): Record<string, string> | null {
  if (payload.tool_name !== undefined && payload.tool_name !== SUBAGENT_DISPATCH_TOOL) return null;
```

| 要素 | 契約 |
|---|---|
| `payload` | `ClaudeCodeHookInput`。`tool_name?: string`（`:4774`、**optional**） |
| `agentsDir`（任意） | 与えられると #2279 の帰属拡張（`Type Verdict` / `Model` / `Model Source`）が加わる。拡張は advisory で、内部失敗時は追加フィールドを落とし基本3フィールドを保つ（NFR-3、`:4155-4159` のコメント） |
| 戻り値 `null` | 「この payload は subagent dispatch ではない」— 呼び出し側は emit せず exit 0 |
| 戻り値 `Record<string,string>` | 監査フィールド集合。`Agent Type`（必須、未知は `normalizeAgentType` が `"unknown"` へ）、`Agent ID`（任意）、`Purpose`（任意） |

### 入口ガードの真理値表 — `undefined` 短絡が語彙とは別軸である

ガードは2項の AND であり、`tool_name` の**不在**と**不一致**を区別する:

| `payload.tool_name` | 判定 | 意味 |
|---|---|---|
| `undefined` | **通過**（第1項が false で短絡） | 「subagent でしか発火しない seam」= kimi の `SubagentStart` |
| `SUBAGENT_DISPATCH_TOOL` と一致 | 通過 | tool envelope 経由の dispatch |
| それ以外の文字列 | `null` | `TaskUpdate` / `Write` 等の誤爆を拒否 |

設計意図は `:4149-4153` に逐語で記載（`Absence of tool_name therefore means "a seam that only fires for subagents", not "unknown tool".`）。

**契約上の帰結**: #2303 の語彙修正が触るのは**第2項の比較対象**のみ。第1項の `undefined` 短絡は kimi 経路の存在条件であり、いかなる修正形でも通過側に残さねばならない。回帰ピンは `tests/unit/t-subagent-purpose.test.ts:82-86` に既存。

### 定数 API

`packages/framework/core/tools/amadeus-lib.ts:4125-4128` verbatim:

```ts
// The tool whose invocation opens a subagent on the harnesses that have no
// dedicated start event (Claude Code): the start seam there is PreToolUse, and
// PreToolUse fires for EVERY tool.
export const SUBAGENT_DISPATCH_TOOL = "Task";
```

| 属性 | observed |
|---|---|
| 型 | `string`（単数） |
| 消費者 | **1箇所のみ** — `:4161` のガード。repo 全域 grep（dist/self-install 除く）で他の消費者なし |
| 派生的な同期面 | `tests/.coverage-registry.json:4250` の `unitId: "function:SUBAGENT_DISPATCH_TOOL"` |

**API 形状の制約**: 単数型のため、複数語彙を受理する設計（例 `["Task","Agent"].includes(...)`）は**集合型への型変更**を要し、定数名（したがって coverage registry の `unitId`）の同期も伴う。単一語彙の置換であれば型・名前とも不変。

### matcher と payload — 2つの独立した名前空間

| 面 | 供給元 | 照合対象 | 語彙修正の対象か |
|---|---|---|---|
| settings matcher `^Task$` | `settings.json.example:62` | ハーネスが持つ**ツール表示名** | **対象外** |
| payload `tool_name` | Claude Code の PreToolUse payload | フック側の実データ | **対象** |

`amadeus-lib.ts:4145-4147` はこの二重防御を逐語で説明する（`The settings matcher is an UNANCHORED regex, so "Task" also matches TaskUpdate/TaskCreate — without this check every todo-list write would append a phantom subagent.`）。matcher はアンカー付き（`^Task$`）で第1防御、in-hook ガードが第2防御。**両者は独立して評価される**ため、matcher を変えずに payload 語彙だけを直す修正が成立する。

### emit 側の契約

`packages/framework/core/hooks/amadeus-log-subagent-start.ts`:

| 行 | 契約 |
|---|---|
| `:64` | `subagentStartFields(parsed, join(projectDir, harnessDir(), "agents"))` — `agentsDir` を常に供給 |
| `:65` | `if (started === null) process.exit(0);` — 唯一の中断点、silent |
| `:98` | `appendAuditEntryViaEvents("SUBAGENT_STARTED", fields, projectDir)` — 唯一の emit |
| `:99-101` | catch → `recordHookDrop(projectDir, "log-subagent-start", errorMessage(e))` — **fail-open**（append 失敗と同じ drop 経路） |

`ensureOtelBootstrap(projectDir)` が emit 直前（`:97`）に走る。

### 閉包検証に使える既存 API 形

`tests/integration/t-log-subagent-start.integration.test.ts` の `taskDispatch` ヘルパ（`:104-108`）は `{hook_event_name:"PreToolUse", tool_name:"Task", tool_input}` を組みフックを spawn する。`runHook`（フック spawn + `CLAUDE_PROJECT_DIR` 指定 + `seededAuditDir`/`seededStateFile` で3ゲート充足）と `fieldsFor(proj,"SUBAGENT_STARTED")` の組み合わせが、**Unit B の閉包を決定的に実証できる既存 API 形**。`tool_name` を live 語彙へ切り替えるだけで転用可能。

**ただし Unit A（live 配線）の閉包はこの API 形では実証できない** — テストは `CLAUDE_PROJECT_DIR` を fixture プロジェクトへ向けフックを直接 spawn するため、`.claude/settings.json` を一切読まない。

## project-dir 解決 API と CLI 契約（260807-projectdir-worktree-fix、履歴、2026-08-07、observed `4a3da7d62`）

本節の測定 ref はすべて observed `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`。差分 base は `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（12 commits）。全数列挙は `re-scans/260807-projectdir-worktree-fix.md` を正本とする。

### 公開関数の契約

| 関数 | 所在 | シグネチャ | 段数 | loud path |
|---|---|---|---|---|
| `resolveProjectDir` | `packages/framework/core/tools/amadeus-lib.ts:226-250` | `(explicitDir?: string) => string` | 4 + fallback | **ゼロ**（`sed -n '226,250p' \| grep "console\|warn\|throw"` → exit=1、出力なし） |
| `resolveProjectDirFromHook` | 同 `:310-347` | `(importMetaUrl: string, payloadCwd?: string \| null) => string` | 5 + fallback | ゼロ |
| `stripProjectDir` | 同 `:212-224` | argv から `--project-dir` を剥がす共有ヘルパー | — | — |
| `hasWorkspaceMarker` | 同 `:283-286`（非 export） | `(dir: string) => boolean` | — | — |
| `findWorkspaceMarkerAncestor` | 同 `:290 付近`（非 export） | cwd から祖先方向へ marker 探索 | — | — |

**契約上の欠落**: どちらの解決関数も、解決結果が呼び出し元の期待と食い違ったことを**呼び出し元へ伝える手段を持たない**。返り値は常に `string` であり、「確信度の低い fallback に落ちた」ことを表現しない。ケース B（cwd=worktree × lib=本線絶対パス）は、この契約のもとでは**正常な返り値**として本線パスを返す。

### CLI 引数契約 — `--project-dir`

段1（明示指定）の受け口は広く実装済みで、`"--project-dir"` を parse するツールは **18ファイル**。

```
advisory-choice / audit / bolt / finding / goal / jump / lib / log / migrate /
mirror-lifecycle / mirror-presentation / orchestrate / sensor-model-completeness /
state / subagent-stats / swarm / utility / worktree
```

正本の使用例は `packages/framework/core/amadeus-common/protocols/stage-protocol.md:1209-1216`（`amadeus-finding.ts create-github-issue --project-dir <workspace-root>`）。

### プロトコル文書の指示 — 相対形と絶対形の衝突

`stage-protocol.md:511` verbatim:

> **CWD drift warning**: If a stage runs `cd` in Bash (e.g., `cd todo-app/server && npm install`), subsequent `bun {{HARNESS_DIR}}/tools/...` calls using relative paths will fail with "Module not found". Always use absolute paths to the tools directory for tool calls (on Claude Code, `$CLAUDE_PROJECT_DIR/.claude/tools/`), or run `cd` commands in subshells: `(cd subdir && npm install)`.

この1行は**絶対形（`$CLAUDE_PROJECT_DIR` 展開）を推奨する**が、その形こそがケース B を生む。ただし同じ文中に既に代替（サブシェル `(cd subdir && ...)`）が明記されており、相対形を保ったまま CWD drift を避ける手段は正本にすでに書かれている。

### settings allowlist の契約

```
packages/framework/harness/claude/settings.json.example:10   ← 正本
.claude/settings.json:39                                      ← セルフインストール面（tracked）
      "Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)",
```

allowlist が許可するのは絶対形のみ。一方で正本スキルの起動行は**全 31 件が相対形**であり、絶対形の起動行は正本に存在しない（唯一の絶対形出現は上記 allowlist 自身）。allowlist と実際の呼び出し形が対応していない。


## fail-closed ガードの回復経路（260807-failclosed-recovery-path、履歴、2026-08-07、observed `b8e3e664f`）

本節の file:line はすべて observed `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d` 時点。差分 base は `7060956c5617125dd2f4e284957aa180cb306484`（祖先性 exit 0、距離 76 commits / 1223 files）。全数列挙は `re-scans/260807-failclosed-recovery-path.md` を正本とする。

### CLI 契約（回復 verb の不在が観測される面）

| ツール | 現行 verb / フラグ | 回復面 |
| --- | --- | --- |
| `tests/no-silent-drop-gate.ts`（36行） | `check` / `census-evidence` / `approve-evidence` / `baseline-candidate` ＋ `[--base-revision <full-sha>]`（usage 逐語） | 判定のみ。`package.json` の `"no-silent-drop": "bun tests/no-silent-drop-gate.ts check"` |
| `scripts/no-silent-drop-evidence.ts`（270行） | **`rebind` / `reconcile` の2つのみ**（usage `:32-33`、分岐 `:59` / `:63`、実行 `:253`）。`rebind --target-revision <full-sha>` / `reconcile --event-revision <full-sha> --repository <owner/name>` | **evidence 再生成 verb は存在しない** |
| `scripts/no-silent-drop-retention.ts`（175行、新規） | 引数なし = dry-run、`--apply` のみ（`parseArgs` `:28`） | snapshot 書込と列挙済み ULID の削除。維持系であり drift 回復ではない |
| `packages/framework/core/tools/amadeus-advisory-choice.ts` | **`record` / `correct-misattributed` の2 verb のみ**（USAGE `:1516-1520`、dispatch `:1522-1532`） | **schema 1 store からの回復 verb は存在しない** |

### `no-silent-drop-gate.ts check` の呼び出し規約（ローカル実行の前提）

`--base-revision` を省略すると必ず次を返す:

```json
{"code":"BASELINE_INVALID","detail":"check mode requires a non-zero trusted base revision"}
```

exit 2。**これは欠陥ではなく規約である**:

- `tests/no-silent-drop/engine.ts:250-252` が `trustedBaseSha` の null を拒否する。
- `tests/no-silent-drop/ledger.ts:213-223` の解決順は explicit → `AMADEUS_NSD_TRUSTED_BASE_SHA` → `GITHUB_BASE_SHA` → `GITHUB_EVENT_BEFORE`。
- base は **HEAD の厳密祖先**でなければならない。HEAD 自身を渡すと `"trusted base is not a strict ancestor of HEAD: b8e3e664f…"` / exit 2。

CI 側の base 解決（`.github/workflows/ci.yml:121-157`）は PR = base SHA、push = before SHA、`workflow_dispatch` = `HEAD^`。いずれも 40 桁小文字 SHA・非全零・`git cat-file -e` を検証したうえで `timeout 30s bun run no-silent-drop -- --base-revision "${BASE_REVISION}"` を実行する。

### エラーコード契約（#2313）

| コード | 発生点 | 意味 | 回復 |
| --- | --- | --- | --- |
| `REBIND_NON_IDENTITY_DRIFT` | `scripts/no-silent-drop-evidence-adapter.ts:226-240` | "current binding is reachable but evidence freshness paths changed"（逐語） | **なし**（throw であり、`scripts/no-silent-drop-evidence.ts:162-171` の回復分岐は `currentBindingIsValidForEvent` が false のときだけ走る） |
| `REBIND_PR_LANDING_TREE_MISMATCH` | 同 `:316-324` | "final pull request head and landing commit root trees differ"（逐語） | 第1段（`:305-315`）は `EVIDENCE_BUNDLE_PATHS` の3ファイルを除外した tree 比較の形を既に持つ |
| `REBIND_PREFLIGHT_FAILED` / `REBIND_CREDENTIAL_FAILED` / `REBIND_CHECKOUT_FAILED` | `.github/workflows/no-silent-drop-evidence-reconcile.yml` | preflight 失敗を step summary へ出す | ワークフロー面 |
| `BASELINE_INVALID` | `tests/no-silent-drop/engine.ts:250-252` | trusted base 未指定・非祖先 | 呼び出し側で `--base-revision` を与える（上記規約） |

失敗時の envelope 実文（run 31135902843 のジョブログからの転記）:

```json
{"schemaVersion":1,"operation":"no-silent-drop-evidence-rebind","status":"error","code":"REBIND_NON_IDENTITY_DRIFT","eventRevision":"b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d","bindingRevision":"fe8c701ba15c0677a4ec18cc3715ff1086318dde","targetRevision":"b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d","changed":false,"counts":{"registryRevisions":0,"manifestRevisions":0,"runRevisions":0,"artifactDigests":0,"receiptDigests":0},"paths":[],"validation":{"ok":false,"problems":[]},"error":{"code":"REBIND_NON_IDENTITY_DRIFT","message":"current binding is reachable but evidence freshness paths changed"}}
```

成功側の envelope は `{"schemaVersion":1,"status":"pass","code":"NO_SILENT_DROP_OK","findings":[]}`（gate check、ローカル実測 exit 0）。`evidence-rebind.ts:40` の status 語彙は `"changed" | "no-op" | "superseded" | "error"`。

### advisory choice store のオンディスク契約（#2330）

| 要素 | 契約 | 実装 |
| --- | --- | --- |
| store 本体 | `schema: 2` のみ受理 | `parseStore` `:659-661` が `value.schema !== 2` で reject |
| store 不在 | 空の schema 2 を返す | `readStore` `:681-691`（**不在時のみ**。既存 schema 1 ファイルは parse 失敗） |
| pending エントリ | `schema: 1` を要求 | `parsePending` `:640-651` が `value.schema !== 1` を拒否 |
| 失敗時の呼び出し側挙動 | `!storeResult.ok` → fail-closed hold | 設計コメント `:653-657` が明文で意図として記す |
| guard の起動条件 | pending が非空のときのみ | `amadeus-orchestrate.ts:797-799` `if (pending.length === 0) return directive;` |

**契約上の欠落**: schema 1 → 2 の遷移は「翻訳しない」と明示的に決めているが、**遷移を人間の操作で完了させる契約が無い**。pending が schema 1 のまま受理される点は、回復契約を設計するうえで利用可能な既存面である。

### engine の degrade 経路契約（#2358）

全被覆時の error directive 文言（`amadeus-orchestrate.ts:3727-3731` 逐語）:

- `"Every one of them already holds this stage's required artifacts, so no unit is left to run."`
- `"Create the unit directory for this piece of work (its name becomes the unit segment of every artifact path), then re-run `next`."`

被覆述語 `unitCovered`（`:3746-3760`）は **produces の実在のみ**で判定し §12a Review の記録有無を見ない（#2359 と共有する述語）。単一 unit（`:3807`）は covered でも解決してステージゲートを運ぶ。

**契約上の非対称は意図的**: `tests/integration/t367-degrade-unitname-resolution.test.ts:411-420`（test 13、multi-unit 全被覆 → refuse）と `:428-437`（test 14、"a lone finished unit still resolves, carrying the stage gate"）が両側を pin し、`:422-426` のコメントが E-OBB2-CG1 を「INTENTIONAL と裁定した非対称」と明記する。`amadeus/spaces/default/memory/project.md:287` の `cid:code-generation:c1-degrade-batch-directive-capture` も逐語で「全 unit covered 後の engine emit は裁定 B（E-OBB2-CG1）どおり fail-closed のため、build 時捕捉が唯一の in-band 経路」と記す。したがって**契約文は既に正しく、欠けているのは宣言的な回復入口**である。

### 引用の currency

#2385 の測定 ref は `b8e3e664f` であり本 intent の observed と**完全一致**する。したがって全 file:line 引用は observed 断面で同一に解決する（区間実測による currency の確定であり、免除の主張ではない）。実読で確認した軽微な差は re-scan 記録の § 行番号引用の currency を参照（いずれも ±2 行の範囲指定差で、指す構文要素は同一）。


## cross-harness resume が対象とする契約（260805-cross-harness-resume、履歴、observed `7060956c5`）

本節の file:line はすべて observed `7060956c5617125dd2f4e284957aa180cb306484` 時点。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（距離 34 commits / 493 files）。全数列挙は `re-scans/260805-cross-harness-resume.md` を正本とする。

### 認可ゲートが掛かる CLI 面（利用者可視契約）

| ツール | ゲートされる語彙 | 実装 |
| --- | --- | --- |
| `amadeus-orchestrate.ts` | `next` / `report` / `park` / `gate-reserve` / `gate-reject` | `:2400` `refuseUnauthorizedKimiCaller` を `:2446` / `:4543` / `:5099` / `:5326` / `:5387` で呼ぶ |
| `amadeus-state.ts` | `get` / `count` / `lookup` **以外の全27語彙**（`case "park"` `:1024`、`case "unpark"` `:1027` を含む） | `:902` `enforceCallerAuthorization`、除外は `:908-912` |

**契約上の欠落**: park 時の復旧文言は `unpark` を案内するが、その `unpark` が同じゲートの内側にある。**拒否状態からの復旧を約束する CLI 契約は存在しない**（`amadeus-utility.ts` の verb dispatch を全数確認、`session-repair` 系 grep 0 hit）。`doctor` は kimi hook の配線のみを検査し、carrier 状態を診断する契約を持たない（carrier ファイル名の grep 0 hit）。

### エラー契約

`callerAuthorizationError(role)`（`amadeus-caller-authorization.ts:117-122`）が返す文言は role を埋め込む1形のみ。`role` が取る値は:

- `"unknown"` — deny ラッチ（`:85`）／ marker 不読・不正（`:94`）／ `.current-session` 不一致・読取例外（`:105` / `:108`）の**4原因すべて**
- 実 role 名（`:111-115`、`roles` の sorted first）— subagent 在席

**したがって現行のエラー契約は原因を判別可能に伝えない。** 復旧手順も含まれない。既存テストは substring assert（`tests/integration/t365-kimi-reviewer-boundary.integration.test.ts:504` ほか）のため、判別値や復旧ガイドを追加しても既存契約は破れない。

### 環境変数契約

`AMADEUS_HARNESS_TYPE`（`amadeus-harness.ts:114-116`）はハーネス種別の明示指定として最優先で読まれる。**kimi 以外の値を与えると `amadeus-caller-authorization.ts:75` の早期 return が発火し、Kimi の認可境界が完全に無効化される**（対照実験で実測）。この副作用は docs に記載がない — 認可に影響する env として文書化するか、認可判定では env を無視するかは要裁定。

### 文書契約との不整合

`docs/guide/11-session-management.md:7` は次を宣言する:

> **Harness note.** Session resume works on every harness (the state lives in the intent's record dir, not the harness).

この宣言は intent record（状態層）については正しいが、**per-clone な `.current-session` carrier と Kimi 認可判定は「どのハーネスでも resume 可」を保証しない**。`kiro-ide` / `opencode` / `pi` は carrier を書かないため、これらから Kimi への引き継ぎは構造的に拒否される。

## advisory のdirective／report契約（260803-advisory-human-choice、履歴、observed `498c3034a`）

### 現行wire契約

- `run-stage` directive は `advisories` を省略可能フィールドとして持ち、各要素の `plugin`、`code`、`message`、`stage` をconductorへ渡す（`amadeus-directive.ts:140`）。engineはadvisoryがある場合だけフィールドを載せる。
- mainと`--single`はいずれもactivation結果をdirectiveへ載せる（`amadeus-orchestrate.ts:1307`, `:1325`）。同一runでは `(plugin, code)` latch により最大1回の発行となる。
- main report（`:3955`）とsingle report（`:4159`）の入力flagには、advisoryに対する人間選択、相関ID、鮮度、receipt参照がない。
- `HUMAN_TURN`は人間が入力した事実、`GATE_APPROVED`はstage gate承認を表す。どちらもadvisoryの `plugin` / `code` と選択内容を結ばないため、advisory receiptとして解釈しない。

### 未承認の契約論点

- Issue #2129 が想定する「今すぐ実行」と「リスクを認識して延期」の意味を、どの入力面で受け、どの遷移まで有効とするかはRequirements Analysisで決める。
- main / `--single` / per-unitを同じ意味契約にし、receiptなし、stale、spec変更、新run、replay、再入を区別できる必要がある。ただし具体的なJSON shape、CLI flag、state field、event名は未決定である。
- protected writerを採用する場合、一般audit CLIからの自己mintを拒否することが境界条件になる。これはセキュリティ要件候補であり、現行APIではない。

## subagent 型規律と model 属性が対象とする契約（260805-subagent-type-guard、履歴、observed `7060956c5`）

本節の file:line はすべて observed `7060956c5617125dd2f4e284957aa180cb306484` 時点。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（34 commits / 493 files）。全数列挙は `re-scans/260805-subagent-type-guard.md` を正本とする。

### core 純関数のシグネチャ契約（`packages/framework/core/tools/amadeus-lib.ts`）

| 関数 / 定数 | 座標 | シグネチャ | 契約 |
| --- | --- | --- | --- |
| `normalizeAgentType` | `:4082-4084` | `(raw: string \| null \| undefined) => string` | 空・空白のみ → `"unknown"`、それ以外は **verbatim 返却**。所属検査は契約に含まれない |
| `subagentPurposeLine` | `:4109-4114` | `(prompt: unknown) => string` | 非 string → `""`。escape 正規化 → 初行 → control 除去 → trim → `SUBAGENT_PURPOSE_MAX_LENGTH` 切詰の固定順 |
| `subagentStartFields` | `:4128-4139` | `(payload: ClaudeCodeHookInput) => Record<string,string> \| null` | `null` = 「subagent dispatch ではない」。`tool_name` 不在は「subagent 専用 seam」を意味し通過する（`:4129` の `!== undefined` ガード） |
| `SUBAGENT_DISPATCH_TOOL` | `:4102` | `"Task"` | dispatch tool 名の canonical 値。**Claude Code `2.1.222` の実 payload は `"Agent"`** |
| `SUBAGENT_PURPOSE_MAX_LENGTH` | `:4097` | `200` | `Purpose` の上限 |

`subagentStartFields` の返却キー集合は `"Agent Type"`（常在）/ `"Agent ID"`（`payload.agent_id` が非空文字列のときのみ）/ `Purpose`（導出結果が非空のときのみ）。

### hook 入力型の契約

`ClaudeCodeHookInput`（`:4687-4707`）の宣言済みフィールド: `hook_event_name` / `session_id` / `cwd` / `tool_name` / `tool_input`（内部に `file_path` / `command` / `status` / `activeForm` + `:4698` の index signature）/ `reason` / `source` / `prompt` / `agent_type` / `agent_id` / `last_assistant_message`、末尾 `:4706` に `[key: string]: unknown;`。

**`model` は未宣言**だが index signature があるため、`model?: string` の追加は既存消費者に対して非破壊である。型ガードは `isClaudeCodeHookInput`（同ファイル、`ClaudeCodeHookInput` 直後）。

### 実測された hook payload の wire 契約

Claude Code `2.1.222`（live 実測、2026-08-05）:

| seam | top-level キー | model |
| --- | --- | --- |
| `PreToolUse` | `cwd` / `effort` / `hook_event_name` / `permission_mode` / `prompt_id` / `session_id` / `tool_input` / `tool_name` / `tool_use_id` / `transcript_path` | **不在**（`tool_input.model` は Agent ツールへ `model:` を明示指定した場合のみ出現） |
| `SubagentStop` | `agent_id` / `agent_transcript_path` / `agent_type` / `background_tasks` / `cwd` / `effort` / `hook_event_name` / `last_assistant_message` / `permission_mode` / `prompt_id` / `session_crons` / `session_id` / `stop_hook_active` / `transcript_path` | **不在** |

`PreToolUse` の `tool_name` は **`"Agent"`**（`"Task"` ではない）。`tool_input` のキーは `description` / `prompt` / `run_in_background` / `subagent_type`（+ 明示時 `model`）。`effort` は両 seam に常在するが model ではない。

Codex（fixture `tests/fixtures/codex-hook-payloads/payloads.json` の `subagentStop`、CLI 0.137.0 捕捉）:

```json
{"keys":["agent_id","agent_transcript_path","agent_type","cwd","hook_event_name",
         "last_assistant_message","model","permission_mode","session_id",
         "stop_hook_active","transcript_path","turn_id"],
 "model":"openai.gpt-5.5","agent_type":"default","tool_name":"ABSENT"}
```

→ **`model` はハーネス別に供給有無が異なる。** `tool_name` が `ABSENT` である点も Claude Code と異なる wire 契約である。

### audit イベントの属性契約（`core/otel/event-registry.ts`）

| イベント | 座標 | name | required | optional | durability / category / schemaVersion |
| --- | --- | --- | --- | --- | --- |
| `SUBAGENT_STARTED` | `:612-623` | `amadeus.subagent.started` | `["Agent Type"]`（`:620`） | `["Agent ID","Purpose"]`（`:621`） | canonical / `subagent` / 1 |
| `SUBAGENT_COMPLETED` | `:624-632` | `amadeus.subagent.completed` | `["Agent Type"]`（`:629`） | `["Agent ID","Message"]`（`:630`） | canonical / `subagent` / 1 |

**model 属性はどちらにも宣言されていない。** CAP-2 で追加する場合は optional 集合への追記が候補（§ 未承認の契約論点）。

### otel resource / metric キーの契約

| キー | 宣言 | 本番供給 |
| --- | --- | --- |
| `amadeus.harness.version` | `resource-suppliers.ts:23` | — |
| `gen_ai.request.model` | 同 `:24` | **0 件**（resource 面。`supplyResourceAttribute(` の本番呼出は `amadeus-session-start.ts:148` の `"session.id"` のみ） |
| `session.id` | 同 `:25` | 1 件 |
| `amadeus.agent.role` | 同 `:26` | — |

別軸として `core/otel/metrics-instruments.ts:102` が `"gen_ai.request.model": usage.model` を metric 属性に載せる（resource ではない）。

### 集計 API の契約

`composeSubagentLifetimes`（`core/otel/subagent-lifetime.ts:112`）: `(records: readonly JournalRecord[]) => SubagentLifetime[]`。START / COMPLETE を **Agent ID 優先 → 型 fallback（LIFO）** でペアリングする。audit journal を入力に取る唯一の subagent 集計 API だが**本番消費者 0 件**。

`amadeus-runtime.ts summary` は `runtime-graph.json` を対象とし `Agent Type` / `SUBAGENT` を一切扱わない（grep 0 件）ため、型別・model 別集計の host にはならない。

### 未承認の契約論点（Requirements Analysis で決める）

- **D-1 の修正形**が `SUBAGENT_DISPATCH_TOOL` の型（単一文字列 / 集合）を変えるか、照合そのものを `tool_input.subagent_type` の実在判定へ置換するか。後者は `:4133-4137` が明示する `TaskUpdate` / `TaskCreate` 誤検知の防波堤を失う。
- **model 属性の記録先**が audit の optional 属性か `gen_ai.request.model` resource key か両方か。前者は registry の optional 集合改訂、後者は `supplyResourceAttribute` の本番結線を伴う。
- **許可集合照合の advisory 面の wire**（警告をどこへ出すか — stderr / audit event / 集計 CLI の verdict）は未決。CAP-1 は advisory であり fail-closed 拒否をしないことだけが確定している。
- **既存テスト契約の改訂範囲**: `tests/unit/t-subagent-purpose.test.ts:89` / `:96` / `:97` / `:101` が `tool_name: "Task"` をピンしている。`cid:reverse-engineering:c1-pinned-behavior-ruling` により改訂は要件段の裁定事項。
- `Purpose` / `Message` の非対称は設計意図であり、統合は要件化されていない。
## semi 再定義と autonomy 起動宣言が対象とする契約（260805-semi-redefine-autonomy-f、履歴、observed `2f255bc69`）

本節の file:line はすべて observed `2f255bc6993316f1a271bcd932fabf773096494e` 時点の実測（canonical 側 `packages/framework/core/`）。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（区間 19 commits / 464 files）。全数列挙は `re-scans/260805-semi-redefine-autonomy-f.md` を正本とする。

### `amadeus-bolt.ts` サブコマンド — 現行は17種、autonomy 系は8種

有効サブコマンドの正本は `:1201` のエラー文字列。**17種**が列挙される: `start`, `complete`, `fail`, `abort`, `preview-autonomy`, `set-autonomy`, `decide-question`, `observe-quality`, `resume-quality`, `list-auto-decisions`, `get-auto-decision`, `review-auto-decision`, `approve-batch`, `dispatch-event`, `hold-merge`, `release-merge`（`:1199-1203` の default 分岐）。

autonomy 支援コマンドは `handleAutonomySupportCommand` のテーブル（`:1212-1221`）が持つ **8種**。

| サブコマンド | dispatch 登録 | ハンドラ実体 |
| --- | --- | --- |
| `set-autonomy` | `:1213` | `handleSetAutonomy` `:1051-1092` |
| `preview-autonomy` | `:1214` | `handlePreviewAutonomy` `:897-907` |
| `decide-question` | `:1215` | `handleDecideQuestion` `:909-925` |
| `observe-quality` | `:1216` | — |
| `resume-quality` | `:1217` | — |
| `list-auto-decisions` | `:1218` | `handleListAutoDecisions` `:961-973` |
| `get-auto-decision` | `:1219` | — |
| `review-auto-decision` | `:1220` | — |

`get-auto-decision` / `review-auto-decision` は区間内で追加された（`2e990c45a` / #2229）。

> **履歴節との差分（陳腐化の是正）**: 本文書の 260804 履歴節は「サブコマンド5種追加」として `set-autonomy(:1117)` / `preview-autonomy(:1118)` / `decide-question(:1119)` / `observe-quality(:1120)` / `resume-quality(:1121)` を記す。これらは **observed `b938898f3` 時点では正しい**（`cid:requirements-analysis:historical-section-cite-check-at-observed` により履歴節は書き換えない）。区間内で `amadeus-bolt.ts` に `100/1` の変更（ハンク `@@ -954,0 +961,90 @@` ほか）が入り、**`:961` 以降が +96 行シフト**したため、observed `2f255bc69` では上表が正である。

### `set-autonomy` の flag 契約と `--policies-file` の無音破棄

`handleSetAutonomy`（`:1051-1092`）が受ける flag と検証:

| flag | 位置 | 制約 |
| --- | --- | --- |
| `--mode` | `:1053-1055` | `none` / `semi` / `full` の3値。値域外は `error` |
| `--policies-file` | `:1067` | `readDecisionPolicyInputs` で JSON 配列（`{sourceText, selector, optionId}`）として読む。不正形は `:884` / `:892` で `error` |
| `--confirmed-display-digest` | `:1068` | `full` への遷移で `preview-autonomy` の digest 照合に使う |

**契約の穴**: `:1067` は mode に依存せず policies を読むが、`amadeus-intent-autonomy-production.ts:417` の `if (input.mode === "full")` 分岐により、非 `full` は `prepareNonFullCommand`（`:382-395`）へ進む。この関数のシグネチャは `(before, mode)` のみで `policies` を**受け取らない**。したがって `set-autonomy --mode semi --policies-file <json>` は **exit 0 のまま policies を黙って捨てる**。observed 時点では `semi` が pre-decision policy を使わないため実害はないが、公開 flag が受理して無視する状態は契約として不整合である。

### state 書込と互換投影

`handleSetAutonomy` の state 書込（`:1071-1080`）:

| フィールド | 値 |
| --- | --- |
| `Intent Autonomy Mode` | `flags.mode`（`none` / `semi` / `full` そのまま、`:1072`） |
| `Intent Grant` | `applied.projection.currentGrant?.grantId ?? "none"`（`:1073-1078`） |
| `Construction Autonomy Mode`（互換投影） | `flags.mode === "full" ? "autonomous" : "gated"`（`:1071`、`setFieldStrict` `:1079`） |

互換投影は **`semi` と `none` をともに `gated` へ潰す**。この投影を消費する外部契約の再定義後の妥当性は要検討。

### `--status` の Autonomy 出力（既存の公開表示契約）

`amadeus-utility.ts` の `--status` は autonomy を8行で出す。

- 供給元: `readStatusAutonomy` `:323-334`（fail-soft catch あり）、呼び出し `:381`
- レンダラ: `renderAutonomyStatus` `:336-350`
- 合流: テキスト面 `:493`、JSON 面 `:488`
- 行構成: Autonomy / Grant / Grant Scope / Workflow State / Policies / Unreviewed / Stop Reason / Resume

**statusline には autonomy 表示がない**（`grep -n -i "autonom" packages/framework/core/hooks/amadeus-statusline.ts` → 0 hit、observed 実測。ファイル全体 325 行、セグメント組み立ては `:203-206`）。`--status` は出すが statusline は出さない、という表示面の非対称が実在する。

### `--autonomy` 起動フラグ — 現行契約に不在

コード面の実装は **0 件**（`grep -rn -- "--autonomy" packages tests docs .claude scripts specs plugins contrib` → 0、observed 実測）。新設する場合の解釈点は `amadeus-orchestrate.ts:1044-1074` の flag parser。既存の値付きフラグはいずれも `i++` で値を consume しており、consume しないと `:1072-1073` の `!a.startsWith("--")` 分岐で値が intent 自由文へ漏れる（`:1068-1069` のコメントが根拠）。

autonomy は状態変更であるため read-only フラグの絶対優先梯子（`:1014-1016`）へは置けない。契約形の候補は「print directive として `amadeus-bolt set-autonomy` を名指しする」（birth の `birthPrintDirective` `:2617-2646` が先例）だが、**未確定**。

### directive スキーマ側の autonomy 契約（区間内変更なし）

`amadeus-directive.ts:97` — `intent_autonomy_mode?: "semi" | "full";`（検証器 `:606`）。**`none` を値域に持たない**点は再定義後も変わらない見込みだが、`semi` の意味が変わればこのフィールドを消費する conductor 側の解釈が変わる。

## phase boundary approval が対象とする契約（260804-phase-boundary-approval、履歴、observed `b938898f3`）

本節の file:line はすべて observed `b938898f364160d4b5857e153579b40b5ab18372` 時点。差分 base は `9458bbda85eb7257310a80882b4858dc6ce3d1fc`（距離 134 commits / 1041 files）。全数列挙は `re-scans/260804-phase-boundary-approval.md` を正本とする。

### run-stage directive スキーマの追加フィールド（`amadeus-directive.ts`）

| フィールド | 宣言 | 型 | 検証器 |
| --- | --- | --- | --- |
| `phase_boundary` | `:144-149` | `"ideation" \| "inception" \| "construction"`（optional） | `:633-637` |
| `next_stage` | `:143` | `string \| null`（optional） | `:617-619` |
| `intent_autonomy_mode` | `:97` | `"semi" \| "full"`（optional） | `:606` |
| `autonomy_auto_approve` | `:98` | `boolean`（optional） | `:607` |
| `intent_grant_id` | `:99` | `string`（optional） | `:608` |
| `quality_repair` | `:100` | `"active" \| "error"`（optional） | `:609` |

既知キー配列への登録は `:403-411`。`phase_boundary` の意味は宣言コメント `:144` に明記されている — `the phase whose verification artifact must exist BEFORE this gate is approved`。`:146-147` により **scope override 適用後**に算出されるため、phase の通常の最終ステージが skip された早期退出も覆う。

engine 側の算出は `amadeus-orchestrate.ts:2160-2166`（`node.phase` が ideation / inception / construction かつ次が別 phase のとき設定）、autonomy の射影は `:2181-2196`。

### `amadeus-state.ts approve` / `reject` の flag 追加

| flag | 読取位置 | 制約 |
| --- | --- | --- |
| `--target-intent-id <uuid>` | `:3684` | `--presence-reservation-id` と**対で必須** |
| `--presence-reservation-id <uuid>` | `:3685` | `--target-intent-id` と**対で必須** |
| `--defer-workflow-completion` | `:3686` | **最終 in-scope stage 限定**（`:3468-3470` で違反時 `error`） |

`reject` も同じ presence 対を受ける（usage 文字列 `:3945`、読取 `:3950-3953`）。

対の必須性は `amadeus-approval-authorization.ts:26-28` が強制する（`hasTarget !== hasReservation` → `{kind:"invalid", reason:"partial authorization carrier"}`）。

### 承認権限の分類契約（`amadeus-approval-authorization.ts`、80行）

`:20-48` `classifyApprovalAuthority(input): ApprovalAuthority` — 3値を返す。

| 戻り値 | 条件 |
| --- | --- |
| `{kind:"invalid", reason:"partial authorization carrier"}` | target / reservation の片方だけ（`:26-28`） |
| `{kind:"invalid", reason:"malformed targeted human authority"}` | target あり かつ（userInput 欠 / `operatingMode !== "solo"` / target が UUIDv7 でない / reservation が UUIDv4 でない）（`:30-37`） |
| `{kind:"targeted-human", userInput, targetIntentId, reservationId}` | 上記を満たす（`:38-43`） |
| `{kind:"normal"}` / `{kind:"normal", userInput}` | target なし（`:45-47`） |

### authorized 承認経路の出力契約 — 単一 JSON 行

`:55-80` `parseApprovalProcessResult(result)` が承認サブプロセスの結果を解釈する。**stdout は `{"kind":"approved"}` の1行のみ**が受理される。

| 入力 | 戻り値 |
| --- | --- |
| `exitCode !== 0` | `{kind:"fatal-error", detail}` |
| stderr 非空 | `{kind:"protocol-error", detail:"approval process wrote stderr"}` |
| stdout が複数行（`/^[^\r\n]+\n?$/` 不一致） | `{kind:"protocol-error", detail:"approval stdout must be one JSON line"}` |
| JSON parse 失敗 | `{kind:"protocol-error", detail:"approval stdout is not JSON"}` |
| `kind !== "approved"` またはキーが `kind` 以外を含む | `{kind:"protocol-error", detail:"unknown approval JSON shape"}` |
| 上記以外 | `{kind:"approved"}` |

消費側は `amadeus-orchestrate.ts:4445` `handleAuthorizedApprovalReport(pd, slug, authority)`、dispatch は `:4728`。**前身の `amadeus-grant-authorization.ts` は区間内で削除された**ため、本文書の同ファイルに対する過去記述はすべて observed と不整合である。

### `amadeus-bolt.ts` サブコマンド5種追加

| サブコマンド | dispatch |
| --- | --- |
| `set-autonomy` | `:1117` |
| `preview-autonomy` | `:1118` |
| `decide-question` | `:1119` |
| `observe-quality` | `:1120` |
| `resume-quality` | `:1121` |

既存 `approve-batch` は `:1091`。`observe-quality` / `resume-quality` / `decide-question` はいずれも machine-local な carrier JSON を `--input <carrier>` で受け、結果を envelope で返す（`stage-protocol.md:131`, `:133`）。利用者が carrier JSON を書くことはない。

### config canonical key の破壊的再編（`amadeus-config.ts`、771行）

フラットキーはドットパスへ置換された。canonical path は `:59-64` の型宣言に列挙される6本で、実体は `AMADEUS_CONFIG_REGISTRY`（`:472` 以降）が持つ。各エントリは `legacy: { key, valueConversion }` を伴い、旧フラットキーは**移行入力としてのみ**解釈される。

| canonical path | 定義 | legacy key | 値変換 | 既定値 |
| --- | --- | --- | --- | --- |
| `intent-mirror.github.issue.mode` | `:474` | `auto-mirror` | `unchanged` | `"prompt"` |
| `intent-mirror.github.project.targets` | `:483` | `mirror-projects` | `unchanged` | `[]` |
| `solo-election.trigger.mode` | `:492` | `auto-solo-election` | **`false -> manual; true -> auto`** | `"manual"` |
| `finding.github.issue.creation.mode` | `:504` | `auto-file-findings` | `unchanged` | `"prompt"` |
| `swarm.unit.concurrency.limit` | `:513` | `max-parallel-units` | `unchanged` | `4` |
| `plugin.activation.names` | `:522` | `plugins` | `unchanged` | `[]` |

`plugin.activation.names` だけ `layers: ["project"]` に限定され、他5本は `ALL_LAYERS = ["project","space","intent"]`（`:470`）である。**`swarm.unit.concurrency.limit` は新規キーではなく `max-parallel-units` の改名**である（Developer scan の「新規」判定を実読で訂正）。

### election `--trigger` の受理値

`amadeus-election.ts:66` の usage は `[--trigger manual|auto]` — 受理値は **`manual` / `auto` の2種**である。旧 `auto-solo` は受理されず、solo 経路の拒否は `:460` の `out({ opened: null, reason: "solo-election-manual-trigger-required" })` で表明される。flag 名の正規化は `:754` の `"--trigger": "trigger"`。config 側の対応キーは `solo-election.trigger.mode`（`amadeus-config.ts:492`、legacy `auto-solo-election` を `false -> manual; true -> auto` で変換）。

## no-silent-drop evidence 再バインドが対象とする契約（260804-evidence-revision-rebind、履歴、observed `9458bbda8`）

本節の file:line はすべて observed `9458bbda85eb7257310a80882b4858dc6ce3d1fc` 時点。全数列挙は `re-scans/260804-evidence-revision-rebind.md` を正本とする。本 intent が触れるのは公開 CLI 契約ではなく、**台帳3層の内部束縛契約とゲート CLI の subcommand 面**である。

### 台帳束縛契約（すべて内部・検証器が強制）

| 契約 | 強制点 | 破れたときの problem 文字列 |
| --- | --- | --- |
| registry の receipt は top-level revision と一致 | `repository-adoption.ts:182` | `receipt <id> revision mismatch` |
| registry の receipt digest は manifest 由来 digest と一致 | `repository-adoption.ts:183-187` | `receipt <id> evidence digest does not match repository evidence` |
| manifest top-level revision は期待 revision と一致 | `repository-adoption-evidence.ts:360` | `evidence manifest revision mismatch` |
| manifest entry revision は期待 revision と一致 | `repository-adoption-evidence.ts:197` | `evidence <id> revision mismatch` |
| 成果物レコードの revision は manifest entry と一致 | `repository-adoption-evidence.ts:268` | `<label> revision mismatch` |
| 成果物 digest は実バイト digest と一致 | `repository-adoption-evidence.ts` の `artifactDigests` 経路 | `artifact digest mismatch` |

`canonicalBinding()`（`repository-adoption-evidence.ts:333-351`）が `entry.testedRevision`（`:337`）と成果物の実バイト digest（`:343`）の両方を digest 入力に取るため、これらは**独立に満たせる契約ではなく3層の不動点**をなす。

### ゲート CLI 契約

- `engine.ts:49` `export type Mode = "check" | "census-evidence" | "approve-evidence" | "baseline-candidate";` — **4種のみ**。
- 出力は `tests/no-silent-drop-gate.ts:35` `process.stdout.write(\`${JSON.stringify(result)}\n\`)` の JSON 一本。
- **台帳を書く subcommand は存在しない。** 再バインドを CLI 契約として表現するなら `Mode` の拡張（= 公開 CLI 契約の追加）になる。この選択は未裁定。
- 検証者向け注意: `bun tests/no-silent-drop-gate.ts` は引数なしでも exit 0 で usage JSON を返す。**exit code で可否を読まないこと**（両クロスレビューの手法メモ）。

### CI 契約

- 必須チェックは ruleset `main`（id `18843917`、`enforcement: active`）の `required_status_checks` = `['CI Success']` **1件のみ**。classic protection は `branches/main/protection` が 404 `Branch not protected`。
- `CI Success` は集約ジョブ: `ci.yml:893` `ci-success:` / `:894` `name: CI Success` / `:896` `needs:` / `:897-905` の9依存 / `:906` `if: ${{ always() }}`。Issue 本文の `ci.yml:894-906` は observed では **`:893-906`**（精密化）。

### t413 assertion 契約（#2156 と #2153 の切り分け）

| 行 | assertion | 帰属 |
| --- | --- | --- |
| `:157` | `git cat-file -e ${registry.currentRevision}^{commit}` → 0 | **#2156**（fresh clone 形・CI の実失敗行） |
| `:158-163` | `merge-base --is-ancestor currentRevision headRevision` → 0 | **#2156**（オブジェクト在るフルクローン形） |
| `:164` | `validateEvidenceRegistry(registry, registry.currentRevision)` → `{ok:true}` | どちらでもない（自己参照的期待値のため現状は緑。**不完全な再バインドでここが赤になる**） |
| `:165-173` | `git diff --name-only ${currentRevision}..${headRevision} -- packages/framework/core/tools ':(glob)tests/no-silent-drop/**/*.ts'` が空 | **#2153**（path spec が被検査対象 `core/tools` を含む） |

両者は独立であり、#2156 を再バインドで閉じても #2153 の面は生き続ける。ただし**同一テスト・同一 test 名**を共有するため、片方だけ直しても test 名単位では赤が残りうる。

## state integrity が対象とする契約（履歴: 260803-state-integrity、2026-08-03、observed `6c15af23a`）

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

- **起動経路**: `.github/workflows/release.yml` の `workflow_dispatch`(inputs: `bump`、`dry-run`)→ `scripts/release-land.ts` が version surface を bot PR と merge queue で着地させ、squash commit に `vX.Y.Z` を打つ。初回は `--bootstrap`(tag only)、`dry-run` は lander `--dry-run` + `npm publish --dry-run` でリハーサル。
- **同期**: `scripts/release-land.ts` が `packages/setup/package.json` を bump したあと `bun scripts/release-version-sync.ts ${version}` を呼ぶ。GitHub Release と npm publish は release.yml 側。
- **`release-version-sync.ts <semver>` の契約**: 引数 semver(prerelease サフィックス受理、`:22`)で version 面3点 — `packages/framework/core/tools/amadeus-version.ts` の `AMADEUS_VERSION`、`README.md` のバージョンバッジ、`packages/setup/package.json` — を同期する。いずれかの patchFile で期待パターンが見つからなければ `process.exit(1)`(`:37-40`)。
- **#702 の欠陥**: version 受理は prerelease を許すのに、README バッジの patch 正規表現(`:53-54`)は `X.Y.Z-blue` 固定で prerelease を許さない非対称。prerelease 版へ bump すると次回実行でバッジ patch が exit 1 に張り付き、かつ version.ts を先に書いた後の half-applied 状態を残す。release.yml の1ボタン運用が prerelease 到達時点で前進不能になる。

## Issue #857 差分スキャン（2026-07-23）

現行 `doctor` CLI の外部契約は、各診断行と集計を stdout に出力し、失敗なしで0、失敗ありで1を返すことである。加えて audit 追記、stale lock cleanup、および t37/t83/t210 が固定する spawn CLI/cwd 契約を維持する。これら41ケースは成功しているが、別プロセス実行のため LCOV は1/771行 hit であり、spawn テストだけでは内部分岐のカバレッジを表現できない。

`handleDoctor` は export 済みだが、正式な戻り値 API はなく、in-process テストは `process.exit`・stdout・env の monkeypatch に依存する。6ファイル104ケースは成功し、LCOV 437/771行 hit である。

## Functional Design で確定する契約

候補Aは `runDoctor(): number` とし、出力と診断結果は既存副作用に残す。候補Bは `{ results, output, exitCode }` を返し、薄い CLI wrapper が stdout と `process.exit` に変換する。どちらでも既存 CLI の表示、集計、exit 0/1、audit、cleanup、cwd 契約は不変条件とする。

## 記録系 round-trip PBT が触れる内部契約（260802-record-roundtrip-pbt、履歴、observed `9750f8aea`）

- 判断: 本 intent での実質変更なし — 公開 CLI verb・flag・directive JSON スキーマの追加も変更もない。触れるのは内部関数契約 2 点で、いずれも `architecture.md` 現在節の seam ペア表を正本とする — (1) `readJson<T>`（`amadeus-election-store.ts:71`、`:80` 無検査キャスト）の戻り型契約を「無検査キャスト」から「検証済み値または棄却」へ強める（`Store.load` `:503-510` が呼出元）、(2) 読み側 fail-closed 化により、従来は受理されていた不正記録が `Result` の err 側／throw へ回るため、消費側の分岐が増える。いずれも境界ごとの一本化であり、4 境界を貫く単一の汎用バリデータ API は新設しない。

## Election CLI 契約（履歴、Issue #2813、observed `c0f9edf2782`）

### 現行 CLI

```text
bun <harness-dir>/tools/amadeus-election.ts <open|notify|vote|status|tally|render|verify|next|report>
  --election <id> --file <path> --result <r> --resolution <r>
  --transport <agmsg|subagent> --team <t> --from <name>
  --send-script <path> --trigger <manual|auto> --project <dir>
```

Definition は `{ electionId, kind, question, choices, voters }`、ballot は `{ electionId, voter, voterKind, choiceInternalNo, goa, reservation, rationale, submittedAt, receivedAt? }` である。amend はこれに `kind: "amend"` と `{ electionId, voter, submittedAt }` の `ref` を加える。いずれも question ID を持たない。

`next` の directive は `distribute` / `collect-wait` / `tally-ready` / `render` / `verify` / `done` / `hold`。`hold` は `reason` 1件だけを返す。`report --result hold-resolved --resolution ...` は選挙全体を `tallied` または `collecting` に戻し、tie/split では `choice:<internalNo>`、block/quorum/discussion では理由別の固定語彙を受理する。

Store の読み取り API は次の単問 shape を返す。

- `Store.load`: `{ election, state }`。state は election 全体で1件。
- `Store.status`: `{ voted: string[], pending: string[], state }`。question ごとの未回答を表さない。
- `Store.ledger`: `{ ballots, late }`。`resolveBallots` は voter だけで最新票を選ぶ。
- `tally.json`: `{ result, talliedAt, ballots, resolutions }`。`result` は `TallyResult` 1件。

### 必要な契約差分

- Definition: stable ID を持つ `questions[]`。各問が自身の choices を所有する。
- Ballot: `responses[]` または同等の question-keyed collection。各 response が choice / GoA / reservation を所有する。
- Tally: question ID ごとの result collection と、established/hold の混在を表す election summary。
- Directive/status: held / unsettled question IDs を返し、再議論・amend・rerun の対象を明示する。
- Hold resolution: resolution を question ID へ帰属させ、成立済み問を変更対象から除外する。
- Record/verify: question ごとの裁定、GoA、留保、response completeness を deterministic order で検証する。

後方読み取りは「旧 definition を新 canonical model の1問へ decode」する API 境界で実現し、新形式専用 parser へ即時置換して既存 `election.json` を読めなくすることはできない。`readTally` の raw JSON cast と `JSON.stringify` 同士の tally equality は、多問 schema 導入時に typed parser / canonical equality へ置き換える必要がある。

## PR convergence 契約（履歴、Issue #2985、observed `0fbbec42bb33d625bdb9d034789c0ff391df1287`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

### CLI

```text
create --repo <owner/repo> --head <branch> --title <text> --body-file <path>
       --record <record-root> --bolt <bolt-name> --unit <unit-name> [--base <branch>]
status|report|override --repo <owner/repo> --pr <number>
       --record <record-root> --unit <unit-name> [--reason <text>]
```

`ConvergenceOptions` は `unit: string` を必須とし、linked create は `{ record: string, bolt: string, unit: string }` の全組または全欠落だけを受理する（`plugins/pr-convergence/tools/pr-convergence-cli.ts:368-393`）。複数 Unit flag や Bolt から Unit 集合を解決する API はない。

### PR provenance と attestation

PR title は `[<intent>/<bolt>/<unit>] <summary>`、body の `## Amadeus Work` は Intent / Bolt / Unit / Record / UUID を各1件持つ。`AmadeusWorkFields` は単数 shape で（`plugins/pr-convergence/tools/pr-convergence-provenance.ts:8-14`）、title/body/期待 Unit の不一致を拒否する（同 `:179-206`）。既存 PR 再利用時も CLI は Unit と Bolt を再検証する（`plugins/pr-convergence/tools/pr-convergence-cli.ts:928-942`）。

`ReportAttestation` は `id, intent, intentUuid, record, bolt, unit, repo, pr, localHead, remoteHead, prHead, contentDigest` を持つ（`plugins/pr-convergence/tools/pr-convergence-attestation.ts:9-22`）。sensor は report owner path から Unit を導出し `receipt.unit` と一致させ、PR field、3 heads、current checkout、audit receipt を検査する（`plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts:145-180`）。

### 欠落契約

Delivery Bolt の `units[]` を解決し、1つの PR attestation を複数 Unit report の正規 evidence として投影する契約がない。候補Aでは aggregate と projection API が必要になり、候補Bでは Delivery Planning が複数 Unit Bolt を拒否して既存 API を正準 cardinality とする。選択は requirements に保留する。

## 260814-unit-failure-autoelectio (2026-08-14, observed `cd64486a6`) — failure ruling と election open の契約

### 1. `next` が返す ask directive（`amadeus-orchestrate.ts:4069-4075`）

`transition.kind === "await-unit-ruling"` のとき、`askDirective`（`:1042-1044`、`return { kind: "ask", question }`）で以下の question を返す。

```
Unit "<unit>" failed during <stageSlug> (attempt <n>, batch <b>; siblings: <unit:outcome, ...|none>). Choose exactly one: Retry, Skip, or Abort. The answer is committed through the ordinary ask report path.
```

**現契約の性質**: この emit は無条件である。入力に config も autonomy mode も取らない。前段の条件は parked 分岐（`:4056-4062`）と runtime population 絞り込み（`:4064-4068`）のみ。

### 2. 裁定の commit 契約（`report --user-input`）

- 受け口: `amadeus-orchestrate.ts:6161-6169`。発火条件は `flags.result === undefined` かつ `answer ∈ {retry, skip, abort}` かつ `canonicalConstructionFailurePending(...)`（`:3922-3936`）
- 委譲先: `handleFailureRuling`（`:6507` `export function`）
  - `--user-input` は retry / skip / abort に限定（`:6521`）。それ以外は拒否
  - solo バッチ識別子は `solo:<n>` 形式を検証（`:6522-6524`）
  - `retry` → solo は `amadeus-bolt.ts start`、swarm は `pool.retryFailedUnit` + `preparedSwarmRetryDirective`
  - `skip` → solo は `BOLT_COMPLETED` 追記、swarm は `pool.skipFailedUnit`
  - `abort` → `amadeus-bolt.ts abort` + `parkedDirective`
- 直接動線: `:6973` の `resolve-failure` 相当サブコマンドも同じ `handleFailureRuling` を呼ぶ

**契約上の重要点**: この経路は answer の**出所を問わない**。人間の回答でも election の裁定結果でも、`report --user-input <裁定>` として渡せば同一に処理される。

### 3. `amadeus-election open --trigger <mode>` の契約(`amadeus-election.ts:443-463`)

```ts
  if (trigger === "manual") return handleOpen(root, filePath);
  if (trigger !== "auto") {
    return fail(`open: unknown trigger "${trigger}"`);
  }
  const resolved = resolveAmadeusConfig(projectDir);
  if (resolved.kind === "invalid") {
    return fail(`open: invalid configuration: ${resolved.issues.map(configIssueSummary).join(" | ")}`);
  }
  if (resolved.config.soloElection.trigger.mode !== "auto") {
    out({ opened: null, reason: "solo-election-manual-trigger-required" });
    return 0;
  }
  return handleOpen(root, filePath);
```

| 入力 | exit | 出力 |
|---|---|---|
| `--trigger` が manual / auto 以外 | 1 | error `unknown trigger "<v>"`、registry 未作成 |
| `--trigger auto` + config 不在 or `mode: manual` | **0** | `{"opened": null, "reason": "solo-election-manual-trigger-required"}`、registry 未作成 |
| `--trigger auto` + invalid config（例 `mode: "true"`） | 1 | `solo-election.trigger.mode expected manual \| auto` |
| `--trigger auto` + `mode: auto` | 0 | `{"opened": "<id>", "views": <n>}`、election dir 作成 |
| `--file` 省略 | 2 | usage（stage-protocol `:151` 逐語「`--file` is REQUIRED: without it the CLI exits 2 on usage」） |

**呼び出し側の注意**: 無効化ケースは exit 0 で返るため、成否を exit code で判定してはならない。`opened === null` を見る必要がある。またここでの `resolveAmadeusConfig(projectDir)` は **1 引数呼出**で、`amadeus-orchestrate.ts:632` のような intent / space レイヤを渡していない。

上表の 4 段階は `tests/integration/t236-election-loop.integration.test.ts:71-135` が正本として実測している。

### 4. election definition JSON のスキーマ（`amadeus-election-model.ts:100-116` `Election.parse`）

| フィールド | 制約 |
|---|---|
| `electionId` | 非空 string。加えて `handleOpen` が `GoaLineCode.parse` で `^E-[A-Z0-9]+(-[A-Z0-9]+)*$` を要求（`amadeus-election.ts:413-414`） |
| `kind` | string |
| `question` | string |
| `choices` | 非空配列。各要素 `{ internalNo: number, label: string, description?: string }`。`internalNo` の重複は parse 失敗（`:76-97`） |
| `voters` | 非空 string 配列。重複は parse 失敗（`:107-108`） |

`handleOpen`（`:402-434`）は store 作成 → voter ごとの blind view を `views/<voter>.json` へ書出し → state を `open` に設定し `{opened: <id>, views: <n>}` を出力する。

**voter 名は CLI が制約しない**。`subagent-1` / `subagent-2` という具体名は `packages/framework/core/skills/amadeus-election/SKILL.md:28` の規約と test fixture に留まる。`VoterKind`（`"member" | "subagent"`）は ballot 側の属性であり definition 側には現れない。

### 5. 指令ループ契約

`next --election <id>`（`amadeus-election.ts:137`）が 1 行 JSON の指令を返す。`kind` が `done` で終了、`hold` は人間委譲、`collect-wait` は `vote --file <ballot.json>` 待ち。それ以外は指令の `verb` を実行して `report --election <id> --result <report フィールド>`（`handleReport` `:186`）でループする。usage 文字列は `:66`（`open|notify|vote|status|tally|render|verify|next|report`）、ディスパッチは `:805`。配布は `handleNotify`（`:483` 付近）が `--transport subagent`（デフォルト）で DeliveryDirective を返し、conductor が directive ごとに subagent を 1 体 spawn する。spawn プロンプトは `{electionId}` / `{viewPath}` / `spawnInstruction` の 3 要素のみで、main agent の分析・推奨は含めない（アンカリング防止）。

### 6. `solo-election.trigger.mode` の config 契約（`amadeus-config.ts:563-574`）

```ts
  {
    path: "solo-election.trigger.mode",
    domain: "solo-election",
    layers: ALL_LAYERS,
    merge: "replace",
    defaultValue: "manual",
    parse: parseElectionMode,
    legacy: { key: "auto-solo-election", valueConversion: "false -> manual; true -> auto" },
  },
```

型面は `:94`（`soloElection: Readonly<{...}>`）、解決は `:771-775`（`mode: value("solo-election.trigger.mode") as SoloElectionTriggerMode`）。`ALL_LAYERS` により project / space / intent の 3 層で解決される。

## 260814-open-bug-batch-6 の契約断面（履歴、observed `a49f9e9fd`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

### `pr-convergence-cli.ts` の verb 契約（#3062）

`runConvergence`(`:1353`) は verb 分岐（`status` は `:1381`）**より前**に self record × `landed` の一律拒否を置く（`:1364-1366`）。この配置により、以下がすべて到達不能になる:

| verb | self record × landed 時の結果 |
| --- | --- |
| `status` | exit 1、stderr `landed is not convergence evidence`（`:1392-1393` の「landed は exit 0」分岐へ到達しない） |
| `report` | 同上 |
| `override` | 同上（override 分岐に到達する前に拒否） |

同一メッセージの拒否は 3 層にある: `writeSelfReport`(`:815`) の `:823`、`reportOutcome`(`:1253`) の `:1260`、`runConvergence` の `:1364`。**契約を変える是正は 3 層すべてを対象にする必要がある。**

非 self record では `:1392-1393` が有効で、`const settled = verdict.converged || evaluation.value.kind === "landed"` により landed は exit 0（逐語コメント `// A landed pull request is a settled fact: exit 0, like convergence.`）。すなわち **self record かどうかで landed の契約が反転している**。

### `pr-convergence-report-format` センサーの合否契約（#3062）

`amadeus-sensor-pr-convergence-report-format.ts` の判定（実読）:

- `kind === "landed"` → **stage 非依存**で finding（`:368-372`、reason `landed is a merge fact, not convergence evidence`）
- `kind === "created"` かつ `stage === "pr-convergence"` → finding（`:378-380`、reason `created proves PR delivery only; final convergence requires converged or override`）
- `kind === "converged"` かつ `converged === "false"` → finding（`:373-374`）
- `kind === "created"` かつ `converged === "true"` → finding（`:375-376`）

Issue #3062 は landed 拒否を stage 条件付きと記すが、**実装は stage 非依存**であり契約はより強い。

### `pr-convergence-predicate.ts` の verdict 契約

`:262` — `readonly verdict: "converged" | "not-converged" | "landed"`。`:281` `landedVerdict` は `converged: false` を意図的に返す（`:273-275` のコメントが「merged PR の事実の記録であり、`converged` の消費者が新しい前進手段を得ることはない」と明記）。

### `plugin.json` の `sensors` 宣言契約（#3026）

`amadeus-plugin-compose.ts` の `parseSensors`(`:415-433`) が課す制約（実読）:

- `sensors/` で始まり `.md` で終わる相対パスであること（`:421-423`）
- 重複宣言の禁止（`:425-427`）
- バンドル内に実在すること（`:431-433`）

いずれも**宣言があった場合の検証**であり、`sensors` キー自体の欠落は検査されない（`:554` / `:956` / `:992` / `:1023` の `?? []`）。ディスク上の資産と宣言の一致は現行契約に含まれない。

### `recordEngineError` / `emitError` の契約（#3032）

`amadeus-lib.ts:8087 emitError` の契約（コメントと実装から）:

- workflow state が存在するときのみ ERROR_LOGGED を 1 行 append（`existsSync(stateFilePath(projectDir))` ガード）
- **記録の失敗はすべて握り潰す**（`:8102-8105`、逐語 `// Audit write failed — we're already in an error path, swallow.`）
- 再入ガード `_errorEmitInProgress`（プロセスローカル 1 フラグ）
- `intent` / `space` を省略するとワークスペース sentinel バケットへ書かれる（`:8058-8060` のコメントが「the wrong ledger, silently」と明記）

`otel/bootstrap.ts:45 assertSameProject` の契約: 登録済み workspace と要求 workspace の不一致で throw（メッセージ末尾 `invariant violation (one workspace per process)`）。**この throw は `emitError` の catch に握り潰されるため、呼び出し側からは no-op と区別がつかない。**

## 選挙 CLI の多問化とプラグイン設定の公開契約（260814-priority-bug-batch、履歴、observed `d64fd7cac`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` → observed `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7`。本節は本区間で API 断面が変わった 3 系統（選挙 / plugin.settings / プラグインパスの rename）をシグネチャ水準で記録する。全エクスポート面は `grep -n "^export " <file>` の出力から転記した。

### プラグインパスの rename（PR #3051）

`plugins/pr-convergence/` → `plugins/github-pr-convergence/`。CLI の起動パスは `bun plugins/github-pr-convergence/tools/pr-convergence-cli.ts <verb>` になる。ツール内のファイル名（`pr-convergence-cli.ts` / `-gh-runner.ts` / `-predicate.ts` / `-ledger.ts` / `-provenance.ts` / `-presentation.ts` / `-attestation.ts` / `-git-runner.ts` / `amadeus-sensor-pr-convergence-report-format.ts`）と sensor manifest 名（`sensors/amadeus-pr-convergence-report-format.md`）、verb 集合（`create` / `status` / `report` / `override`）はいずれも不変で、変わったのは第 1 階層のディレクトリ名だけである。本ファイル内の旧パス表記は、それを宣言する観測断面が rename 以前である**履歴節に限って**保存されている（本節より前の `## PR 収束 CLI の外部境界と内部契約`、`## PR convergence 契約` の 2 節）。

### 選挙 CLI（`packages/framework/core/tools/amadeus-election.ts`、804 行）

verb 集合は 9 個で不変（USAGE 逐語、`:42-43`）:

```
Usage: bun <harness-dir>/tools/amadeus-election.ts <open|next|status|vote|notify|tally|render|verify|report> [--election <id>] [--file <path>] [--trigger manual|auto] [--project <dir>]
```

変わったのは戻り値の形である。schemaVersion は 2 に固定され、指令・エラー・集計がすべて**問(question)単位**の識別子を持つ。

| エクスポート | シグネチャ（要約） | 多問化での変化 |
|---|---|---|
| `ElectionCliErrorCategory` | `"decode" \| "store" \| "config" \| "invalid-transition" \| "stale-directive" \| "coverage" \| "preservation" \| "verification" \| "transport"` | `stale-directive` / `coverage` / `preservation` が新設。問ごとの成立を壊す遷移を型で分離する |
| `ElectionCliError` | `{ category; electionId; questionId?; runId?; nextAction }` | `questionId` / `runId` を追加。どの問のどの集計回で失敗したかを呼び出し側が識別できる |
| `ElectionDirective` | `DirectiveBase & { kind }` の判別ユニオン。`kind` は `distribute` / `collect-wait` / `tally-ready` / `hold` / `render` / `verify` / `done` | `DirectiveBase` が `targetQuestionIds: readonly string[]`、`preservedResultDigest: string \| null`、`expectedRunId: string \| null` を持つ。`hold` は `held: { questionId; reason: HoldReason }[]` を返し、**保留は問ごと**になった |
| `nextElection(root, electionId)` | `ElectionCliResult<ElectionDirective>` | 再実行対象は「保留中の問だけ」に絞られる（`currentTargets`: 現行 tally に hold があればその問 ID 集合、なければ `targetQuestionIds`） |
| `statusElection` / `openElection` / `triggeredOpenElection` / `voteElection` / `notifyElection` / `tallyElection` / `renderElection` / `verifyElection` / `reportElection` | いずれも `ElectionCliResult<T>` | verb 名と引数の形は維持。`triggeredOpenElection` が `--trigger manual\|auto` を受ける |
| `main(argv, projectDir?)` | `number`（exit code） | `--project` は repo 外 scratch へ store を向けるための override |

### 新規モジュール 1: `amadeus-election-codec.ts`（908 行、新規）

schemaVersion 2 の canonical schema と legacy decoder を持つ。旧 `amadeus-election-model.ts` のデータモデル責務がここへ移った。

- 型: `CanonicalElectionChoice` / `CanonicalElectionQuestion` / `CanonicalElectionDefinition` / `CanonicalBallotResponse` / `CanonicalBallotRef` / `CanonicalBallot` / `CanonicalGoaCounts` / `CanonicalChoiceCount` / `CanonicalQuestionResult` / `CanonicalTally` / `BallotDecodeContext`
- エラー: `ElectionCodecErrorCategory` / `ElectionCodecError` / `ElectionCodecResult<T>`（判別ユニオン、例外を投げない）
- コンパニオン: `ElectionDefinitionCodec`（`:279`）/ `BallotCodec`（`:543`）/ `TallyCodec`（`:804`）

### 新規モジュール 2: `amadeus-election-question-tally.ts`（386 行、新規）

問ごとの集計方針を持つ純粋モジュール。

- 型: `QuestionId` / `ResolvedResponse` / `LateResponse` / `LateResponseClassification` / `TallyErrorCategory` / `TallyError` / `TallyPolicyResult<T>` / `ElectionTallyDraft`
- 関数: `resolveResponses`（`:77`、voter×question の解決）/ `classifyLateResponses`（`:127`）/ `canEarlyTally`（`:190`）/ `deriveLifecycle`（`:334`）/ `tallyQuestions`（`:340`）

### 縮小: `amadeus-election-model.ts`（32 行）

共有語彙だけを残す。`Result<T, E>` / `ok` / `err` / `VoterKind`（`"member" \| "subagent"`）/ `HoldReason`（`"tie" \| "block" \| "quorum-short" \| "discussion-needed" \| "split"`）。ファイル冒頭コメントが逐語で「The election data model itself — definitions, ballots, tallies — lives in amadeus-election-codec.ts as the canonical schemaVersion 2 shapes.」と宣言する。

### `amadeus-election-store.ts`（1232 行）

- `ElectionState`: `"draft" \| "open" \| "collecting" \| "partial" \| "tallied" \| "rendered" \| "recorded"`。**`partial` が新設**され、一部の問だけが成立した状態を型で表す
- `ElectionSnapshot`: `{ definition; state; pending; ledger; materialized; currentTally: CanonicalTally \| null; history: readonly CanonicalTally[]; timeline }`。集計は 1 件ではなく履歴を持つ
- `TallyDurableStep`: `"history" \| "current" \| "state" \| "registry" \| "timeline"`。`TallyCommitResult` は失敗時も `durable` に到達済みステップを載せ、部分書込を呼び出し側へ可視化する
- `ElectionStore` コンパニオン（`:971`）の面: `create` / `load` / `readSnapshot` / `setState` / `appendPending` / `integratePending` / `readTallyHistory` / `establishedResultsDigest` / `commitTally` / `verify`。`establishedResultsDigest` と `commitTally` が、既に成立した問の結果を再実行で壊さないこと（preservation）を担う
- パス: `electionsRoot(projectDir, space = "default")` = `<projectDir>/amadeus/spaces/<space>/elections`

### `amadeus-election-record.ts`（651 行）

- 配布ビュー: `DistributionChoice`（`CanonicalElectionChoice` を継承）/ `DistributionQuestion` / `DistributionView` / `buildDistributionView`（`:74`）— 投票者へ渡す blind view が問の配列を持つ
- 記録: `ElectionRecordInput` / `ElectionRecordLateResponse` / `ElectionRecordTimelineEvent` / `ElectionRecordLifecycle`（`"partial" \| "tallied"`）
- 検証: `ElectionRecordFindingKind` / `ElectionRecordFinding` / `ElectionRecordVerificationInput` / `ElectionRecordVerificationResult` = `Result<void, readonly ElectionRecordFinding[]>`
- 関数: `renderElectionRecord`（`:251`）/ `verifyElectionRecord`（`:637`）

### 新規モジュール 3: `amadeus-plugin-settings.ts`（274 行、新規、PR #3052）

プラグインが宣言し、利用者が config で上書きする設定の型と解決。

- 制約: `SETTINGS_KEY_RE = /^[a-z][a-z0-9-]{0,63}$/`、`SECRET_KEY_RE = /token|password|secret|credential|apikey|api-key/`（秘匿値をこの経路へ載せさせない）
- 型: `SettingType`（`"string" \| "number" \| "boolean" \| "enum"`）/ `SettingScalar` / `SettingDeclaration` / `PluginSettingsDeclaration` / `PluginSettingsOverrides` / `ResolvedSettings` / `SettingsResolution`
- 関数: `parseSettingsDeclaration`（`:54`）/ `collectSettingsMisspellings`（`:92`）/ `settingsKeyViolation`（`:120`）/ `valueMatchesType`（`:193`）/ `resolvePluginSettings`（`:240`）
- `resolvePluginSettings(plugin, declaration, overrides)` は `{ ok: true; settings }` か `{ ok: false; error: { code: "unknown-key" \| "type-mismatch" \| "enum-out-of-range"; plugin; key; detail } }` を返す。**既定値へ落とすフォールバックはない** — 実装コメントが逐語で「it refuses rather than defaulting: a plugin running on a default the operator did not ask for is a silent misconfiguration.」と述べる
- 消費面: `amadeus-sensor.ts:291` `resolvePluginSettingsForSensor(sensorId, hostRoot, projectDir, deps)` → `SettingsResolution | null`（宣言を持たないプラグインでは `null` = 不在であり fallback ではない）、`amadeus-sensor.ts:324` `pluginSettingsOverrides(projectDir, resolveConfig)`、`amadeus-plugin-compose.ts:362-363`（compose 時の宣言検査）
- config 面: `amadeus-config.ts` の registry entry `plugin.settings`（`:649-655`、`layers: ALL_LAYERS` = project / space / intent、`merge: "plugin-settings"` でプラグイン別・キー別にマージ）

## 区間の公開契約の変化（260815-per-unit-outcome、履歴、observed `78146f435a`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-stale-epoch-landed の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

base `9ba8170bb` → observed `78146f435a`（`git diff --shortstat` → 103 files / +3091 −182、非 record 面 40 files / +874 −97）で動いた契約は **2 件**であり、いずれも本 intent の患部（per-unit consume の母集団取得）とは独立している。

- `assertRecomposeAllowed`（`packages/framework/core/tools/amadeus-lib.ts`）が引数を 1 → 2 へ拡張し、第 2 引数 `lifecyclePhase: string \| null \| undefined` を取るようになった。拒否条件は `autonomy === "autonomous"` 単独から **`autonomous` かつ Lifecycle Phase が `construction`** の合成へ狭まった（#3074 の着地。唯一の呼び出しは `amadeus-utility.ts` の 1 行変更）。
- `amadeus-graph.ts` の内部関数 `loadSensors` が `mergeSensorsFromDir(dir, out, pathBase?)` へ改称し、plugin host 側の sensor をマージするようになった（#3026 の着地。plugin 側は `plugins/formal-model-check/plugin.json` と stage frontmatter で sensor を宣言する）。

**本 intent の患部側の契約は無変更。** `readPerUnitConsumePopulation` / `EXPECTED_PER_UNIT_CONSUMER_EDGES` / `UNIT_POOL_EVENT_SET_COMMITTED` / `CONSTRUCTION_AUDIT_EVENTS` を含む 5 ファイルへ `git diff --quiet 9ba8170bb 78146f435 -- <path>` を適用し**全件 exit 0**。fail-closed の失敗コード（`producer-outcome-pending` / `producer-outcome-failed` / `producer-outcome-unknown` / `consumer-edge-inventory-mismatch`）も同断面のまま。

## 区間の公開契約の変化（260815-stale-epoch-landed、履歴、observed `83e1dbeef`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-open-bug-batch-7 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

base `78146f435a` → observed `83e1dbeef`。区間で動いた公開契約は **audit イベント 1 件の追加のみ** — intent 260815-per-unit-outcome（PR #3105）が `UNIT_OUTCOME_SETTLED` を新設し、`packages/framework/core/otel/event-registry.ts` の登録数が **92 → 93** になった（`git diff --numstat 78146f435a 83e1dbeef -- packages/framework/core/otel/event-registry.ts` → **+16 / −2**、observed 側の基数は `tests/integration/event-registry-drift.test.ts:50-54` が **93** に pin。併せて `packages/framework/core/knowledge/amadeus-shared/audit-format.md` と `docs/reference/12-state-machine{,.ja}.md` を同期）。

**本 intent（Issue #3110）の患部側の公開契約は本差分で変化なし。** `git diff --quiet 78146f435a 83e1dbeef -- plugins/github-pr-convergence/` → **exit 0**。`pr-convergence` CLI の 4 verb（`create` / `report` / `override` / `status`）、report の `kind` 語彙（`created` / `converged` / `override` / `landed`）、attestation の `local head` フィールド（`pr-convergence-attestation.ts:82` / `:115` / `:166`）、blocking sensor の finding スキーマはいずれも observed 断面のまま。

是正が公開契約に触れうる面は 2 つあり、いずれも方式選択に依存する — (1) `:746-748` の stale 拒否文言（ユーザー可視のエラー contract。現行文言は誤った回復手順を指示している）(2) `report` が MERGED × stale created で `kind: landed` を書けるようになる場合の verb 挙動。詳細は `architecture.md` / `code-quality-assessment.md` の各対応節を参照。

## 区間の公開契約の変化（260816-open-bug-batch-7、履歴、observed `5c5911ee3`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-priority-bug-batch-3 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

base `83e1dbeefb3278a00e86f69d3c79071a35ccf043` → observed `5c5911ee3f107152c3173701caf178a746b6e3aa`。本区間は**公開契約が大きく動いた区間**である（前 2 区間はいずれもほぼ無変化だった）。動いた面は 5 つ。

### 1. 監査イベント語彙 — 5 件追加、基数 pin 93 → 98

`git diff -U0 83e1dbee..HEAD -- packages/framework/core/otel/event-registry.ts` の追加行から抽出した新規イベントは `DELEGATED_MERGE_RECORDED` / `LEARNING_CANDIDATE_ADDED` / `LEARNING_ZERO_CONFIRMED` / `WORKFLOW_WAITING_ENTERED` / `WORKFLOW_WAITING_RESUMED` の **5 件**。基数 pin は `tests/integration/event-registry-drift.test.ts:51` が `expect(EXPECTED_CANONICAL_COUNT).toBe(98);`（前 observed 断面では 93）。

### 2. 設定スキーマ — `solo-election.trigger.mode` の廃止

`solo-election.trigger.mode` は config leaf ではなくなり、Intent Autonomy Mode からの派生になった（`packages/framework/core/tools/amadeus-config.ts:658` の ADR-8 注記）。`:685` が `["auto-solo-election", { kind: "abolished", explanation: SOLO_ELECTION_ABOLISHED_EXPLANATION }]` として拒否語彙に登録するため、**旧キーを書いた設定は無音で無視されるのではなく、廃止として説明付きで拒否される**。`amadeus/spaces/default/memory/team.md` の「階層設定の `solo-election.trigger.mode` が `auto` のときだけ…」という記述は本区間の docs 同期（PR #3139）以後の断面と突き合わせる必要がある。

### 3. 新規 CLI 契約 — `amadeus-merge-provenance record`

`packages/framework/core/tools/amadeus-merge-provenance.ts` の usage 逐語（`:41-43`）:

`Usage: amadeus-merge-provenance record --standing-ruling-ref <cid> --ci-conclusion <result> --converged-digest <ref> [--project-dir <path>] [--intent <dir>] [--space <name>]`

`record` 以外の第 1 引数は usage を出して exit 1。成功時は receipt を JSON で stdout へ、拒否時は `{"error":"record-delegated-merge refused","detail":...}` を stderr へ出し exit 1（`:60-65`）。**この CLI は git にも GitHub にも触れない record-only** であり、委任条件（必須 CI green かつ pr-convergence `converged: true`）が実際に満たされたかの正本は `team.md` の常任マージ承認ノルム側にある（`:1-11` のコメントが明示）。

### 4. `--status` の autonomy facet

`statusAutonomyFacet(projectDir, intent?, space?)`（`amadeus-autonomy-status-facet.ts:39`）が `{ mode, projection, interactive, mirrorConsent, findingConsent }`（型は `:26-32`）を返す。**解決不能時は既定値で埋めず `null`**（コメント逐語「`null` means "unavailable", never a guessed value (R-7)」）。既存の `autonomy === null` → "unavailable" の表示規約と同じ degrade をする。autonomy 宣言の入口は `/amadeus --autonomy <mode>` と `bun <bolt> set-autonomy --mode <mode> [--confirmed-display-digest <digest>]` の 2 経路（`amadeus-utility.ts:4367-4368` / `:4381` / `:4395`）。

### 5. pr-convergence — `report` の merged arm（#3113 が本区間で着地）

前節（260815-stale-epoch-landed）が記録した「MERGED PR に最終化経路がない」は、本区間の PR #3113（`8ceeb2dc18`）で是正された。`report` は merged arm で祖先性を実測して `kind: landed` を書き、`create` は自 delivery の head が MERGED PR を持つとき loud 拒否して `report` を指す（`plugins/github-pr-convergence/tools/pr-convergence-cli.ts:881-883` の `epoch.attestedPrHead` / `epoch.mergedHead` 束縛、`:909-910` のコメントが `#3110` を明示的に参照）。本 codekb の該当節はすでに履歴へ降格済みである。

### 本 intent（3 バグ）の契約面

- **#2363**: `SELF_INSTALL_HARNESSES`（`scripts/plugin-projection.ts:59`）は `export const` の公開値で、複数テストが**逐語ピン**している（`toEqual(["claude","codex","cursor","kimi","opencode"])` / `toHaveLength(5)`）。派生する生成物契約は `.gitignore` の ignore 行と `.gitattributes`（導出元は `packages/framework/core/tools/data/self-install-allowlist.ts:12-19`）。**外部ユーザー向けの導入契約は無傷** — `docs/guide/harnesses/pi.md:36-48` の `bunx @amadeus-dlc/setup install --harness pi` は完全な導入経路を提供しており、欠落しているのは本リポジトリの dogfood self-install だけである。
- **#2162**: `bootstrap-provenance.json` のフィールド契約（`bootstrapBaseRevision` / `preRevision` / `postRevision`。型は `tests/no-silent-drop/bootstrap.ts:53`、パースは `:186`）。`postRevision` に git 到達性の要求は**現行契約に存在しない**（`:283` の文字列等値のみ）ため、到達性を課す是正は契約の追加になる。
- **#3097**: docs 自体は契約ではないが、`t3028` の `toEqual` 比較（`:47-51`）が「doc の表 = 導出コーパス」を契約として固定している。07 を射程へ入れる是正はこの契約の適用範囲を広げる形になる。対象集合は 14 ではなく **`matches` 宣言を持つ 13 件**（根拠は `docs/reference/07-sensor-system.md:210-212` の発火規約）。

詳細は `architecture.md` / `component-inventory.md` / `code-structure.md` の各対応節を参照。

## 区間の公開契約の変化と、優先バグ 5 件が触れる契約面（260816-priority-bug-batch-3、履歴、observed `89053172e`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260817-inception-cost-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する。本節 §3 が予測した「基数 pin を通過する方式」は本区間で実際にそのとおり着地した — 現況は本ファイル末尾の 260817-inception-cost-batch 節を参照））

base `5c5911ee3f107152c3173701caf178a746b6e3aa` → observed `89053172ed8b5bb270e254aea029a13291d10b6b`。**本区間は公開契約がほぼ動かなかった区間**である（前区間は 5 面が動いた）。

### 1. 区間の変化 — 実質なし

| 契約面 | 実測（本節の再実行） | 判定 |
|---|---|---|
| audit イベント基数 pin | `git grep -n "EXPECTED_CANONICAL_COUNT).toBe" 89053172e -- tests/integration/event-registry-drift.test.ts` → `:51 expect(EXPECTED_CANONICAL_COUNT).toBe(98);` | **不変（98）** |
| audit イベント registry 本体 | `git diff --name-only 5c5911ee3 89053172e -- 'packages/framework/core/tools/data/'` → `self-install-allowlist.ts` のみ | **不変** |
| CLI verb | 変更 4 ファイルはいずれも verb dispatch を含まない。`amadeus-{orchestrate,log,bolt,config}.ts` は変更ファイル一覧に不在 | **不変** |
| config leaf | 同上（`amadeus-config.ts` 無変更） | **不変** |
| plugin | `git diff --name-only 5c5911ee3 89053172e -- 'plugins/'` → **空出力・exit 0** | **不変** |
| harness | 同述語を `packages/framework/harness/` へ → **空出力・exit 0** | **不変** |
| CI | `.github/workflows/ci.yml` に **+1 行**（self-install 面リストへの `.pi` 追加、`@@ -402,6 +402,7 @@`。Developer scan §1.5 からの転記） | 実質不変 |

**内部 export が 1 件増えた**: `packages/framework/core/tools/amadeus-intent-autonomy.ts` の `declaredFullAutonomy(stateContent)`（+10 −0、R-22 / PR #3146）。これは framework 内部の関数 export であり、CLI・config・audit のいずれの外部契約にも現れない。

### 2. 本 intent（5 バグ）が触れる契約面

是正方式は未決（`memory/team.md` P1 の裁定事項）だが、**どの方式を採っても影響しうる契約面**は次のとおり。

**#3153 — 監査スキーマと拒否メッセージ**

- `GATE_APPROVED` の任意フィールドは `User Input` / `Grant Id` / `Swarm batch` / `Transaction Id` の 4 つ（`packages/framework/core/knowledge/amadeus-shared/audit-format.md:150` 逐語）。**「人間が答えた」か「engine が未消費ターンで通した」かを区別するフィールドは存在しない**。Issue の完了条件 (2) はこの不在を指すため、**是正はほぼ確実に監査スキーマの追加を伴う**（新フィールドか新イベントか）。新イベントを足す方式なら `tests/integration/event-registry-drift.test.ts:51` の基数 pin（98）が blocking で発火する。
- ユーザー可視のエラー contract は `packages/framework/core/tools/amadeus-state.ts:3770` の拒否文言（逐語冒頭 `Refusing to ${verb} "${slug}": a real human has not acted at this gate since it opened.` … 末尾 `(autonomous Construction is exempt)`。本節で逐語確認）。autonomy の宣言を効かせる方式では、**この末尾の免除句が指す条件そのものが変わる**ため文言の同期が要る。

**#3152 — 監査イベントの発行契約**

- `packages/framework/core/knowledge/amadeus-shared/audit-format.md:297` が `INTENT_AUTONOMY_HUMAN_REQUIRED` を「**an occurrence** the active mode could not decide on its own」（単数）と宣言する。**現行実装（読み取りごとに 1 行）はこの宣言に違反している**ため、是正は契約の変更ではなく契約への復帰である。
- `Reason` の値域は `REFUSAL_REASONS`（`amadeus-intent-autonomy-production.ts:333` = `["SCOPE_OUT", "MODE_REQUIRES_HUMAN"]`）、`Interaction Kind` の値域は `amadeus-intent-autonomy.ts:113` の 4 値（`"stage-gate" | "phase-gate" | "walking-skeleton" | "question"`）。**冪等鍵を occurrence から導出する方式ではこの 2 つの閉語彙がキーの構成要素になる**。
- 新イベントを足さず既存行の冪等化に留める方式なら基数 pin（98）は発火しない。

**#3149 — pr-convergence CLI の lifecycle 語彙とエラー contract**

- report kind の閉語彙は **`created` / `converged` / `override` / `landed`** の 4 値（型宣言は `plugins/github-pr-convergence/tools/pr-convergence-cli.ts:114` / `:120` / `:130` / `:142`。本節で逐語確認）。
- 遷移規則は `:610-617` の `transitionAllowed`（`created` からのみ 3 方向、`override → converged` のみ追加で許可）。**この規則自体がユーザー可視の契約**であり、`converged` を non-final にする方式は契約変更になる。
- ユーザー可視のエラー文言は 3 本: `:923` `report lifecycle refused: ${previous.kind} -> ${report.kind}`、`:918` `report lifecycle stale: PR head changed; run create to begin a new created epoch`、`:763` `landed finalisation refused: ${ancestry.message}`（`ancestry.message` の実体は `pr-convergence-git-runner.ts:236`）。いずれも**回復手順を指示する文言**なので、経路が変われば文言も同期対象になる。
- sensor manifest の宣言（`plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md` の `default_severity: blocking` と `matches: "**/construction/*/code-generation/pr-convergence-report.md"`。本節で逐語確認）は、**この sensor が code-generation の stage approve を fail-closed で止める**という契約である。sensor 側で解く方式はこの宣言に触れる。

**#3156 — ガードの拒否契約とテストシーム**

- `gitHasSourceWork`（`amadeus-state.ts:2650-2679`）は **export 済みのテストシーム**であり、`tests/unit/t206-source-work-intent-span.test.ts` が dist 経由で import する（`:33` 逐語 `import { gitHasSourceWork, workspaceHasSourceFile } from "../../dist/claude/.claude/tools/amadeus-state.ts";`）。**シグネチャ変更は dist 再生成を伴う契約変更**になる。
- `boolean | null` の三値契約（null = git 判定不能 → FS fallback）は `tests/integration/t185-stage-artifact-guard.test.ts:432-435` が固定している（`gitHasSourceWork` header contract。Developer scan §3.4 からの転記）。
- 文書化済みバイパス `AMADEUS_SKIP_ARTIFACT_GUARD`（`:2712`、文書は `docs/reference/12-state-machine.md §Artifact guard`）は**ユーザー可視の運用契約**であり、是正後も残すか否かが判断点になる。

**#3046 — election store の永続化スキーマ**

- pending イベントの `schemaVersion` は **2**（書込 `amadeus-election-store.ts:1082`、検証 `:504`）。`readPendingVoter`（`:493-525`）は `schemaVersion !== 2` / `electionId` 不一致 / `arrivalSequence` が非負整数でない場合に `err("corrupt")` を返す **fail-closed** 契約を持つ。
- **Issue が破壊的変更を明示的に許容している**（逐語「過去の選挙データが新スキーマで読めなくなってもよい。互換レイヤー・移行シム・旧形式の再解釈は追加しない」）ため、`schemaVersion` の繰り上げは選択肢に入る。これは `memory/team.md` の Forbidden（要求されていない後方互換レイヤーを足さない）と整合する。
- `appendPending` の戻り値契約は `ElectionStoreResult<{ idempotent: boolean; arrivalSequence: number }>`（`:1032-1036`）。本番の外部呼出元は `packages/framework/core/tools/amadeus-election.ts:318` の 1 箇所のみなので、**戻り値を変える方式でも呼出側の追随範囲は狭い**。

### 3. 契約面から見た方式選択の制約

**基数 pin（98）が blocking の門番である。** 5 件のうち #3153 と #3152 は監査面へ届きうるが、**新イベントを増やす方式だけが `tests/integration/event-registry-drift.test.ts:51` を発火させる**。既存イベントへのフィールド追加や既存行の冪等化はこの pin を通過する。方式裁定時にこの分岐を明示すること。

詳細は `architecture.md` / `component-inventory.md` / `code-structure.md` の各対応節を参照。

## 区間の公開契約の変化と、focus 2 件が触れる契約面（260817-inception-cost-batch、履歴、observed `23d4ae767`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260818-priority-bug-batch-4 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

base `89053172ed8b5bb270e254aea029a13291d10b6b` → observed `23d4ae767956cd56fc28fa78abe28096712eff8a`。**本区間は前区間と異なり、監査スキーマと sensor 契約が実際に動いた区間**である。

### 1. 前節の予測がそのまま実現した — 基数 pin は通過し、属性が増えた

前節 §3 は「新イベントを増やす方式だけが `tests/integration/event-registry-drift.test.ts:51` を発火させる。既存イベントへのフィールド追加や既存行の冪等化はこの pin を通過する」と記していた。**着地した方式は後者である。**

| 契約面 | 実測（本節の再実行） | 判定 |
|---|---|---|
| audit イベント基数 pin | `git grep -n "EXPECTED_CANONICAL_COUNT).toBe" 23d4ae767 -- tests/integration/event-registry-drift.test.ts` → `:51 expect(EXPECTED_CANONICAL_COUNT).toBe(98);` | **不変（98）** |
| audit イベント **属性** | `packages/framework/core/otel/event-registry.ts` +2 −2 | **2 イベントの属性集合が変化**（下表） |
| CLI verb | `pr-convergence-cli.ts` は既存 verb（`report` / `override`）の**挙動**のみ変更。新 verb なし。`amadeus-{orchestrate,log,bolt,config}.ts` は変更ファイル一覧に不在 | **不変** |
| config leaf | `amadeus-config.ts` 無変更 | **不変** |
| harness | `git diff --name-only 89053172e..23d4ae767 -- packages/framework/harness/` → **空出力・exit 0** | **不変** |
| CI | `git diff --name-only 89053172e..23d4ae767 -- .github/` → **空出力・exit 0** | **不変** |
| 外部依存 | `git diff --stat 89053172e..23d4ae767 -- package.json bun.lock '**/package.json'` → **空出力・exit 0** | **不変** |

### 2. audit イベントの属性契約の変化 — 2 イベント

`packages/framework/core/otel/event-registry.ts` の逐語 diff（本節の実測）:

| イベント | 変化 | 行 |
|---|---|---|
| `INTENT_AUTONOMY_HUMAN_REQUIRED` | `requiredAttributes` に **`"Idempotency Key"` を追加**（`["Interaction Kind", "Stage slug", "Reason", "Mode"]` → 同 + `"Idempotency Key"`） | `event-registry.ts` の `@@ -255,7 +255,7 @@` hunk |
| `GATE_APPROVED` | `optionalAttributes` に **`"Approval Provenance"` を追加**（`["User Input", "Grant Id", "Swarm batch", "Transaction Id", "Presence Reservation Id"]` の 2 番目の後へ挿入） | 同 `@@ -548,7 +548,7 @@` hunk |

いずれも `schemaVersion: 1` のまま。**必須属性の追加（`Idempotency Key`）は既存行を読む消費者にとって破壊的でありうる**点は記録しておく — 区間内で発行された行は新属性を持つが、それ以前の 372 行（前節 §2.2 の実測値）は持たない。

**正本側の同期**（`cid:build-and-test:bt-ledger-resync` 系の対訳同期）:

- `packages/framework/core/knowledge/amadeus-shared/audit-format.md`（+4 −2）— `GATE_APPROVED` 行の When 列と Optional 列、`INTENT_AUTONOMY_HUMAN_REQUIRED` 行の Required 列を更新。あわせて**発行契約の散文が 1 段落新設**された。逐語冒頭: `INTENT_AUTONOMY_HUMAN_REQUIRED is written when a gate is PRESENTED, not when the autonomy projection is read — reading it (every next, every approval attempt) writes nothing.`
- `docs/reference/12-state-machine.md` / `.ja.md`（各 +2 −2）— 対訳同時更新。`GATE_APPROVED` の Notes に provenance 4 値の説明、`INTENT_AUTONOMY_HUMAN_REQUIRED` の Notes に「recorded once per presentation」を追記

`Approval Provenance` の閉語彙は `packages/framework/core/tools/amadeus-lib.ts:3912` の型が正本である。逐語 `export type GateApprovalProvenance = "gate-open-turn" | "delegated" | "intent-grant" | "guard-disabled";`

### 3. 内部 export の増加 — 7 シンボル

`git grep` による observed 断面の確認（本節の実測、exit 0）。いずれも core tools 内の TypeScript export で、**CLI / config / audit のどの外部契約にも新しい面を作らない**。

| シンボル | file:line | 種別 |
|---|---|---|
| `ProductionStageAutonomyInput` | `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:293` | interface |
| `GateOpenRefusalInput` | 同 `:419` | interface（`ProductionStageAutonomyInput` を extends） |
| `recordAutonomyRefusalAtGateOpen` | 同 `:432` | function（`(input: GateOpenRefusalInput): void`） |
| `isMilestoneInteraction` | `packages/framework/core/tools/amadeus-intent-autonomy.ts:762` | function（`(kind: InteractionKind): boolean`） |
| `GateApprovalProvenance` | `packages/framework/core/tools/amadeus-lib.ts:3912` | type（閉語彙 4 値） |
| `GateResolutionPresence` | 同 `:3958-3960` | type（判別ユニオン。`ok: true` は provenance、`ok: false` は `"ledger-absent" \| "no-outstanding-human-act" \| "gate-open-missing"`） |
| `resolveGateResolutionPresence` | 同 `:3967-3981` | function |

### 4. pr-convergence の sensor 契約の変化 — 束縛環境の判定規則が新設された

`plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md` に節「Which environment a record answers for」が **+22 行**で新設された（削除ゼロ）。契約の逐語要点:

- `A record is bound either to the checkout it was written from or to the merge it was finalised against, and the receipt decides which — never the kind (#3149).`
- merge commit と merged at の**両方**を attest する receipt はその merge に答え、local head は比較されない。それ以外の receipt は checkout に答え、HEAD が receipt の名指す head であることを要する
- body が述べるが receipt が attest しない merge 事実は、**kind を問わず finding**
- attested 値は commit object id / parse 可能な timestamp の形状を検査され、malformed は finding。**checkout 束縛へのフォールバックはない**
- 片方だけの merge 事実は「二重に拒否」される — receipt 段で malformed、body 段で attestation 欠落

`plugins/github-pr-convergence/stages/pr-convergence.md`（+38 −12）側の対応する契約:

- final な verdict（`converged` / 記録済み `override`）はマージ後も `landed` へ書き換えられない。`report` が**その場で最終化**する — payload バイトと verdict は不変、receipt のみ当該 merge へ再 attest、canonical audit receipt を append。2 度目の `report` は未完了分のみ replay
- check rollup は**記録するが合否条件にはしない**（merge commit は PR が持たなかった post-merge workflow run を拾うため）
- `override` の merged arm は同じ祖先性検査を実行し、**成功する場合は拒否して `report` を案内する**。失敗時は逐語の測定値（両 SHA と閉じられない理由）を ruling の `reason` へ運ぶ。record に human turn が無ければ ruling は拒否される。「無音で guard を飛ばす環境変数・フラグ・state フィールドは提供しない」と明記

**実装側の判定点**: `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts:322-338`（`checkAttestationEnvironment`）が `:303-306`（`touchesMergeFacts`）の結果で `checkMergeBinding`（`:344-370`）と `checkCheckoutBinding`（`:372-381`）へ分岐する。

### 5. focus 2 件が触れる契約面

是正方式は未決（`memory/team.md` P1 の裁定事項）だが、**どの方式でも通る契約面**は次のとおり。

**#2415 — RE stage 契約の入力面**

| 面 | 現況（observed の実測） |
|---|---|
| `consumes:` | `reverse-engineering.md:20` 逐語 `consumes: []` — **RE は何も consume しない** |
| `produces:` | 同 `:10-19` の 9 artifact |
| `sensors:` | 同 `:23-27`（`required-sections` / `upstream-coverage` / `answer-evidence` / `question-budget`） |
| スキャン対象の列挙 | 同 `:104-112`（`Developer scans <repo>'s codebase ... for:` + 7 bullet） |
| Developer テンプレート | 同 `:114` → `packages/framework/core/amadeus-common/templates/re-artifacts.md` |
| 除外規則 | **不在**。`git grep -n -iE "exclude\|excluded\|exclusion\|workflow exhaust\|process record" 23d4ae767 -- <RE 契約> <re-artifacts.md>` → **exit 1**（一致なし・エラーなし） |

**#3181 — RA stage 契約の consume 面と artifact 語彙**

| 面 | 現況（observed の実測） |
|---|---|
| `consumes:` | `requirements-analysis.md:14-29` の 6 件。`intent-statement`(`:15`) / `scope-document`(`:17`) / `business-overview`(`:19`, brownfield) / `architecture`(`:22`, brownfield) / `code-structure`(`:25`, brownfield) / `team-practices`(`:28`)。**全件 `required: false`、Issue 由来はゼロ** |
| 読み口 | 同 `:68-71`（Step 2）。`:70` が codekb、**`:71` が `<record>/audit/<host>-<clone>.jsonl` の散文** |
| `upstream-coverage` の義務 | 同 `:185` — 出力散文が `consumes:` の各 artifact を参照すること。**現行の括弧書きは 3 件のみを列挙**（逐語 `(this stage consumes intent-statement, scope-document, team-practices)`）ため、consume を増やすならこの散文自体の同期も要る |
| `consumes` の型 | `packages/framework/core/tools/amadeus-stage-schema.ts:39-43`（`artifact` / `required` 必須 / `conditional_on?: "brownfield" \| "greenfield"`）。検証は同 `:277-316` |
| artifact → path | `packages/framework/core/tools/amadeus-orchestrate.ts:2378-2400`（`resolveArtifactPath`）。**レジストリファイルは存在しない**（規約が実装で計算される） |
| producer 必須 | `packages/framework/core/tools/amadeus-graph.ts:1192-1198` — producer がどの stage にも無い consume は **hard error** |
| 追加手順の正本 | `docs/reference/16-artifact-vocabulary.md:212-226` — producing stage の `produces:` / `optional_produces:` へ名前追加 → `bun amadeus-graph.ts artifacts` で確認 → `/amadeus --doctor` で参照検査 |

**#3181 の GitHub 読取契約**（既存、`packages/framework/core/tools/amadeus-github-gateway.ts`）:

| 契約 | file:line | 内容 |
|---|---|---|
| 単一 Issue GET | `:175-180` `viewArgv(repo, issueNumber)` | `["api", "--include", "--method", "GET", "repos/<owner>/<repo>/issues/<n>"]` |
| DTO | `:418-446` `parseIssueObject` | `RemoteGitHubIssue { repository, number, title, body, state }`。`body` の null は `""` へ、`state` は `open`/`closed` → `OPEN`/`CLOSED`、`:439-442` で `repository_url` の repo 一致を cross-check |
| readiness | `:799-830` | `gh --version`（`versionArgv()` `:112`）→ `gh auth status --hostname github.com`（`authArgv()` `:116`）。非 0 exit で `"not-installed"` / `"unauthenticated"` + `"no-effect-confirmed"` certainty。raw stdout/stderr を運ばない |
| port 宣言 | `amadeus-finding-types.ts:19` / `amadeus-mirror-types.ts:427` | `readiness(repository): Promise<...<void>>` |

### 6. 契約面から見た方式選択の制約

**基数 pin（98）は本区間で門番として作動しなかった** — 属性追加という方式が選ばれたためである。focus 2 件は現時点で audit イベントに触れる兆候がないので、この pin は本 intent でも発火しない見込みだが、**証跡取り込みを監査イベント化する方式を採る場合はこの限りでない**。

**#3181 側の実質的な門番は graph 不変量である。** `consumes` に名前を足すだけでは `amadeus-graph.ts:1192-1198` の hard error になるため、**Issue を取り込む stage が `produces:` にそれを宣言する**必要がある。あわせて `upstream-coverage` の散文参照義務（`requirements-analysis.md:185`）が `requirements.md` 側へ波及する。

詳細は `architecture.md` / `component-inventory.md` / `code-structure.md` の各対応節を参照。

## 区間の公開契約の変化と、focus 2 件が触れる契約面（260818-priority-bug-batch-4、履歴、observed `127be70c5`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260820-fmc-drift-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

base `23d4ae767956cd56fc28fa78abe28096712eff8a` → observed `127be70c5d7a584016f88a5d44e8715904020721`（5 コミット）。**本区間は CLI verb が 1 件増え、artifact 語彙が 1 件増え、gateway の export が 5 件増えた区間**である。前区間で動いた監査スキーマと sensor 契約は、本区間では動いていない。

区間の全体像は `re-scans/260818-priority-bug-batch-4.md` §1〜§2 に、再実行可能な述語つきで記録した。

### 1. 変化した契約と不変の契約

| 契約面 | 実測（本節の再実行、observed 断面） | 判定 |
|---|---|---|
| CLI verb | `amadeus-utility.ts` の usage 逐語に `issue-evidence` が加わった（`:7045` の `Usage: amadeus-utility <help\|version\|…\|codekb-path\|issue-evidence\|detect\|…>`） | **+1**（下表） |
| artifact 語彙 | `git grep -n "export element counts" 127be70c5 -- tests/integration/t66.test.ts` → `:1032 test("export element counts: stages=32, scopes=15, artifacts=123, agents=15", …)` | **122 → 123** |
| stage 数 / scope 数 / agent 数 | 同上（32 / 15 / 15） | **不変** |
| audit イベント基数 pin | `git grep -n "EXPECTED_CANONICAL_COUNT).toBe" 127be70c5 -- tests/integration/event-registry-drift.test.ts` → `:51 expect(EXPECTED_CANONICAL_COUNT).toBe(98);`。`packages/framework/core/otel/event-registry.ts` は区間の変更ファイル一覧に**不在** | **不変（98）** |
| config leaf | `amadeus-config.ts` 無変更 | **不変** |
| harness | `git diff --name-only 23d4ae767..127be70c5 -- packages/framework/harness/` → **空出力・exit 0** | **不変** |
| CI | `git diff --name-only 23d4ae767..127be70c5 -- .github/` → **空出力・exit 0** | **不変** |
| 外部依存 | `git diff --stat 23d4ae767..127be70c5 -- package.json bun.lock '**/package.json'` → **空出力・exit 0** | **不変** |

### 2. 新 CLI verb `issue-evidence fetch`（#3181、PR [#3190](https://github.com/amadeus-dlc/amadeus/pull/3190)）

`packages/framework/core/tools/amadeus-utility.ts` に read-only の取り込み verb が 1 件加わった。

| 面 | file:line（observed） | 契約 |
|---|---|---|
| dispatch arm | `:6981`（`case "issue-evidence":`） | 直前 `:6977-6980` のコメント逐語 `Reads the filing Issue(s) through the gateway and writes ONE record artifact. No state, no audit transition; a gh failure exits non-zero and writes nothing, leaving the conductor to continue on the free-text fallback.` |
| 実装 | `:6824` `runIssueEvidenceFetch(projectDir, argv, flags)` | **verb は `fetch` の 1 語のみ**。`:6834` 逐語 `issue-evidence: unknown verb …— the only verb is "fetch".` |
| 必須フラグ | `:6843` | `--issues <n[,n...]>`（正の整数のカンマ区切り、非空必須） |
| 任意フラグ | `:6849` / `:6856` | `--repo <owner>/<name>`。省略時は checkout から解決し、解決できなければ error |
| 事前条件 | `:6867` / `:6873` | active intent が解決すること / `gh` が usable であること（gateway の `readiness` 経由）。いずれも満たさなければ **何も書かずに非 0 終了** |
| 出力 | `:6985-6987` | 書込先の相対パスと `(N issue(s))` を 1 行で stdout へ |
| 失敗の伝播 | `:6989-6995` | Promise の reject も `die()` へ寄せ、他 verb と同じ `ERROR_LOGGED` 行と exit 形にそろえる |
| usage | `:7045` | 上表のとおり verb 名が列挙に加わった |

**契約上の位置づけ**: state 遷移も audit 遷移も起こさない **read-only 照会 verb** であり、既存の `codekb-path` と同じ系統である。書込先は record 配下の 1 ファイルのみ（下記 `issueEvidencePath`）。

### 3. `amadeus-github-gateway.ts` の新 export — 5 件（23 → 28）

export 総数の census（本節の実測）: `git show <c>:packages/framework/core/tools/amadeus-github-gateway.ts | grep -c '^export '` → base `23d4ae767` **23** / observed `127be70c5` **28**。増分 5 件は次のとおりで、いずれも **read 面のみ**である。

| シンボル | file:line | 契約 |
|---|---|---|
| `commentsArgv(repo, issueNumber)` | `:189` | 1 issue の全コメントを 1 リクエストで取る argv。`["api","--paginate","--method","GET","<issues>/<n>/comments","-f","per_page=<FIND_PER_PAGE>"]` |
| `RemoteGitHubIssueComment` | `:478` | `Readonly<{ id: number; body: string; createdAt: string; authorLogin: string; htmlUrl: string }>` |
| `parseIssueComments(payload, repo)` | `:550` | コメントページの parser。**fail-closed** |
| `EvidenceGitHubGateway` | `:1077` | `readiness()` / `viewIssue(repository, n)` / `listComments(repository, n)` の 3 面のみを持つ port 型 |
| `createEvidenceGitHubGatewayAdapter(runner)` | `:1089` | **3 つ目の adapter**。既存 2 種（`createMirrorGitHubGatewayAdapter` `:1058` / `createFindingGitHubGatewayAdapter` `:1064`）に並ぶ |

**`commentsArgv` は `--include` を意図的に持たない。** 既存の read verb（`viewArgv` `:175-180` など）はすべて `--include` を付けるが、コメント取得だけは付けない。`:182-188` のコメント逐語:

```
`--include` is deliberately ABSENT here, unlike every other verb above: gh
interleaves the per-page HTTP blocks with the per-page arrays under
`--paginate`, which is not a shape parseHttpEnvelope can read back … Without
`--include`, gh merges the pages into ONE plain JSON array, so the comment walk
reads a bare body and classifies failure from the exit code alone — no HTTP
status is available to it.
```

**すなわち本 verb の失敗分類は HTTP status ではなく exit code のみに依る。** これは gateway 内で唯一の例外であり、契約面として記録に値する。

**`parseIssueComments` の fail-closed**（`:547-549` の逐語）: `Fail-closed: one bad element rejects the WHOLE list rather than yielding a shortened one, because a partial evidence capture would read as a complete record of the cross-review.` 実装は `:556-560` で 1 要素でも parse 失敗すれば `invalidResponse("read-only")` を返し、短縮リストを返さない。

**`createEvidenceGitHubGatewayAdapter` は permit を取らない**（`:1070-1075` の逐語）: `The third adapter, and the only wholly read-only one … No mutation reaches it, so it takes no permit — the permit machinery guards writes, and there are none here.` 既存の mutation permit（`validateMirrorMutationPermit` / `validateFindingMutationPermit`）は write のみを gate するという前区間の観測（`260817-inception-cost-batch` 節 §5）が、実装として確認された形である。

### 4. `amadeus-lib.ts` の新 export — 3 件

| シンボル | file:line | 契約 |
|---|---|---|
| `RE_SCAN_EXCLUDED_PATHSPECS` | `:1540` | `readonly string[]`。RE 差分スキャンの除外 pathspec 5 件の**コード側で唯一の定義**（#2415） |
| `issueEvidencePath(projectDir, intent?, space?)` | `:5043` | `string \| null`。active intent が解決しなければ `null` |
| `relativeIssueEvidencePath(projectDir, intent?, space?)` | `:5051` | 同上の posix 相対形。契約散文が載せる形 |

`RE_SCAN_EXCLUDED_PATHSPECS` の値（逐語、observed `:1541-1545`。定義行は `:1540`）:

```
":(exclude,glob)amadeus/spaces/*/intents/**",
":(exclude,glob)amadeus/spaces/*/elections/**",
":(exclude,glob)amadeus/spaces/*/codekb/**",
":(exclude,glob)amadeus/spaces/*/memory/**",
":(exclude,glob)metrics/**",
```

**`:(glob)` は装飾ではない。** 同ファイル `:1533-1535` の逐語コメント: `The bare form amadeus/spaces/*/intents/ is a valid pathspec whose * does not cross a /: it matches nothing and excludes nothing, silently. Never drop it (FR-EXC-5).` また `:1537-1539` は `amadeus/spaces/*/specs/` を**意図的に除外しない**理由（model-map.json と tla-evidence は resync 義務のある build 台帳＝コード知識）を宣言する。前区間 `260817-inception-cost-batch` 節が「`amadeus/spaces/**` の前方一致は TLA ビルド台帳を巻き添えにする」と記した観測が、そのまま実装の制約として着地している。

### 5. stage 契約 frontmatter の変化 — 3 面

| 契約ファイル | 変化 | 行（observed） |
|---|---|---|
| `stages/ideation/intent-capture.md` | **`optional_produces: [issue-evidence]` を新設** | `:14-15` |
| `stages/inception/requirements-analysis.md` | `consumes:` に `issue-evidence`（`required: false`）を追加。6 → **7 件** | `:30-31` |
| `stages/inception/reverse-engineering.md` | frontmatter は**不変**（`consumes: []` のまま）。追加は本文側のみ | — |

**RE 契約が本文側にとどまるのは意図的である。** 同契約 `:239` の逐語: `This read is deliberately body-level and NOT a consumes: entry. A declared consume would put all nine codekb outputs under the upstream-coverage citation obligation the moment an evidence file exists — inception ceremony, which is what this capture exists to remove. Do not add the frontmatter entry.`

**`upstream-coverage` の括弧書きが同期された。** `requirements-analysis.md:191` は前区間まで 3 artifact しか列挙していなかったが、本区間で **7 件全列挙**へ更新され、あわせて「ディスク上に存在する consume だけを sensor が要求する」という挙動が明文化された（逐語 `The sensor threads only the consumes whose artefact EXISTS on disk, so an input a lean scope never produced is not demanded.`）。前区間 §5 が「consume を増やすならこの散文自体の同期も要る」と記した点が、そのとおり閉じられた。

### 6. focus 2 件が触れる契約面（是正未着地）

**両 focus とも本区間で修正は着地していない**（`git grep -n "3106" 127be70c5 -- packages/ plugins/ tests/ docs/` → **exit 1**。`"2837"` は allowlist の sha256 偶然一致 2 hit のみで、`tests/.coverage-patch-allowlist.json:183` / `:566` の `fingerprint` 値の内部文字列である）。

**#2837 — `invoke-swarm` directive の閉語彙**

| 面 | file:line（observed） | 現況 |
|---|---|---|
| 型 | `packages/framework/core/tools/amadeus-directive.ts:312-331` `InvokeSwarmDirective` | `kind` / `units` / `cap` / `repo?` / `prepared_batch?` / `retry_unit?` の **6 面のみ**。`batch` / `check_cmd` / `test_file` は不在 |
| 閉語彙（validator） | 同 `:555` 逐語 | `const INVOKE_SWARM_FIELDS = ["kind", "units", "cap", "repo", "prepared_batch", "retry_unit"] as const;` |
| 語彙表への結線 | 同 `:587` | `"invoke-swarm": INVOKE_SWARM_FIELDS` |
| 対称面（batch を運ぶ別 kind） | 同 `:644-649`（`execute-failure-election`） | 同じ engine が別 kind では `batch` を**必須フィールド**として搬送している |
| retry arm | `packages/framework/core/tools/amadeus-orchestrate.ts:4092-4106` `preparedSwarmRetryDirective` | `prepared_batch` / `retry_unit` を搬送。**batch identity を運ぶ経路は既に存在する** |
| swarm CLI の read verb | `packages/framework/core/tools/amadeus-swarm.ts:1419` | 有効 subcommand は 14 件（`prepare, check, retry, finalize, resolve, initial-enqueue, acquire, confirm-dispatch, record-reconciliation, settle-release, settle-release-requeue, settle-release-cancel-dependents, terminate-batch, late-result-observed`）。**`context` / `status` に相当する read-only verb は不在** |

**#3106 — settle 行の閉語彙**

| 面 | file:line（observed） | 現況 |
|---|---|---|
| 発行側 | `packages/framework/core/tools/amadeus-orchestrate.ts:4706` 逐語 | `if (batch === undefined \|\| cancelledUnits.has(unit)) continue;` — cancelled unit は発行対象から外れる |
| 値の閉語彙 | 同 `:2475` 逐語 | `const SETTLED_UNIT_OUTCOME = "succeeded";` |
| 読み側の拒否 | 同 `:2508` 逐語 | `if (outcome !== SETTLED_UNIT_OUTCOME) throw new Error(INVALID_SETTLED_ROW);` |
| 下流の受理語彙 | `packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts:199` | `KNOWN_OUTCOMES = new Set(["succeeded", "failed", "cancelled", "pending", "ambiguous"])` — **`cancelled` は既に正規の受理値** |
| 文書化された限界 | `docs/guide/15-troubleshooting.md:143` 逐語 | `**Cancelled Units are not settled.** … closing that asymmetry is tracked as a follow-up issue.` **対訳 `.ja.md` に同一文字列は 0 hit**（`git grep -n "Cancelled Units are not settled" 127be70c5 -- docs/guide/15-troubleshooting.ja.md` → **exit 1**）— 対訳の文言そのものを確認していないため、対訳側の記載有無は**未判定**である |

**契約面から見た制約**: #3106 の是正は `SETTLED_UNIT_OUTCOME`（発行側の 1 値）と `readSettledUnitOutcomes` の拒否条件（読み側の 1 行）を**同時に**開く必要がある — 片方だけを開くと、発行された cancelled 行が読み側で `INVALID_SETTLED_ROW` になる。下流の `KNOWN_OUTCOMES` は既に `cancelled` を受理するため、fanout 側の語彙拡張は不要である。#2837 の是正は `INVOKE_SWARM_FIELDS` の閉語彙を広げるか、`amadeus-swarm.ts` に read verb を足すかの分岐であり、**いずれも公開契約の追加**になる（是正方式は未決）。

詳細は `architecture.md` / `component-inventory.md` / `code-structure.md` の各対応節を参照。

## 区間の公開契約の変化と、focus 4 件が触れる契約面（260820-fmc-drift-batch、現在、observed `e86fbe125`）

**観測 ref**: base `c8c393bba` → observed `e86fbe125`（97 commits）。行番号はすべて observed 断面で本節の起草時に確認した。

### 1. 新設された CLI 契約

| 契約 | 所在 | 内容 |
|---|---|---|
| `amadeus-mirror-orphan.ts` | `packages/framework/core/tools/amadeus-mirror-orphan.ts`（+377、USAGE は `:297`） | 孤児化した Intent Mirror Issue の診断・修復（#3271）。回帰は `tests/unit/t3147-amadeus-mirror-orphan.test.ts` / `tests/integration/t3147-amadeus-mirror-orphan.integration.test.ts` |
| election `terminate` verb | `packages/framework/core/tools/amadeus-election.ts` | USAGE `:44` の verb 集合が **`open\|next\|status\|vote\|notify\|tally\|render\|verify\|report\|terminate`** へ拡張（#3256 / #3272）。実装 `:346` `terminateRoundElection`。`--reason <text>` / `--superseded-by <ref>` を受ける |
| `release-land` | `scripts/release-land.ts`（+306）+ `scripts/release-land-domain.ts`（+219） | `release.yml` の `workflow_dispatch` から呼ばれる着地オーケストレータ。外部ツール `release-it` を置換 |

### 2. 既存契約の変化

| 契約 | 変化 |
|---|---|
| election の状態語彙 | **`"terminated"` が第一級の終端として追加**。`amadeus-election.ts:736` の有効値は `draft / open / collecting / partial / tallied / rendered / recorded / terminated` の **8 値**。`:190-193` 逐語コメント `a terminated round is a dead end exactly like "recorded"`。遷移は `:357` により **collecting（または terminated への冪等再実行）からのみ**許され、それ以外は逐語 `terminate is only valid for a round stuck in collecting` で拒否。`:859-865` により `terminate` は directive ではなく `vote` と同じ直接アクションである |
| `invoke-swarm` directive | `--batch` が directive 搬送値になった（#2837 / PR #3202）。8 conductor 面の散文が `--batch <n>` の手動指定から `--batch <directive.batch>` へ同期。pi 面の逐語（observed）: `` `--batch` is never guessed or re-derived: pass `directive.batch`, the engine's 1-origin batch identity and the durable Unit Pool id every later call for this batch is keyed by. `` あわせて `--check-cmd` / `--test-file` は **engine が供給しない conductor 知識**であると明文化された |
| `amadeus-swarm finalize` | source-only の統合ステップが加わった（#3197 / PR #3212）。conductor 面の逐語: `finalize` は `[--target <branch>] [--strategy <squash\|merge\|rebase>]` を受け、既定は prepare が捕捉した base と `squash`。`finalize` は workflow metadata を先に reconcile し、その後 worker の commit 済み source を統合する |
| pr-convergence CLI | `pr-convergence-cli.ts` +237 −16。supersede された unit の正直なクロージャ経路（#3239 / #3270）と、merge-attested landed report を code-generation で受理する経路（#3265）。sensor manifest（`plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md`）も +4 −1 で同期 |
| tla-authoring CLI | **terminal route の receipt 永続化が CLI ゲートで強制**（#3262）。`tla-authoring.ts:424` が `--persist` の値を検査し、`:447` が `failed({kind:"terminal-route-receipt-required", route: judged.value})` を返す。同 failure kind は `tla-applicability.ts:80` にも宣言。stage 契約 `plugins/formal-model-check/stages/tla-authoring.md:60-64` の逐語: ``The CLI gate rejects a terminal route unless `applicability receipt` is called with `--persist true` `` |
| tla registration の draft 契約 | **`authoringProvenance` が必須化**（#3263）。`tla-registration.ts:203-206` 逐語 `return rejected("draft must carry authoringProvenance");` |
| audit イベント契約 | canonical 基数は **98 で不変**（`tests/integration/event-registry-drift.test.ts:51-53`）。`optionalAttributes` の追加が 2 件 — `RECOMPOSED` に `"Workflow completion retracted"`（#3249。`packages/framework/core/otel/event-registry.ts` の逐語コメント `Optional so RECOMPOSED rows emitted before the retraction existed stay valid.`）、worktree 系イベントに `"Base SHA"` |
| plugin manifest 契約 | `plugins/formal-model-check/plugin.json` は `stages`（`formal-model-check` / `tla-authoring`）、`sensors`（1 件）、`tools`（**35 件を明示宣言**）、`advisories`（`spec-change` / `authoring-hold` の 2 件）を持つ。t3078 が git-tracked な `plugins/<name>/tools/*.ts` との一致を **blocking** で検査するようになった |
| テストランナー契約 | `tests/run-tests.ts` に silent-success 3 ゲートの環境変数契約が加わった。`resolveGateModes`（`tests/lib/silent-success.ts:96`）が `"off" \| "report" \| "strict"` の 3 モードを解決し、`anyGateActive`（`:127`）で有効判定する。台帳 basename は `:135` の `BASELINE_BASENAME`、schema version は `:136` の `BASELINE_SCHEMA_VERSION = 1` |

### 3. 撤去された契約

| 契約 | 根拠 |
|---|---|
| `scripts/run-claude.sh` / `scripts/run-codex.sh` | #3299（ローカルランナースクリプトと codex ツールチェーンピンの退役）。付随して `tests/integration/t-run-codex-project-target.test.ts` も削除 |
| `packages/setup/.release-it.json` + devDependency `release-it` | リリース着地の自前化（#3214 系） |
| plugin ツリー内のテストヘルパ | `plugins/formal-model-check/tools/advisory-model-check.ts` → `tests/lib/advisory-model-check.ts` へ R094 移設（#3078）。**plugin `tools[]` は宣言と実ファイルが一致していなければならない、という契約の厳格化** |

### 4. focus 4 件が触れる契約面

| Issue | 契約面 | 追加/変更の性格 |
|---|---|---|
| #3186 | stage 契約 `stages/tla-authoring.md` の発火述語（現状 0 hit）、`model-map.json` の `vocabulary.namedInvariants` / `traceStateVariables` の消費 | **契約の追加**（既存の宣言データに述語を足す。データ形式の変更は不要） |
| #2289 | `composeRegisteredMap` の arity（現状 2、route 非受理）、`RegistrationCommitter.commit` の受け渡し、`AUTHORING_ROUTES` の語彙 | **内部契約の変更**。加えて **`authoringProvenance` の帰属規則が新設対象**（draft 必須 / map optional / 実データ 1-of-4 という非対称を、置換時にどう解決するかが未定義） |
| #2929 | `IMPLEMENTATION_PATHS`（validator）、`implementationRoot`（ローダー）、`matches` glob（sensor）の**三面同時**。3 つの別名 containment 述語（`isCanonicalImplementationPath` / loader `isContained` / `run-model-check-artifacts.ts:129` `isContained`） | **契約の統一**。片面だけの是正は失敗を下流へ移す |
| #3187 | `plugin.json` の `advisories[]` から `authoring-hold` を撤去、`tla-authoring.ts` の USAGE（`:77,80-81`）から `advisory hold` / `subjects declare` を撤去、stage 手順 `:53` の撤去 | **契約の削除**。`docs/reference/22-formal-model-supply.{md,ja.md}` が唯一の説明面であり同一変更で同期が必要 |

**未決**: 4 件とも是正方式は裁定されていない（`memory/team.md` P1）。とくに #2289 の `authoringProvenance` 帰属は、既存 3 モデルが provenance を持たない以上、置換操作が「新しい provenance を刻む」のか「元の不在を保つ」のかを決めなければ実装できない。**本スキャンはこの選択を行わない。**
