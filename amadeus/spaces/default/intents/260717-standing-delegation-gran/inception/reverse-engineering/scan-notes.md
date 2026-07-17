# Reverse Engineering スキャンノート — 260717-standing-delegation-gran(Issue #1125 常任委任グラント機構)

上流入力(consumes 全数): （本ノートは reverse-engineering の Developer スキャン一次成果物であり、上流成果物を consume しない — codekb 差分と現行コードの実測から生成する）

- **走査方式**: diff-refresh(フルスキャン禁止)。区間 `e530fc4b13f477e9155d1ec246fd50a49176eadd..HEAD`
- **measurement-ref**: 全ての件数・行番号・grep 結果は **HEAD = `46f51091f0c8d5d39dc9790a218d03293ffdf060`** の作業ツリーで測定
- **base 祖先性**: `git merge-base --is-ancestor e530fc4b13... HEAD` → 真(実測)、距離 `git rev-list --count` = **67**
- 引用の file:line は現 HEAD で再特定、verbatim 断片併記(記憶・過去記録からの転記なし)

---

## 1. 区間 diff の全体像

`git diff --stat <base>..HEAD` 末尾(実測): **427 files changed, 17676 insertions(+), 352 deletions(-)**。

区間の実体は **1つ前の intent(260716-answer-preemption-guard = E-OC1 evidence guard / answer-evidence sensor)** の着地であり、大半は dist/self-install 再生成と各 stage md の `sensors:` 1行追記(`.../stages/**/*.md | 1 +` が多数)。本 intent(#1125)が触る delegate provenance 機構は **区間内では変更されていない**(既存基盤を消費・拡張する側)。

### packages/framework/core/tools/ 配下の変更ファイル(区間 diff、全数)

`git diff --stat <base>..HEAD -- packages/framework/core/tools/` の実測(3ファイル):

| ファイル | 増減 | 1行要旨(diff 実読) |
|---|---|---|
| `amadeus-lib.ts` | +9 | `export const QUESTIONS_EVIDENCE_CUTOFF_YYMMDD = 260716;`(:1174 付近)を新設 — E-OC1 evidence guard の enforcement cutoff を canonical 化。gate-start ガードと answer-evidence センサーが同一定義を参照 |
| `amadeus-sensor-answer-evidence.ts` | +129(新規) | E-OC1 質問エビデンスを検査する advisory センサー本体(本 intent とは別系統) |
| `amadeus-state.ts` | +11/-3 | `handleGateStart`(:1718 付近)のローカル `GUARD_CUTOFF_YYMMDD = 260716` を廃し、lib の `QUESTIONS_EVIDENCE_CUTOFF_YYMMDD` を import して参照(drift 排除) |

core/tools 以外の区間変更(要点のみ):
- `packages/framework/core/sensors/amadeus-answer-evidence.md`(+56、新規センサー manifest)
- `tests/integration/t-answer-evidence-sensor.test.ts`(+256、新規)、`tests/.coverage-ratchet.json` / `tests/.coverage-registry.json` 更新、`t89`/`t93` 微修正
- `tests/fixtures/designer-export/export.json`(+232/-…、fixture 再生成)
- dist/self-install 各ツリーへの上記の伝播(生成物)

**含意**: 本 intent のグラント実装は区間の新規面と衝突しない。挿入 seam(delegate provenance)は区間より前から存在する安定面であり、以下 §2 は **現 HEAD の実測**で提示する。

---

## 2. delegate provenance 機構の現況(グラント実装の挿入 seam)

### (a) `amadeus-lib.ts` — humanActedSinceGate / verifyDelegatedProvenance

**`humanActedSinceGate`**(定義 `packages/framework/core/tools/amadeus-lib.ts:2479-2499`):
```
export function humanActedSinceGate(
  projectDir: string,
  verb?: "approve" | "reject"
): boolean {
  const events = scanPresenceLedger(projectDir);
  if (events === null) return true; // fail open
  if (verb === undefined) {
    return humanActOutstanding(events, (e) => e.human, (e) => e.res !== undefined);
  }
```
- **シグネチャ**: `(projectDir, verb?)`。verb 未指定 = 汎用述語(delegate 発行時の issuer grounding が依拠、legacy 一様境界)。verb 指定時は per-delegate GATE slot・verb-scoped(#685)。
- **fail-open 分岐**: `scanPresenceLedger` が `null`(ledger 読取不能)なら `return true`(:2483)。
- verb 指定時は「ローカル HUMAN_TURN が outstanding なら true(:2493 `if (humanTurnOutstanding) return true;`)、無ければ当該 verb の delegate slot(`e.delegVerb === verb` かつ `e.res === "gate"`)を評価」。

**`verifyDelegatedProvenance`**(定義 `amadeus-lib.ts:2528-2565`):
```
export function verifyDelegatedProvenance(projectDir: string, block: string): boolean {
  const issuerIntent = auditBlockField(block, "Issuer Intent");
  const issuerShard = auditBlockField(block, "Issuer Shard");
  const issuerHumanTs = auditBlockField(block, "Issuer Human Ts");
  const issuerSpace = auditBlockField(block, "Issuer Space") ?? undefined;
  if (!issuerIntent || !issuerShard || !issuerHumanTs) return false;
```
- **検証手順**: (1) block から 4 座標(Issuer Intent / Shard / Human Ts / Space)を抽出 (2) 必須3つ欠落なら false (3) path-shape ガード: `issuerIntent` は `/^[A-Za-z0-9._-]+$/` かつ `.`/`..` 拒否(:2534-2536)、`issuerShard` は `/^[A-Za-z0-9._-]+\.md$/`(:2537) (4) `auditShardDir` で解決した shard を読み、`HUMAN_TURN` イベントで `Timestamp === issuerHumanTs` の block が物理的に存在すれば true(:2547-2551)。
- **fail 分岐**: 「あらゆる異常(欠落/不正フィールド、path-shape 違反、shard 読取不能、HUMAN_TURN 不在)で fail-closed」(コメント :2523-2526、実装は各 `return false`)。
- 呼び出し元は `humanActOutstanding` を回す `scanPresenceLedger` 内の分岐 `amadeus-lib.ts:2413-2419`(`ev === "DELEGATED_APPROVAL"` / else で `verifyDelegatedProvenance(projectDir, blocks[pos])`)。
- **forgery 耐性コメント**(:2510-2517):HUMAN_TURN は UserPromptSubmit hook のみが書き、汎用 audit CLI は mint を拒否(`presenceMintRejection`/`rawPresenceMintRejection`)。**残余限界**(:2519-2523):任意 file-write ツールによる shard 直書きは CLI ガードの対象外(on-disk append-only trail の一般性質)。

### (b) `amadeus-state.ts` — 接地ゲートと DELEGATED_APPROVAL 監査行の書式

**`assertHumanPresentForGateResolution`**(定義 `amadeus-state.ts:1781-1805`):
```
function assertHumanPresentForGateResolution(
  pd, content, slug, verb: "approve" | "reject"
): void {
  if (isAutonomousMode(content)) {
    // skip — autonomous Construction has no human at the gate
  } else if (humanPresenceGuardDisabled()) {
    // skip — AMADEUS_SKIP_HUMAN_PRESENCE_GUARD
  } else if (!humanActedSinceGate(pd, verb)) {
    error(`Refusing to ${verb} "${slug}": a real human has not acted ...`);
  }
}
```
- 3分岐の skip 条件: (1) `isAutonomousMode(content)` (2) `humanPresenceGuardDisabled()`(env `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`) (3) 上記いずれでもなく `!humanActedSinceGate(pd, verb)` なら `error()`(exit)。
- 呼び出し: `handleApprove` が `assertHumanPresentForGateResolution(pd, content, slug, "approve")`(:1841、mutation 前)、`handleReject` が同 `"reject"`(:2163)。

**`handleDelegateApproval`**(定義 `amadeus-state.ts:1957-2038`):
- grounding gate(:1975):`if (!humanPresenceGuardDisabled() && !humanActedSinceGate(pd))` → 拒否。
- issuer 座標収集(:1983-2007):`issuerSpace = activeSpace(pd)`、`issuerIntent = activeIntent(pd, issuerSpace)`、`shardDir = auditShardDir(...)`、`issuerShard = auditShardName(pd)`、issuer shard の最終 `HUMAN_TURN` の timestamp を `issuerHumanTs` に(`findAllEvents(...,"HUMAN_TURN")` の末尾、:1995-1996)。HUMAN_TURN 不在なら error(:1999-2003)。
- target 実在検査(:2009-2014):`recordDir(pd, toIntent, toSpace)` が null か `amadeus-state.md` 不在なら error(scaffold しない)。

**DELEGATED_APPROVAL 監査行の書式(フィールド全数)** — `amadeus-state.ts:2016-2023`(実測):
```
  const fields: Record<string, string> = {
    Stage: slug,
    "Issuer Space": issuerSpace,
    "Issuer Intent": issuerIntent,
    "Issuer Shard": issuerShard,
    "Issuer Human Ts": issuerHumanTs,
  };
  if (userInput) fields["User Input"] = userInput;
  const res = appendAuditEntry("DELEGATED_APPROVAL", fields, pd, toIntent, toSpace);
```
→ フィールド: **Stage / Issuer Space / Issuer Intent / Issuer Shard / Issuer Human Ts**(+ 任意 **User Input**)。加えて appendAuditEntry が Timestamp を付す。DELEGATED_REJECTION 側(`handleDelegateRejection` :2041-2137)は同座標で User Input の代わりに **Feedback**(:2121 付近 `delegated: true`)。
- サブコマンド dispatch: `case "delegate-approval": handleDelegateApproval(args.slice(1))`(:398-399)、`delegate-rejection`(:401)。

### (c) `amadeus-audit.ts` — イベント名 allowlist と HUMAN_TURN mint 拒否

- **イベント名 allowlist**: `const VALID_EVENT_TYPES = new Set([...])`(`amadeus-audit.ts:22`)。`HUMAN_TURN`(:50)、`DELEGATED_APPROVAL`(:68)、`DELEGATED_REJECTION`(:75)を含む。未知イベントは append/append-raw で `Invalid event type: ...`(:275-277、:308-310)。
- **保護イベント集合**: `const PRESENCE_PROTECTED_EVENTS = new Set(["HUMAN_TURN","DELEGATED_APPROVAL","DELEGATED_REJECTION"])`(`amadeus-audit.ts:766-770`)、heading 版 `PRESENCE_PROTECTED_HEADINGS`(:774-776)。
- **HUMAN_TURN mint 拒否の実装行**:
  - `append` 経路: `presenceMintRejection(eventType)`(定義 :780-783)— `if (!PRESENCE_PROTECTED_EVENTS.has(eventType)) return null;` して該当時に拒否メッセージ。呼び出しは `main()` 内 `const rejection = presenceMintRejection(eventType);`(:348)。
  - `append-raw` 経路: `rawPresenceMintRejection(heading, expandedBody)`(定義 :795-810)— heading 一致 or body の `**Event**: <type>` 行を per-line で検出して拒否。呼び出しは :364。
  - EVENT_HEADINGS マップ(:146-)に `HUMAN_TURN: "Human Turn"`(:166)、`DELEGATED_APPROVAL: "Delegated Approval"`(:174)、`DELEGATED_REJECTION`(:175)。
- 設計コメント(:754-765):trust anchor は「WHO may write」に依存 — in-process `appendAuditEntry` のみ許可、汎用 CLI は拒否。CLI hole は塞ぐが直接 file-write は別 concern(§2a 残余限界と一致)。

### (d) `audit-format.md`(正本)のイベント taxonomy 節

- **正本パス**: `packages/framework/core/knowledge/amadeus-shared/audit-format.md`(配布コピーは `.claude/`・`.codex/` 配下)。
- 見出し構造(`grep -nE '^#{1,4} '` 実測): `# Audit Event Taxonomy`(:1) → `## Event Registry (73 events, 18 categories)`(:11) → カテゴリ別 `### ...` サブ節。`### Interaction Events (4 events)`(:71)に delegate 系が属する。
- delegate 行(実測、テーブル様式 `| イベント | 説明 | フィールド | 発生源 |`):
  - `:79` `| DELEGATED_APPROVAL | ... | Timestamp, Stage, Issuer Space, Issuer Intent, Issuer Shard, Issuer Human Ts, User Input | tools/amadeus-state.ts delegate-approval |`
  - `:80` `| DELEGATED_REJECTION | ... | Timestamp, Stage, Issuer Space, Issuer Intent, Issuer Shard, Issuer Human Ts, Feedback | tools/amadeus-state.ts delegate-rejection |`
  - `:51` `| HUMAN_TURN | ... | Timestamp | hooks/amadeus-mint-presence.ts (...) |`
- **注意(件数の整合)**: 見出しは「73 events, 18 categories」と表記。新イベント種別を追加する場合、この見出しの件数と `t28-audit-event-sync.test.ts`(§7)が taxonomy↔`VALID_EVENT_TYPES` の同期を強制する点に留意(グラント機構が新イベントを導入するなら3面同時更新が必要)。

---

## 3. ゲート分類データ(既定除外の実装材料)

### phase-boundary 判定(`amadeus-state.ts`)

- phase-check ガードは `amadeus-state.ts:141-162` 付近(`markPhaseVerified` / phase 完了経路)。実測断片:
  - `:158` `const artifactPath = join(rec, "verification", "phase-check-${phase}.md");`(テンプレートリテラル、`${phase}` は `stage.phase` 由来)
  - `:160-161` 不在時 `Refusing to complete the "${phase}" phase boundary: verification/phase-check-${phase}.md does not exist ...`
- 「phase boundary の PHASE_VERIFIED flip は phase-check 書き込み前に fire しない」(コメント :124-125)。**どの stage が phase boundary か**は `stage.phase` 値と、実際に phase-check を produce する stage(コメント :131「ideation の approval-handoff 等」)で決まる — スコープ依存で移動(project.md `phase-check-before-final-approve` と整合)。
- **含意(グラント既定除外)**: phase-boundary ゲートかどうかは「record 下 `verification/phase-check-<phase>.md` の要求有無」で判定可能。常任委任のグラント既定除外(不可逆・phase 境界を人間に残す)を実装するなら、この artifactPath 要求ロジックが分類の一次シグナル。

### walking-skeleton(Skeleton Stance)の状態表現・読み出し

- 書き込み: `handleSetSkeletonStance`(`amadeus-state.ts:548-577`)。許容値 `["on","off","scope-dependent"]`(:552)。state file の `## Runtime State` 節へ `setOrInsertField(content, "## Runtime State", "Skeleton Stance", stance)`(:568-573)で挿入。
- **状態表現**: `Skeleton Stance` は **runtime metadata**(Revision Count 同様)で、`## Runtime State` 節の 1 フィールド。set-skeleton-stance サブコマンド(dispatch :374-375)で classify round-trip 経由で書かれる。
- 読み出し: フィールド名 `Skeleton Stance` を `setOrInsertField`/フィールドパーサで扱う(`grep 'Skeleton Stance'` で state.ts:572 と `## Walking Skeleton`(:2643、state テンプレート節)がヒット)。
- **含意**: skeleton ゲート(Bolt 1 単独ゲート)の状態は `Skeleton Stance` フィールドで表現され、既定グラント除外の対象判定に読み出せる。

---

## 4. env 読取の前例列挙(`process.env.AMADEUS_*`、core 全数)

`grep -rnoE 'process\.env\.AMADEUS_[A-Z_]+' packages/framework/core/` の集計(HEAD `46f51091f` 実測、頻度降順・抜粋):

- `AMADEUS_HARNESS_DIR`×4, `AMADEUS_STAGE_GRAPH`×3, `AMADEUS_DEFAULT_SCOPE`×3, `AMADEUS_STAGES_DIR`×2, `AMADEUS_SCOPES_DIR`×2, `AMADEUS_SCOPE_MAPPING`×2, `AMADEUS_SCOPE_GRID`×2, `AMADEUS_RULES_SUBDIR`×2, `AMADEUS_RULES_DIR`×2, `AMADEUS_MIGRATION_DOCTOR`×2
- 単発: `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`, `AMADEUS_SKIP_ARTIFACT_GUARD`, `AMADEUS_LOCK_STALE_MS`, `AMADEUS_LOCK_UNSTAMPED_GRACE_MS`, `AMADEUS_LOCK_BASE_DIR`, `AMADEUS_SENSOR_TIMEOUT_MS`, `AMADEUS_AUDIT_LOCK_RETRY_MS`, `AMADEUS_AUDIT_LOCK_RETRIES`, `AMADEUS_PLAN_PATH`, `AMADEUS_TEMPLATES_DIR`, `AMADEUS_MEMORY_SEED_DIR`, `AMADEUS_EXPORT_FIXTURE`, ほか `AMADEUS_MIGRATE_TEST_*` / `AMADEUS_DOCTOR_TEST_*` の test hook 群
- **`AMADEUS_OPERATING_MODE`**: `grep -rn 'AMADEUS_OPERATING_MODE' packages/framework/core/` = **0 件**(再確認 実測)。→ operating mode(solo/team)は core ランタイムでは読まれない(team-up.sh 側マーカー)。常任委任グラントが team モードを前提にするなら、この env は core に無いため、モード判定を core で行う設計は前例なし。

**env override の記法前例**: guard off-switch は真偽値的(`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` → `humanPresenceGuardDisabled()`)、数値 TTL は `AMADEUS_LOCK_STALE_MS`(§6 参照)。グラントの env 化はこのいずれかの様式に倣うのが自然。

---

## 5. doctor の構造(グラント可視化行の追加先)

- **エントリ**: `handleDoctor(projectDir)`(`amadeus-utility.ts:711`)。ヘルプ行 `--doctor Run health check on hooks, settings, and directory structure`(:190)。
- **行モデル**: `interface DoctorCheck { pass: boolean; label: string; fix?: string }`(:410-414)。`handleDoctor` は `results: DoctorCheck[]` を組み立て、末尾でループ描画。
- **render/exit**: `for (const r of results) { ... }`(:1974)、最終 `process.exit(failed > 0 ? 1 : 0)`(:2004)。すなわち **1 行 = 1 `results.push({pass,label,fix?})`**、fail が 1 つでも exit 1。
- 既存 push の様式(`results.push({...})` が多数、:718 以降)。ヘルパー関数化された check(`hookHeartbeatDoctorCheck` :530、`codexProjectTrustDoctorCheck` :567、`classifyWorkspaceShellState` :609、`settingsDoctorCheck` :39、`checkPhaseProgressConsistency` :688)を `results.push(fn(projectDir))` で合流させる前例あり。
- **env 可視化の直接前例**: `amadeus-utility.ts:912-932` の `AMADEUS_DEFAULT_SCOPE` チェック — env 未設定は `label: "AMADEUS_DEFAULT_SCOPE (unset — no project default)"` で **pass**、設定済みは valid/invalid で分岐。**これがグラント状態(常任委任の有効/無効・TTL 残)を doctor に1行出す際の直接テンプレート**。追加先は `handleDoctor` 内の `results.push` 列(env 系は 912 付近にまとまっている)。

---

## 6. named constant + env override の前例(TTL 実装の対照)

`DEFAULT_LOCK_STALE_MS` 系(`amadeus-lib.ts:3626-3638`、実測):
```
export const DEFAULT_LOCK_STALE_MS = 10 * 60 * 1000;

function lockStaleMs(): number {
  const raw = process.env.AMADEUS_LOCK_STALE_MS;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_LOCK_STALE_MS;
}
```
- **様式**: `export const DEFAULT_* = <literal>` を canonical に置き、`<name>Ms()` 関数が `process.env.AMADEUS_*` を `Number()` parse → `Number.isFinite(n) && n > 0` の妥当性ゲート → 不正/未設定はデフォルトへ fallback。
- コメント(:3624-3629)がデフォルト値の根拠(保守的 10 分)を明記。
- **含意(グラント TTL)**: 常任委任の TTL(有効期限)を実装するなら、この `DEFAULT_LOCK_STALE_MS`/`lockStaleMs()` が **完全な対照実装**。named constant + `parse-don't-validate`(数値 parse 後に比較、team.md `verification-numeric-parse` と整合)+ env override + fallback を1関数で満たす。同 intent の要件で数値を書くときは constants-from-code(project.md)に従い、この named constant を file:line で引くこと。

---

## 7. テスト面(白側 sweep の基準面)

`grep -rlE 'delegate-approval|delegate-rejection|verifyDelegatedProvenance|humanActedSinceGate|DELEGATED_APPROVAL|DELEGATED_REJECTION|human.presence|HUMAN_TURN|presenceMintRejection|assertHumanPresent' tests/` = **21 ファイル**(実測、json/fixture 含む)。うち直接関連する主要テスト(コード面):

| テスト | 対象(ヘッダ `// covers:` より) |
|---|---|
| `tests/unit/t112-delegated-approval.test.ts` | `file:tools/amadeus-lib.ts, file:tools/amadeus-state.ts`(delegate-approval provenance の本体) |
| `tests/unit/t188-human-presence-gate.test.ts` | `handleApprove, handleReject, assertHumanPresentForGateResolution, handleGateStart, humanActedSinceGate, humanActedSinceLastAnswer, hasOpenGate, isAutonomousMode, humanPresenceGuardDisabled` + `hooks/amadeus-mint-presence.ts` |
| `tests/unit/t-delegate-answer-consume.test.ts` | `file:tools/amadeus-lib.ts`(delegate と answer slot の消費関係、#736) |
| `tests/unit/t-phase-check-gate-seam.test.ts` | phase-check ゲート seam(§3 の phase-boundary 面) |
| `tests/unit/t28-audit-event-sync.test.ts` | taxonomy(audit-format.md)↔ `VALID_EVENT_TYPES` の同期(§2c/§2d、新イベント追加時に赤化) |
| `tests/unit/t203-mint-presence-classify.test.ts` / `t208-presence-crossshard-tiebreak.test.ts` / `t209-stop-hook-state-verb-carveout.test.ts` / `t210-adapter-mint-classifier.test.ts` | HUMAN_TURN mint 分類・cross-shard tiebreak・verb carveout(presence ledger 周辺) |
| `tests/unit/t111.test.ts` / `t81.test.ts` | 周辺(audit/state) |
| `tests/smoke/t02-hook-executability.test.ts` | hook 実行性(mint-presence hook) |
| `tests/e2e/t-ide-kiro-checkpoint.serial.test.ts` | e2e checkpoint(delegate/presence を含む) |

レジストリ/fixture(コード変更で同期が必要になる面): `tests/.coverage-registry.json`, `tests/.test-size-purity-allowlist.json`, `tests/run-tests.ts`, `tests/unit/gen-coverage-registry.test.ts`, `tests/logs/test-size-report.json`, `tests/harness/kiro-ide-driver.ts`, `tests/harness/tui-fixtures.ts`。

**白側 sweep の基準**: グラント機構が既存 delegate フローに触れるなら、上表の t112 / t188 / t-delegate-answer-consume / t28 が回帰の一次防護面。新イベント種別や新 audit フィールドを足すなら **t28-audit-event-sync が taxonomy 3面(VALID_EVENT_TYPES / audit-format.md / EVENT_HEADINGS)の同期を強制**する点に注意(§2d の「73 events」件数含む)。

---

## 主要発見(3点)

1. **区間 diff は本 intent と非交差**: 区間 `<base>..HEAD`(427 files / +17676)の実体は前 intent の answer-evidence guard 着地で、core/tools の変更は3ファイル(lib の cutoff canonical 化、新センサー、state の import 切替)のみ。delegate provenance 機構は区間より前から安定しており、#1125 は既存 seam を消費・拡張する側。挿入面は現 HEAD の実測で §2 に確定した。

2. **グラント挿入 seam は3層で明確に分離**: (a) `verifyDelegatedProvenance`(lib.ts:2528、4座標を fail-closed 検証)/`humanActedSinceGate`(lib.ts:2479、verb-scoped・fail-open on ledger 欠落) (b) `assertHumanPresentForGateResolution`(state.ts:1781、autonomous/`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`/presence の3分岐 skip)と `handleDelegateApproval`(state.ts:1957、DELEGATED_APPROVAL フィールド= Stage/Issuer Space/Issuer Intent/Issuer Shard/Issuer Human Ts/+User Input) (c) `PRESENCE_PROTECTED_EVENTS`(audit.ts:766、CLI からの HUMAN_TURN/DELEGATED_* mint を `presenceMintRejection`/`rawPresenceMintRejection` で拒否)。常任委任グラントはこの3層のどこに状態を持たせるかが設計判断の核。

3. **既定除外・TTL・doctor 可視化・env の前例が全て実在**: 既定除外の分類材料は phase-check ガード(state.ts:158 の `verification/phase-check-<phase>.md` 要求)と Skeleton Stance フィールド(state.ts:568、`## Runtime State` の runtime metadata)で読み出せる。TTL は `DEFAULT_LOCK_STALE_MS`+`lockStaleMs()`(lib.ts:3629-3638)が named constant+env parse+fallback の完全な対照。doctor 可視化は `AMADEUS_DEFAULT_SCOPE` 行(utility.ts:912-932、`DoctorCheck{pass,label,fix?}`)が直接テンプレート。ただし **`AMADEUS_OPERATING_MODE` は core で 0 ヒット**(再確認)— team モード判定を core で行う前例は無い。
