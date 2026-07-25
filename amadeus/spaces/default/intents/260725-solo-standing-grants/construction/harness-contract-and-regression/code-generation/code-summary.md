# Code Summary: harness-contract-and-regression

上流入力(consumes 全数): code-generation-plan.md、business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、logical-components.md、requirements.md、unit-of-work.md

## 実装概要

U3として、U1/U2のcanonical contractを6 harnessへ投影し、presence mintをcanonical seamへ集約し、生成物drift 0と全回帰の収束を確定した。canonical sourceだけを編集し、`dist/`とセルフインストールツリーは `bun scripts/package.ts` / `bun run promote:self` だけで同期した(HR-01、NFR-08)。

### Step 1: conductor手順のsolo grant semantics(FR-25、HR-02–03)

- `packages/framework/core/amadeus-common/protocols/stage-protocol.md:167` に `#### Part 0b: Solo standing grant — grant-backed report and typed fallback` を追加した。carrier pairのall-or-none、`GATE_AUTHORIZATION_SELECTED` route receipt、grant-backed reportのflag、`approved`/`await-approval` のtyped分岐、`target_intent_id`＋`presence_reservation_id` のturn間forward、fallback時にbody/reviewer/sensors/§13を再実行しない規則、reject/Request Changes/halt-and-askを自動化しない規則を記述した。flag名は `amadeus-orchestrate.ts:3151-3160` / `amadeus-state.ts:3239-3242` の実装から実測転記した。

### Step 2–3: host session capabilityのcanonical集約(FR-24、HR-04c–04e)

- `packages/framework/core/tools/amadeus-presence-reservation.ts:384` に `HostSessionCapability` union、`:390` に `hostSessionCapability()` 正規化、`:404` に `mintHumanPresence()` を追加した。availableならreservation mint、それ以外(またはreservation不在)は従来どおり untargeted `HUMAN_TURN` を append する。
- core hook `packages/framework/core/hooks/amadeus-mint-presence.ts:98` はこのseam経由へ置換した。
- Codex `packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts:371`、Kiro CLI `packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts:272` はinline `appendAuditEntry("HUMAN_TURN")` をseamへ差し替え、それぞれ native `session_id` をunionへ変換する。
- Kiro IDE `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts:109` は `hostSessionCapability(undefined, ...)` = `unavailable`。promptSubmitがstable session identityを持たないため targeted continuationは発火せず、共有key/PID/active cursorへ縮退しない(HR-04e、security-design § Harness Capability)。
- Cursor `packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts:118-127` はcore mint hookへ `session_id` をforwardするようにした(従来はpromptのみ)。
- OpenCodeはprompt hook自体を持たないためmint siteがなく、投影されたcore hookがseamを保持する。

### Step 4: 6 harness生成とセルフインストール同期(FR-24、NFR-08)

`bun scripts/package.ts` と `bun run promote:self` で claude / codex / cursor / kiro / kiro-ide / opencode の6 dist と `.claude|.codex|.cursor|.opencode` セルフインストール面を再生成した。生成物の手編集は0件。

### Step 5: 全harness contract regression test(FR-24–25、HR-15、NFR-07)

新規 `tests/integration/t-solo-standing-grant-harness.test.ts`(25 tests)。6 harness × { authorization module 5本のbyte一致、directive/state/audit marker、conductor protocol marker } と mint owner 5面のseam配線、Kiro IDE unavailable、OpenCode mint site不在を検証する。

**落ちる実証**: `git checkout HEAD -- dist/kiro/.kiro/tools/amadeus-directive.ts`(投影前の配布面へ差し替え)で 2 fail / 23 pass を実測し、`bun scripts/package.ts` 再生成で 25 pass / `dist:check` exit 0 へ復帰することを確認した(注入はコミットせず同一手順内で復帰、stash不使用)。

### Step 6: 回帰の閉包

