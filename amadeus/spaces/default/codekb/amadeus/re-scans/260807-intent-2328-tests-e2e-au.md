# 差分スキャン記録 — 260807-intent-2328-tests-e2e-au（Issue #2328）

## 測定 ref とスキャンモード

- **Observed**: `a5621236c6c69f1c54f3d496bdf91792d4ef12fc`（本 worktree HEAD = `origin/main` 系譜。`cid:reverse-engineering:c2-observed-mainline-commit`）
- **Base**: `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b`（直前 intent 260807-subagent-start-pair の observed。`git merge-base --is-ancestor 5f2ad9195 HEAD` → exit 0 で**祖先性を実測確認**、距離 `git rev-list --count 5f2ad9195..HEAD` = **13 commits**。`cid:reverse-engineering:rescan-base-ancestry` により merge-base fallback は不要）
- **Scan mode**: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー2名成立済みの単発 Issue。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化した
- **レビュー対象 SHA**: `75a1c198d`
- **行番号の currency**: `git diff --name-only 75a1c198d HEAD -- tests/e2e/` = **空**（Architect が独立実測）。`review..observed` の実 diff と被引用パス集合の交わりが空であるため、行番号の再解決は構造的に no-op。`cid:reverse-engineering:E-XBB-RE-S13-c2` の判別に従い、区間は `review..observed` に固定して測定した（`..HEAD` ではない）
- **Verification**: テスト実行・git 状態変更・engine 操作はゼロ。検証は observed 断面の `sed` / `grep` / `git` による verbatim 実読
- **Scan template 境界**: `cid:reverse-engineering:c2-xrev-template-boundary` に従い、re-artifacts.md の Developer Code Scan Template の節構成は踏襲せず、依頼された調査項目を主構造とし、テンプレからは証拠規律（file:line + verbatim + exit code、事実と仮説の分離）のみを適用した

## 1. スキーマ2形の正準定義（実読確認）

`packages/framework/core/tools/amadeus-journal.ts:28-36` verbatim:

```
// v1 is the switchover wire format still produced by the live writers
// (amadeus-audit.ts / amadeus-state.ts); keep this constant at 1 for them.
export const JOURNAL_SCHEMA_VERSION = 1;

// Schema v2 (FR-JRN-1): OTel-shaped records carried natively by the journal.
// Readers accept every version <= MAX; newer versions are refused (BR-10).
export const JOURNAL_SCHEMA_VERSION_V2 = 2;
export const JOURNAL_SCHEMA_VERSION_MAX = JOURNAL_SCHEMA_VERSION_V2;
```

v2 serializer `serializeJournalEntryV2`（`:329-345`）はキー順固定で `schemaVersion` / `eventId` / `seq` / `timestamp` / `eventName` / `attributes` / `intentId` / `space` / `cloneId` / `traceId` / `spanId` / `traceFlags` / `idempotencyKey` / `canonical` を出力する（BR-1/BR-2）。

**事実**: v1 は削除されていない。コメントが「still produced by the live writers」と現役性を逐語宣言している。

## 2. 書き手経路（v1/v2 共存 — 置換禁止）

### v2 経路（実読確認）

`amadeus-worktree.ts:635`:
```
  const result = emitAuditEvent(eventType, fields, pd, intent, space);
```
`amadeus-worktree.ts:95`（`WORKTREE_DISCARDED` の呼出）:
```
    auditTs = emitAudit(pd, "WORKTREE_DISCARDED", {
```
`packages/framework/core/otel/audit-emit.ts:48`: `export function emitAuditEvent(` → `appendAuditEntryViaEvents`（v2）。

移行コミット `771afe2a2`（#1850）は **HEAD 祖先**（`git merge-base --is-ancestor 771afe2a2 HEAD` → exit 0、実測）。

### v1 経路（現役3箇所、実読確認）

