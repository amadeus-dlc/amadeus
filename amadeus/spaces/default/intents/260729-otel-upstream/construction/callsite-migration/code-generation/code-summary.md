# Code Summary — U7: callsite-migration

上流入力: unit の functional-design（business-logic-model.md / business-rules.md / domain-entities.md）、nfr-requirements（performance / security / scalability / reliability / tech-stack-decisions）、nfr-design（logical-components / performance / reliability / scalability / security）を全数参照。上流の components.md / component-methods.md / services.md / unit-of-work.md も参照。

裁定: E-U7CG-Q1（guard 配置）、E-U7CG-Q2（deliverable 境界）、E-U7CG-Q3A（per-call intent/space）、E-U7CG-Q3B（post-complete 抑止、ユーザー裁定案 A'）。

## Files created

- `packages/framework/core/otel/migration-adapter.ts` — 互換 Adapter（FR-MIG-1）
- `tests/callsite-guard.ts` — call-site guard（VER-4）
- `tests/.callsite-allowlist.json` — guard の allowlist 台帳（shrink-only、t258 allowlist とは別台帳）
- `tests/unit/t367-callsite-guard.test.ts` — guard の純粋コア
- `tests/integration/t367-callsite-guard-cli.test.ts` — guard の CLI verdict（in-process 駆動）
- `tests/integration/t367-migration-adapter.test.ts` — Adapter 契約 + Q3B 伝播
- `tests/integration/t367-shadow-comparison-production.test.ts` — shadow 比較の次元別契約と harness 障害 verdict

## Files modified

- `packages/framework/core/otel/shadow-compare.ts` — U1 原型を本番化（BR-10 の4次元 + unexplainedDiffs、harness 障害の顕在化）
- `packages/framework/core/tools/amadeus-audit.ts` — `appendJournalRecordV2` が `JournalAppendOutcome` を返す（Q3B、cross-unit / U3 所有）
- `packages/framework/core/otel/audit-log-exporter.ts` — `exportCanonicalEvent` が outcome を伝播（Q3B、cross-unit / U4 所有）
- `packages/framework/core/otel/logger-provider.ts` — `emitEvent` が `EmitOutcome` を返す（Q3B、cross-unit / U1・U4 所有）
- `tests/integration/t-otel-shadow-compare.test.ts` — U1 テストを本番 API へ追従
- `.github/workflows/ci.yml` — lint ジョブへ guard 1ステップ
- dist 7 面 + self-install 5 面（FR-DST-2、`bun scripts/package.ts` / `promote-self.ts --apply` で再生成）

## Key implementation decisions

- **allowlist のキーは (file, symbol) 件数**、file:line の pin ではない。行 pin は無関係な編集で行がずれた瞬間に stale 化し以後の全 PR を「動いた pin」で落とす（`cid:code-generation:allowlist-line-pin-stale`）。件数キーは BR-12 の単調減少性をその失敗様式なしに保つ。
- **guard の走査範囲は正本のみ**（`packages/framework/core/` + `scripts/`）。dist・self-install は core の投影なので core を移行すれば構造的に追従し、`tests/` は旧 writer と同時に U8 で削除される。
- **`ComparisonVerdict` を素な判別ユニオンに**した。実施されなかった比較から `equivalent` を読むことが型レベルで不可能で、実際に既存テスト2箇所を typecheck が弾いた（機構の実証）。
- **Q3B は `void` を返り値ユニオンに残す**最小差分とした。void を返す seam は「着地した書込み」と読む（失敗する test double は throw する）ため、既存13箇所の注入 seam が無改変で型互換のまま通る。両 tsconfig の typecheck exit 0 で確認済み。

## Deviations from the plan

1. **guard 配置の申告付き読み替え（E-U7CG-Q1 裁定どおり）** — `nfr-design/logical-components.md` の「Adapter・guard は core/ 変更のため FR-DST-2 を適用」は Adapter に妥当・guard には過大一般化として読み替え、guard を `tests/` に置いた。裁定の留保に従い、当該設計文にも申告付き追記を残した（record 内の矛盾文を無修正で放置しない）。根拠は同追記に実測付きで記載。

2. **Adapter の関数名を `appendAuditEntryViaEvents` にした（申告）** — `component-methods.md` は Adapter を literal に `appendAuditEntry` と描いているが、旧名を再利用すると **VER-4 guard が移行済み site と未移行 site を区別できなくなり**、guard が測るはずのカウントダウンが成立しない。BR-2 が要求するのは signature（引数・戻り値の形）であり、それは維持している（call-site 書換えは1行スワップ）。

3. **第1弾の実書換え batch を実施できず停止（E-U7CG-Q2 の必須項目が未達）** — 裁定は「core/ 内の第1弾実書換え+ratchet 両側実証」を必須としたが、**その前提（機械的増分で移行可能）が2つの独立した機構で成立しない**ことを実測で確認した。詳細と再エスカレーション事項は下記。

## 実測: 第1弾 batch が機械的増分にならない2つの機構

**機構1 — Provider bootstrap の不在。** `registerLoggerProvider` を production で呼ぶのは `packages/framework/core/tools/amadeus-log.ts:78`（U1 の代表配線）と `scripts/otel-phase1-measure.ts:65` のみ。他の tool・hook（`amadeus-state.ts`、`amadeus-sensor.ts`、`amadeus-utility.ts`、`amadeus-jump.ts`、hooks 5件など）は一切 bootstrap しないため、その call site を canonical 経路へ差し替えると `emitEvent` が `"emit before registerLoggerProvider — invariant violation"`（`otel/logger-provider.ts:36`）で throw する。移行には entrypoint ごとの bootstrap 追加が必要で、これは1行スワップではない。