- `tests/integration/t48-audit-event-emitters.test.ts`(U2が残した配布面依存): mintの実append位置がseamへ移ったため、`docs/reference/12-state-machine.md:283` の `HUMAN_TURN` emitter行を `tools/amadeus-presence-reservation.ts` へ更新し(hook/adapterはseamを呼ぶだけであることを明記)、`packages/framework/core/knowledge/amadeus-shared/audit-format.md:53` も同一事実へ同期した。16 pass / 0 fail。
- `tests/unit/t210-adapter-mint-classifier.test.ts:337`: 「adapter内にclassifierとmintが同居する」guardを、新seam契約(`mintHumanPresence` 実在＋adapter-local `appendAuditEntry("HUMAN_TURN")` 不在)へ更新した。guardの趣旨(classifierを迂回するmint siteを作らせない)は強化方向。
- `tests/unit/t81.test.ts:261`: `VALID_EVENT_TYPES` 件数 77→78(`GATE_AUTHORIZATION_SELECTED` 追加分)。導出コメントにも +1 の根拠を追記した。
- test-size purity ratchet(`tests/unit/t-test-size-drift.test.ts`): U1/U2のunit suite 2本が実FS利用でmedium判定だったため、純関数部をunitに残し実FS部をintegrationへ分割した(`tests/integration/t-solo-gate-transaction-seam.test.ts`、`tests/integration/t-solo-standing-grant-domain.test.ts` を新設)。挙動・assertionは移送のみで不変(移送前後とも全green)。
- coverage registry: `bun tests/gen-coverage-registry.ts` を再生成し、`tests/unit/gen-coverage-registry.test.ts` の `EXPECTED_NONE_TO_CLI` に `integration/t-solo-gate-transaction.test.ts` を追記した。ratchetは function 143→145 と上方向のみ。
- `tests/integration/t259-guard-corpus.test.ts`: U2の `(options.routeIdFactory ?? randomUUID)()` がcorpus scannerの分類対象外だったため、`packages/framework/core/tools/amadeus-orchestrate.ts:1589-1590` を `const mintRouteId = ...; const routeId = mintRouteId();` へ挙動不変で分解した(guardを緩めず実装側を分類可能形にした)。
- complexity gate: U1/U2実装由来の NEW_VIOLATION 4件(`parseReservation` CCN 36、`amadeus-state.ts` の匿名3件)と `validateDirective` の 19→20 ratchet regression が残っていたため、gate自身が定める reviewed exception 経路 `bun tests/complexity-gate.ts --update` でbaselineを更新した。**これは実装のリファクタではなくbaseline受容であり、レビュー判断を要する**(下記「レビュー判断が必要な事項」参照)。

### Step 7: 文書化要否の判定(FR-26)

| Surface | 既存責務 | 変更 | 根拠 |
|---|---|---|---|
| `/amadeus` help | `/amadeus` utility verbのみを列挙(`amadeus-utility.ts:208-245` HELP_TEXT_TAIL) | 不要 | 本Unitが追加した公開面はstate/orchestrate CLIのflagであり、helpは元から `grant-standing-delegation` 等のstate verbを記載していない(実測: help出力に standing/grant の語 0 件) |
| doctor | `standingGrantDoctorCheck`(`amadeus-utility.ts:946`)が有効grantを報告 | 不要 | `findActiveStandingGrant`(`amadeus-lib.ts:3929`)はmode非依存にspace全intentの `GRANT_ISSUED` を走査するため、solo grantも既存checkでそのまま報告される。出力・fixtureとの矛盾なし |
| state-machine reference | 監査event registry | 更新済 | `GATE_AUTHORIZATION_SELECTED` 行はU2で追加済。本Unitは `HUMAN_TURN` のemitter行をseamへ是正(`docs/reference/12-state-machine.md:283`) |
| audit-format(knowledge) | event catalog | 更新済 | `HUMAN_TURN` のemitter列をseームへ同期(`audit-format.md:53`) |

frozen PR #1468 は参照・依存していない。

## 変更ファイル