| 所在 | verbatim |
|---|---|
| `amadeus-audit.ts:534` | `schemaVersion: JOURNAL_SCHEMA_VERSION,`（lifecycle writer） |
| `amadeus-audit.ts:597` | `schemaVersion: JOURNAL_SCHEMA_VERSION,`（raw body 経路、`event: null`） |
| `amadeus-state.ts:3193` | `schemaVersion: JOURNAL_SCHEMA_VERSION,` |

**実装上の注意 (1)**: **v1 キーを v2 キーへ機械置換する修正は誤り**である。両形が同一 shard 内に混在しうるため、リーダーは正規化して両方を受理しなければならない。

## 3. 患部の全数棚卸し

判別子: 共有ハーネス `tests/harness/audit-records.ts` を import するか、ファイル内で `JSON.parse` + v1 キー（`.event`）を自前で扱うか。

### 適用した述語（Architect 測定、observed 断面）

```
grep -rln "audit" <dir> | xargs grep -ln "JSON.parse" | xargs grep -lE "\.event\b" | xargs grep -L "harness/audit-records"
```

### e2e — 17ファイル（述語出力からの転記、`tests/e2e/` 配下）

1. `t-formal-verif-model-completeness-sensor.test.ts`
2. `t03.test.ts`
3. `t05.test.ts`
4. `t07-audit-fork-merge.test.ts`
5. `t09-halt-and-ask-preservation.test.ts`
6. `t10-halt-and-ask-discard.test.ts`
7. `t11-halt-and-ask-retry-correlation.test.ts`
8. `t113.test.ts`
9. `t60-construction-worktrees-enterprise.test.ts`
10. `t61-construction-worktrees-feature.test.ts`
11. `t62-construction-worktrees-mvp.test.ts`
12. `t63-construction-worktrees-poc.test.ts`
13. `t64-construction-worktrees-workshop.test.ts`
14. `t65-construction-worktrees-fix.test.ts`
15. `t66-construction-worktrees-refactor.test.ts`
16. `t67-construction-worktrees-security-patch.test.ts`
17. `t92-linter-eslint-roundtrip.test.ts`

件数は上記列挙の実ファイル名から機械再計算（`cid:requirements-analysis:ledger-count-mechanical-recalc`）。Developer scan の報告値 17 と**一致**。

v1 形決め打ちパーサの逐語例（実読確認）:

`t10-halt-and-ask-discard.test.ts:126-130`:
```
interface AuditRecord {
  event: string | null;
  heading: string;
  fields?: Record<string, string>;
}
```
消費 `:144`。同型の `interface AuditRecord` が `t05.test.ts:147`（消費 `:260-262`）、`t07-audit-fork-merge.test.ts:249`（消費 `:268` `:298` `:330` `:343` `:366`）。

### 非 e2e — 29ファイル（**Developer scan の報告値 14 と不一致**）

`tests/unit` / `tests/integration` / `tests/smoke` に対する同一述語の出力は **29件**（integration 23 / unit 6）。Developer scan は 14 と報告しており、**述語が異なる**。scan 側の述語は記録されていないため、どちらが正しいかは本記録では確定しない。

**実装上の注意 (2)**: 非 e2e 側の患部件数は**未確定**である。29 は上記述語による候補上限であり、v2 対応済み・除外対象（下記 §6）・`.event` を別文脈で使うファイルを含みうる。修正着手前に述語を確定して再棚卸しすること。なお非 e2e 層は `--ci` に含まれ現在 green であるため、これらは潜在債務であって現存する赤ではない。