**機構2 — registry の requiredAttributes が実 call site の fields と乖離。** `emitEvent` は `def.requiredAttributes` の充足を強制する（`logger-provider.ts`）が、v1 writer は強制していなかった。`amadeus-jump.ts` の7 eventType を突き合わせた実測:

| eventType | jump が渡す fields | registry の requiredAttributes | 判定 |
|---|---|---|---|
| PHASE_COMPLETED | From phase, To phase, Stages completed, Details | From phase, To phase, Stages completed | OK |
| PHASE_VERIFIED | Phase boundary, Details | Phase boundary, **Pass/fail**, **Issues** | **2件不足 → throw** |
| PHASE_SKIPPED | Phase, Reason | Phase, **Scope**, Reason | **1件不足 → throw** |
| PHASE_STARTED | Phase, Scope | Phase, **Stage count**, Scope | **1件不足 → throw** |
| STAGE_SKIPPED | Stage, Reason | Stage, Reason | OK |
| STAGE_JUMPED | Direction, Source, Target, Scope, Details | Direction, Source, Target, Scope | OK |
| STAGE_STARTED | Stage, Agent | Stage, Agent | OK |

7 種のうち **3 種が throw する**。`amadeus-jump.ts` は emit を try/catch して `error("Audit emission failed")` で終了するため、そのまま移行すれば jump の3経路が硬エラーになる。不足属性の値（Pass/fail、Issues、Stage count）を builder が発明することは audit 意味論の独断決定に当たるため実施しない。

これまで canonical 経路を通った event は `amadeus-log.ts` が emit する少数（DECISION_RECORDED、QUESTION_ANSWERED 等）に限られ、残り約75 event の requiredAttributes は**実 call site と一度も突き合わされていない**。この乖離は jump 固有ではなく体系的な可能性が高い。

**唯一 bootstrap 済みの候補 `scripts/otel-phase1-measure.ts`（2 site）も移行不可**: 当該2 site は Phase 1 計測ハーネスが旧経路を新経路と比較するための「current 側」であり（:62, :76）、移行すると比較対象が消えて計測自体が無意味になる。設計上の恒久例外として allowlist 残置が正しい。

したがって本 Bolt で安全に移行できる call site は**ゼロ**。ratchet の「追加赤」側は実証済み（下記）だが、「実縮小 green」は実移行が存在しないため未実証。

## Test coverage summary

- TDD slice 4件（shadow 本番化 / guard 純粋コア / guard CLI seam / Adapter+Q3B）。各 slice で Red を実測してから最小実装で Green。
- 新設テスト: t367 系4ファイル 33 tests。otel 系 + audit・journal 隣接の全 18 ファイル **170 pass / 0 fail**。
- guard の落ちる実証（不可分1セット）: `otel/shadow-compare.ts` に `appendAuditEntry` 呼出しを1件注入 → `--check` exit 1 で `packages/framework/core/otel/shadow-compare.ts: appendAuditEntry — allowlist 0, measured 1` を名指し → revert で exit 0・ファイル byte 一致（`diff -q` 確認）。
- corpus 側の実証: 既存 66 site すべてに対して gate は exit 0（正当な既存データを誤拒否しない）。
- allowlist 過大計上時に green（縮小方向が通ること）は `t367-callsite-guard-cli.test.ts` で実証。

## 残存 call site の実測値（Task #2 への入力）

走査範囲（正本 `packages/framework/core/` + `scripts/`）の実測 = **66 site / 24 file**:

| symbol | site 数 | file 数 |
|---|---|---|
| appendAuditEntry | 26 | 16 |
| appendAuditEntryUnlocked | 18 | 10 |
| observeSubprocess | 22 | 10 |
| observe | 0 | 0 |

`observe` の 0 件は raw grep と突き合わせ済み（唯一のテキスト一致 `hooks/amadeus-stop.ts:4` はコメント行で正しく除外）。

**走査範囲外の残存**: `tests/` 配下は本 guard の走査対象外（旧 writer と同時に U8 で削除される前提）。Task #2 の batch 編成時に `SCAN_ROOTS` を広げるか別集計にするかの判断が必要。

**後続裁定へ送る残置 site（Q3A / Q3B 裁定どおり allowlist 残置、guard から機械可視）**:

- per-call intent/space ターゲティング依存（Q3A）: `amadeus-state.ts`（DELEGATED_APPROVAL / DELEGATED_REJECTION 系）、`amadeus-worktree.ts:88`、`amadeus-bolt.ts`、`amadeus-jump.ts` 等
- post-complete `appended:false` を消費（Q3B）: `amadeus-grant-authorization.ts:787`、`amadeus-presence-reservation.ts:332`、`amadeus-mirror-state-store.ts:407` — 戻り値伝播だけでは移行不能（lock 保持中の入れ子呼出し + 明示 intent 指定）
- `appendAuditEntryUnlocked` 全 18 site: canonical 経路（`appendJournalRecordV2` → `acquireAuditLock`、`amadeus-audit.ts:406`）は自ら lock を取り、この lock は mkdir ベースで**再入不可**（`amadeus-lib.ts:5818-5843` に再入追跡なし）。lock 保持前提の呼出し側を差し替えると retry budget（50×100ms）を空回りして失敗する
- 設計上の恒久例外: `scripts/otel-phase1-measure.ts` の 2 site（新旧比較の current 側）

**追加で後続裁定が必要な事項（本 Bolt で新規発見）**: (a) entrypoint ごとの Provider bootstrap 方針（二重 `registerLoggerProvider` は NFR-3 により throw するため、hook / tool の合成経路を含めた設計判断が必要） (b) registry の requiredAttributes と実 call site fields の全 event 突き合わせ（体系的乖離の可能性。不足属性の値決定は audit 意味論の判断）。