| 区分 | パス | 内容 |
|---|---|---|
| 変更 | `packages/framework/core/amadeus-common/protocols/stage-protocol.md` | Part 0b conductor semantics |
| 変更 | `packages/framework/core/tools/amadeus-presence-reservation.ts` | `HostSessionCapability` / `hostSessionCapability` / `mintHumanPresence` |
| 変更 | `packages/framework/core/hooks/amadeus-mint-presence.ts` | canonical seam経由へ置換 |
| 変更 | `packages/framework/core/tools/amadeus-orchestrate.ts` | route id mintの分類可能形への分解(挙動不変) |
| 変更 | `packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts` | seam投影＋session_id正規化 |
| 変更 | `packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts` | seam投影＋session_id正規化 |
| 変更 | `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts` | seam投影(unavailable、fail-closed) |
| 変更 | `packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts` | mint payloadへ session_id forward |
| 変更 | `packages/framework/core/knowledge/amadeus-shared/audit-format.md`、`docs/reference/12-state-machine.md` | `HUMAN_TURN` emitterの是正 |
| 新規 | `tests/integration/t-solo-standing-grant-harness.test.ts` | 6 harness contract regression |
| 新規 | `tests/integration/t-solo-gate-transaction-seam.test.ts`、`tests/integration/t-solo-standing-grant-domain.test.ts` | U1/U2 unit suiteの実FS部の層移送 |
| 変更 | `tests/unit/t-solo-gate-transaction.test.ts`、`tests/unit/t-solo-standing-grant-domain.test.ts` | 純関数部のみを残す分割 |
| 変更 | `tests/unit/t210-adapter-mint-classifier.test.ts`、`tests/unit/t81.test.ts`、`tests/unit/gen-coverage-registry.test.ts` | seam契約・event件数・spawner台帳の同期 |
| 変更 | `tests/.coverage-registry.json`、`tests/.coverage-ratchet.json`、`tests/.complexity-baseline.json` | 生成物・baseline更新 |
| 生成 | `dist/<6 harness>/**`、`.claude|.codex|.cursor|.opencode/**` | 106 path(dist 64 / self-install 42)。すべて生成コマンド経由 |

## 検証結果(すべて生成後の同一working tree、実測)

| コマンド | 実測 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(error 0 / warning 273。既存repository-wide 269 + 本Unitの新規test 3ファイル由来 4 warning。変更ファイル限定 `bunx biome lint`(15 file)は exit 0) |
| `bun run dist:check` | exit 0 |
| `bun run promote:self:check` | exit 0 |
| focused suites 7 file(`tests/unit/t-solo-gate-transaction.test.ts`、`tests/unit/t-solo-standing-grant-domain.test.ts`、`tests/integration/t-solo-gate-transaction.test.ts`、`tests/integration/t-solo-gate-transaction-seam.test.ts`、`tests/integration/t-solo-standing-grant-domain.test.ts`、`tests/integration/t-standing-grant.test.ts`、`tests/integration/t-solo-standing-grant-harness.test.ts`) | exit 0、150 pass / 0 fail / 545 assertions、`Ran 150 tests across 7 files`(全path実在確認済み、期待7ファイルと一致) |
| regression suites 10 file(`t210-adapter-mint-classifier`、`t81`、`t111`、`t28-audit-event-sync`、`t112-delegated-approval`、`t188-human-presence-gate`、`t48-audit-event-emitters`、`t-test-size-drift`、`t134-mechanism-honesty`、`gen-coverage-registry`) | exit 0、253 pass / 0 fail / 1700 assertions、`Ran 253 tests across 10 files`(期待10ファイルと一致) |
| `bash tests/run-tests.sh --ci` | exit 3、Test files 521 / Total assertions 7314 / Failed files 3 / Failed assertions 3。残3件はすべて下記の環境起因(本変更由来 0 件) |
| `git diff --check` | exit 0 |

### 全testスイートの残3件(本変更由来ではない、実測帰属)

- `tests/integration/t257-status-registry-migration.test.ts`「records complete 100-child p95, RSS pairs, growth, and provenance」
- `tests/integration/t258-lifecycle-transaction.test.ts`「records 100-child p95 and paired incremental RSS with provenance」
- `tests/integration/t259-guard-integration.test.ts`「10k-row guard overhead remains bounded for all operations」