（29件の内訳: `tests/integration/` = `t-claude-sdk-live-gate.integration` / `t-otel-core-plumbing` / `t-pi-lifecycle-gate-adapter` / `t-sensor-fire-hardening` / `t106` / `t118` / `t135-invoke-swarm` / `t258-lifecycle-transaction` / `t33-hook-concurrency` / `t356-journal-convert` / `t361-amadeus-mirror-lifecycle-completion.integration` / `t378-hook-canonical-emit` / `t380-locked-canonical-emit` / `t382-sensor-canonical-emit` / `t386-targeted-audit-emit` / `t388-audit-merge-atomic-canonical` / `t402-approve-reconciliation.integration` / `t427-goal-reconciliation-completion.integration` / `t435-intent-autonomy-production.integration` / `t454-subagent-model-attribution.integration` / `t461-subagent-stats.integration` / `t92` / `t96`、`tests/unit/` = `t07-hook-audit-logger.serial` / `t09` / `t10-hook-session-start` / `t160-workspace-record-resolution` / `t19` / `t205-audit-escape-seams`）

### 赤/緑の内訳 — brief の内部矛盾を明示

Developer scan の brief は「e2e 17ファイルは**全て**単独実行で fail 実測」と述べる一方、同じ項で「**唯一 green** の `t-formal-verif-model-completeness-sensor` は in-file 両対応正規化を内蔵」と述べており、**両立しない**。

Architect の実読では `t-formal-verif-model-completeness-sensor.test.ts:227-233` が両対応正規化を実装している:
```
      event: record.event ?? record.attributes?.Event ?? null,
      heading: record.heading ?? "",
      fields: record.fields ?? record.attributes,
```
この正規化があれば v2 行も読めるため、当該ファイルは緑になるはずである。

**整合的な読み**: 自前パーサ 17ファイルのうち **16 が fail、`t-formal-verif` のみ green**。ただしこれは Architect による**再構成であって再実測ではない**（本 RE ではテストを実行していない）。**実装上の注意 (3)**: 修正着手時に 17 の赤/緑を実測で確定すること。

**設計上の含意**: `t-formal-verif` の in-file 正規化は、方式 B（in-file 正規化）が実際に機能することの**実在先例**である。

## 4. vacuity 3件（実読確認 — 偽 green クラス）

| 所在 | verbatim |
|---|---|
| `t09-halt-and-ask-preservation.test.ts:211` | `expect(eventCount(p, "WORKTREE_DISCARDED")).toBe(0);` |
| `t07-audit-fork-merge.test.ts:371` | `expect(countEvent(wtAuditPath(p, "demo"), "AUDIT_MERGED")).toBe(0);` |
| `t07-audit-fork-merge.test.ts:530` | `expect(countEvent(auditPath(p), "AUDIT_FORKED")).toBe(0);` |

いずれも「当該イベント行が 0 件であること」を主張する negative invariant であり、**リーダーが v2 行を読めなければ行が実在しても 0 を返して通過する**。org.md Forbidden の検証劇場クラス（結果を実行から導かない検査）に該当する。

**実装上の注意 (4)**: この3件の修正は**落ちる実証が必須**。v2 形の当該イベント行を注入して赤になることを実測してから完成扱いとする（Mandated: 新設・変更したガードは実際に赤くなることを実証する）。注入は `cid:code-generation:falling-proof-injection-one-set` に従い「注入 → 赤の実測 → 復元 → 残渣ゼロの機械確認」を不可分の1セットで行う。

## 5. canonical 修正様式（実読確認）

`tests/harness/audit-records.ts`:

| 関数 | 行 | 責務 |
|---|---|---|
| `normalizeAuditRecord` | `:26` | `schemaVersion !== 2` は素通し、v2 は `attributes.Event` → `event`、`EVENT_HEADINGS` 経由で `heading` 復元、`attributes` → `fields` |
| `auditRowsFrom` | `:49` | 行分割 → 空行 skip → 全行 parse（不正行は loud fail） |
| `countAuditEvent` | `:57` | 両スキーマ横断の計数 |

ヘッダコメントが規範を逐語宣言: 「a test that hand-parses the JSONL should do the same rather than pin one schema」。

消費実例 59ファイル（`t118.test.ts:219` / `t45-revision-loop.test.ts:161` 等）。