3件とも失敗理由は同一の `cannot resolve Git ref refs/heads/<branch>`(provenance採取)。機序: 各testのref解決helper(例 `t257-status-registry-migration.test.ts:205-214`)はloose refを **worktreeのgitDir配下** だけで探し、見つからなければ common dirの `packed-refs` を読む。git worktreeではbranchのloose refはcommon dirの `refs/heads/` にあるため探索から外れ、`packed-refs` にも未収録(実測: `packed-refs` grep 0 件、`<common>/refs/heads/codex/solo-standing-grants` は実在)で常に throw する。worktree実行環境固有で、3ファイルとも本変更で1行も触れていない(`git diff HEAD -- <3 file>` は空)。

## Plan差分

- Step 1–8は計画どおり実施。Step 6は計画時点で想定していなかった付随閉包(t210 seam契約、t81 event件数、test-size層移送、coverage registry、guard corpus、complexity baseline)を含む。いずれもU1/U2実装が残した既存gateとの整合であり、gateを緩める方向の変更は complexity baseline の受容1件のみ(この1件も末尾の是正節で差し戻し、リファクタで解消済み)。
- 要求外の後方互換レイヤー・フォールバック分岐・移行シム・二重実装は追加していない。`dist/`とセルフインストールツリーの手編集は0件。

## レビュー判断が必要な事項(builderは自己判断で確定していない)

1. **OpenCode native prompt plugin / Kiro IDE stable identity adapter を実装していない。** `logical-components.md` は `packages/framework/harness/opencode/amadeus-opencode-plugin.ts`(新規)とKiro IDE capability更新をowner pathとして挙げるが、`business-logic-model.md` § Identity Sources と `security-design.md` § Harness Capability は「両harnessはnative stable identity adapterが完成するまでtargeted continuationを完了扱いにせず、mutation 0でfail-closed」と定める。requirements.md にも新規host pluginを要求するFRはない。未実測の外部host API(OpenCode plugin API)へ確約を書くことは `external-seam-vocab-measurement` に反するため、本Unitでは **fail-closed側(unavailable)を実装してtestで固定** し、新規plugin実装は行っていない。両harnessのtargeted continuation受け入れは未達のまま。
2. **complexity gate baseline の受容更新。** U1/U2実装由来の CCN 超過4件と `validateDirective` 19→20 のratchet regressionを、リファクタではなく `--update` によるbaseline受容で解消した。他Unitの実装本体をこの段階で改変するリスクを避けた判断であり、リファクタを選ぶなら差し戻しが必要。**→ 2026-07-25 のユーザー裁定により差し戻し済み。本ファイル末尾の「是正: complexity gate の baseline 受容を差し戻し、リファクタで解消」節を参照。**

---

## 是正: complexity gate の baseline 受容を差し戻し、リファクタで解消(2026-07-25)

### ユーザー裁定

上記「レビュー判断が必要な事項」2 について、ユーザーは **「リファクタで解消させる」** を選択した。したがって前任 builder の `bun tests/complexity-gate.ts --update`(reviewed exception 経路)による baseline 受容を差し戻し、実装の分解で gate を通す。

### 差し戻した baseline

- ファイル: `tests/.complexity-baseline.json`
- 復元方法: `git checkout HEAD -- tests/.complexity-baseline.json`(git 履歴からの復元。手書き復元はしていない)
- 差し戻した受容内容(前任の `git diff` 実測): `validateDirective` 19→20 の書き換え、`parseReservation` CCN 36 の新規エントリ追加、`amadeus-state.ts` の `(anonymous)` ordinal 16→18 / 19→21 の書き換えと ordinal 25(CCN 16)の新規エントリ追加。
- 現在の状態: `git status --short tests/.complexity-baseline.json` は空出力 = HEAD と同一。

### 是正前の実測(`bun tests/complexity-gate.ts --check`, exit 1)

```
COMPLEXITY GATE FAILED [NEW_VIOLATION]: 4 function(s) over CCN 15 and not in the baseline:
  CCN 36  parseReservation  packages/framework/core/tools/amadeus-presence-reservation.ts
  CCN 30  (anonymous)  packages/framework/core/tools/amadeus-state.ts
  CCN 16  (anonymous)  packages/framework/core/tools/amadeus-state.ts
  CCN 16  (anonymous)  packages/framework/core/tools/amadeus-state.ts
COMPLEXITY GATE FAILED [RATCHET_REGRESSION]: 1 baselined function(s) got MORE complex:
  CCN 19 -> 20  validateDirective  packages/framework/core/tools/amadeus-directive.ts
```

### 違反の帰属(lizard 直実測による切り分け)

`amadeus-state.ts` の 3 件のうち **2 件は ordinal ずれによる誤帰属** だった。HEAD の測定(`git show HEAD:...` を lizard へ通した実測)と現行測定の対照:

| lizard ordinal (HEAD) | CCN (HEAD) | ordinal (是正前) | CCN (是正前) | 帰属 |
|---|---|---|---|---|
| 16 | 30 | 18 | 30 | 既存関数。ordinal ずれのみ(複雑度不変) |
| 19 | 16 | 21 | 16 | 既存関数。ordinal ずれのみ(複雑度不変) |
| 23 | 13 | 25 | 16 | 真の複雑度増(+3) |

ordinal が +2 ずれた原因: U1/U2 で追加された `operationWithLock` / `withStateOperationTarget` の **パラメータ位置のインライン関数型注釈**(`fn: () => T ...`)を lizard が `(anonymous)` として計数していたため。名前付き type alias にすると計数されないことを scratch(`/tmp/t2.ts`)で決定的に確認した(インライン矢印型 → `(anonymous)@1-1` 1 件 / alias 化 → 0 件)。これは `cid:code-generation:complexity-baseline-ordinal`(匿名増ゼロを第一手とする)の適用ケース。

### 分解した関数と実測 CCN(前→後)

| file:line(是正後) | 関数 | CCN 前 → 後 | 手法 |
|---|---|---|---|
| `packages/framework/core/tools/amadeus-presence-reservation.ts:137-161` | `parseReservation` | **36 → 9** | 巨大な単一 boolean 式を、フィールド名で引く parse 規則テーブル `RESERVATION_FIELD_CHECKS`(`Readonly<Record<ReservationKey, ReservationFieldCheck>>`、`:70-86`)へ置換。state と provenance の整合判定を `provenanceMatchesState`(`:90-94`, CCN 4)へ抽出 |
| `packages/framework/core/tools/amadeus-directive.ts:391-447` | `validateDirective` | **20 → 10** | 11 分岐の `switch (kind)` を、既存の `KNOWN_FIELDS_BY_KIND` と同型のディスパッチテーブル `FIELD_CHECKS_BY_KIND`(`Readonly<Record<DirectiveKind, DirectiveFieldCheck>>`, `:340-372`)へ置換。`Record` が DirectiveKind に対して total なため、kind 追加時の検査漏れは従来の `switch` 網羅性検査と同じくコンパイルエラーになる |
| `packages/framework/core/tools/amadeus-state.ts:2107-2212`(`handleCompleteWorkflow` の lock 内クロージャ) | `(anonymous)` ordinal 22 | **16 → 12** | 完了時の intent registry 行遷移 + active-intent カーソル解放を `completeIntentRegistryRow`(`:2216-2233`)へ抽出。抽出先はハンドラの**後方**に配置し、baseline 済み ordinal 16 / 19 の位置を動かしていない |
| `packages/framework/core/tools/amadeus-state.ts:642-655` | (型注釈) | 匿名 2 件 → 0 件 | パラメータ位置のインライン関数型を `SyncOperation<T>` / `TargetedOperation<T>` の type alias へ抽出。これにより baseline 済み anonymous の ordinal が 18/21 → **16/19 に復帰**(CCN は 30 / 16 のまま不変) |

是正後の lizard 実測(baseline 該当分):

```
ord=16 ccn=30 (anonymous)@1753-1976@packages/framework/core/tools/amadeus-state.ts
ord=19 ccn=16 (anonymous)@1988-2081@packages/framework/core/tools/amadeus-state.ts
ord=22 ccn=12 (anonymous)@2107-2212@packages/framework/core/tools/amadeus-state.ts
      24     9   166     1    25 parseReservation@137-161@.../amadeus-presence-reservation.ts
      ...   10   ...            validateDirective@391-447@.../amadeus-directive.ts
```