### dist 依存（`:14-18` verbatim）

```
// The heading table is imported from the SHIPPED copy rather than the canonical
// source: this harness is copied into sandboxes that carry dist + docs + tests
// only, and a packages/ import would not resolve there.
import { EVENT_HEADINGS } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
```

**実装上の注意 (5)**: 方式 A（共有ハーネス寄せ）を採ると、e2e 17ファイルが `dist/` 依存を**新規に獲得**する。source-only 境界下で `dist/` は未追跡のローカル生成物であるため、e2e に `bun run build` 前提が持ち込まれる。方式 B（in-file 正規化）ならこの前提は生じないが、正規化ロジックが17箇所へ分散し construction.md の「canonical な1定義から導出する」に反する。**これは裁定事項**。

## 6. 除外（患部でない）

`t378-hook-canonical-emit` / `t380-locked-canonical-emit` / `t382-sensor-canonical-emit` / `t388-audit-merge-atomic-canonical` — v1 不在 assert が**設計意図**であり、本件の患部に当たらない。上記 §3 の非 e2e 29件の述語出力には含まれるため、再棚卸し時に除外すること。

## 7. CI 死角（実読確認）

`tests/lib/run-tests-args.ts:95-100` verbatim:
```
      case "--ci":
        out.runSmoke = true;
        out.runUnit = true;
        out.runIntegration = true;
        levelSelected = true;
        break;
```

`.github/workflows/ci.yml:224-227` verbatim:
```
  # FR-5 (#1589). The e2e tier is NOT part of `test:ci` (run-tests --ci is
  # smoke+unit+integration), so the shipped plugin install journey would
  # otherwise never run on a PR — which is how #1569 reached a release. This job
  # runs that one journey and nothing else: offline, no env gate, no live model,
```

CI 上の e2e は `ci.yml:252` の `bun test tests/e2e/t341-plugin-conformance-journey.serial.test.ts` **1本のみ**。全層 nightly ジョブは不在。

**注記**: Developer scan は当該ファイルを `tests/run-tests-args.ts:95-100` と引用したが、observed 断面に当該パスは**存在しない**（`sed: can't read`）。正しいパスは **`tests/lib/run-tests-args.ts`**（行番号 95-100 は一致）。`cid:requirements-analysis:mechanism-cite-verify-at-draft` に従い訂正した。

**実装上の注意 (6)**: 修正が e2e 17ファイルを緑に戻しても、**CI はその緑を検証しない**。同じ死角が #1569 と #2328 の2度発火している。手当て（e2e の CI 組み入れ、nightly 全層ジョブ、または対象テストの層移動）を本 intent に含めるか別 Issue とするかは**裁定事項**。

## 8. tNNN 予約

使用済み最大 **`t483`**、本 intent の新規テストは **`t484`** から採番する。

## 9. requirements へ送る裁定候補

| # | 論点 | 選択肢 |
|---|---|---|
| 1 | 修正方式 | A: 共有ハーネス寄せ（canonical 1定義、59ファイルと同一様式、規範コメントに合致 / dist 依存が e2e へ波及） vs B: in-file 正規化（dist 依存なし、`t-formal-verif:227-233` に実在先例 / 17箇所へ分散、canonical 1定義原則に反する） |
| 2 | dist ビルド前提の扱い | 方式 A を採る場合、e2e への `bun run build` 前提の持ち込みを許容するか |
| 3 | CI 死角の手当て | 本 intent に含めるか別 Issue か（同機序3度目） |
| 4 | 表題再定義 | Issue #2328 の表題「tests/e2e audit …」が非 e2e 側の潜在債務（§3 で件数未確定）を含むか、e2e 17ファイルに限定するか |
| 5 | 非 e2e スコープ | §3 の件数不一致（scan 14 vs Architect 述語 29）を解消し、非 e2e を本 intent のスコープに含めるか |