### 計測盲点の自己捕捉(gate の偽グリーン回避)

`parseReservation` の分解直後、`complexity-gate.ts --check` は exit 0 を返したが、`python3 -m lizard --csv .../amadeus-presence-reservation.ts | wc -l` が **4**(416 行のファイルで関数 4 件)であり、lizard がファイル途中で解析を打ち切っていた = gate がこのファイルを見ていない偽グリーンだった。切り分け(先頭 N 行での二分探索、`/tmp/head.ts`)で、テーブル内に正規表現リテラルを直接引数として並べた行から先が不可視化されることを特定。正規表現を既存様式どおり名前付き const(`SHA256_HEX_RE` / `STAGE_SLUG_RE` / `SHARD_NAME_RE`)へ切り出して解消し、可視関数数は **4 → 27** に回復した。その状態で改めて gate を実測して exit 0 を確認している(下表)。

### 挙動不変性

- `parseReservation`: 例外メッセージ 3 種(`must be an object` / `has an unknown or missing field` / `field is malformed` / `state does not match its provenance`)と送出条件は不変。フィールド検査の評価順は元の短絡順(宣言順)からテーブルのキー順(`RESERVATION_KEYS` の昇順)へ変わるが、どのフィールドが落ちても送出されるメッセージは同一のため観測可能な差はない。
- `validateDirective`: 各 kind に対する検査呼び出しとその順序、`errors` への push 文言は switch 版と 1:1。
- `completeIntentRegistryRow`: 元の逐次処理をそのまま移設。呼び出し位置は `operationWriteState` の直後・`console.log` の直前で不変(= 保持中のロック内、audit 行の順序と内容は不変)。
- 公開契約(exit code、stdout/stderr の wire schema、audit event の順序と内容)への変更なし。要求外の後方互換レイヤー・フォールバック分岐は追加していない。

### 検証(すべて同期実行、実測 exit code)

| コマンド | 実測 |
|---|---|
| `bun tests/complexity-gate.ts --check` | **exit 0** — `complexity gate: OK — 0 new violations, 0 regressions, baseline 59 entries (worst CCN 65), threshold 15`(warn band 129 件は informational) |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(全体: 272 warnings / 20 infos、いずれも既存の複雑度 informational) |
| `bunx @biomejs/biome check` 変更3ファイル限定 | exit 0 — `Checked 3 files`, 17 warnings。全件 `amadeus-state.ts` の既存 `lint/complexity/*`・`lint/correctness/*`。`amadeus-directive.ts` / `amadeus-presence-reservation.ts` は 0 件(新規 error/warning 増ゼロ) |
| `bun scripts/package.ts` | exit 0 |
| `bun run promote:self` | exit 0 |
| `bun run dist:check` | exit 0 — `all harness trees in sync` |
| `bun run promote:self:check` | exit 0 — `project-local self install is in sync` |
| `bash tests/run-tests.sh --ci` | exit 3 — Test files 521 / Total assertions 7314 / **Failed files 3 / Failed assertions 3** |
| `git diff --check` | exit 0 |

`run-tests.sh --ci` の残 3 件は本是正の前と同一・同数で、既知の worktree 実行固有バグ(ref 解決 helper が common dir の `refs/heads/` を見ない)由来:

- `t257 status registry performance contract > records complete 100-child p95, RSS pairs, growth, and provenance`
- `t258 intent lifecycle transaction performance contract > records 100-child p95 and paired incremental RSS with provenance`
- `t259 guard integration falling proofs > 10k-row guard overhead remains bounded for all operations`

本是正で 3 ファイルとも 1 行も触れておらず、失敗件数は既知の残赤を超えていない。

### 停止した逸脱

なし。本是正はユーザー裁定の範囲内(baseline 差し戻し + 挙動不変リファクタ)に収まっており、要件・設計からの逸脱は発生していない。上記「レビュー判断が必要な事項」1(OpenCode / Kiro IDE の native identity adapter 未実装)は本是正の対象外で、未解決のまま残る。
