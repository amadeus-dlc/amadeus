# Code Generation Plan — fix-1856-1857-otel(Bolt 3)

上流入力(consumes 全数): requirements.md

- 本 unit の実装対象は `requirements.md` の FR-5(#1856 fatal-latch の emit 経路配線、裁定: fail-closed)と FR-6(#1857 session-end の seam 迂回置換)。共通契約 CR-1〜CR-6 と AC-5a〜5c / AC-6a〜6b を検収基準とする。functional-design 系 consumes は degrade スコープにより不在。

## 逸脱と裁定の系譜(implementation-deviation-election 準拠 — 2回とも実装前停止 → ユーザー裁定)

1. **第1逸脱(t125 pin 衝突)**: 裁定「emit 停止」を字義どおり drop すると pin 済み不変条件 audit-first atomicity(t125)が破れる(state 変更が監査行なしに exit 0 で完了)。builder は実装前停止 → **ユーザー裁定 B(2026-08-01)**: drop 維持+変更系エントリポイントへ mutation ガード配線。
2. **第2逸脱(probe 偽 latch)**: 裁定 B 実装後、t49 の赤から probe(`checkShardConsistency`)の厳密単調増加要求が並行 Bolt の正常な merge(verbatim append による合法的 seq 巻き戻し)へ偽 latch を張る製品欠陥を実測確定。builder は再停止 → **ユーザー裁定(2026-08-01)**: same-root として同一 PR で probe の整合規則も修正。

## 方針

1. **FR-5 drop 面**: `logger-provider.ts` の `emitEvent` に latch ガード(telemetry 分岐の後、fail-open な FR-EVT-6 は無改変)。通知は module-level ラッチで1プロセス1回(呼び出し点1箇所を grep 実測 — guard-announcement-callsite-count)。reason union へ `"fatal-latch"` を追加し #1248 seal と同型の意図的 suppression アームへマップ。
2. **裁定 B mutation ガード**: `amadeus-state.ts` の `emitAudit` **1 seam**へ配線(全変更系 verb 19 呼び出しが経由 — verb 個別配線より漏れが構造的に起きない)。事前 `assertMutationAllowed()`+emit 戻り値 `fatal-latch` の refuse の2段(プロセス最初の emit は probe が emit 内部で latch を張るため事前 assert では守れない — 実測)。hooks には意図的に配線しない(観測 emit は drop、セッションを殺さない)。
3. **probe merge 対応(same-root)**: parse 失敗 latch は維持 / `AUDIT_FORKED`・`AUDIT_MERGED` 観測までは seq 単調増加要求(無関係 shard の巻き戻しは従来どおり latch)/ merge 済み shard は idempotencyKey の一意性検査へ切替(二重マージ検出)。cloneId 単位単調性は不成立(audit-fork の複写で delta 行が main と同一 cloneId を持つ — t49 実測 21 行)ため不採用。
4. **FR-6**: session-end の2行を `ensureTracerBootstrap(projectDir)` へ置換、未使用 import 除去、無音 catch 無改変(AC-6b)。
5. **TDD**: t395 新設(latch emit fail-closed 8 tests)、t396 新設(session-end tracer seam、負の対照付き)。t125 契約無改訂で 9/9 復旧、t49 green 復旧、t90 は fixture 連番化(pin 趣旨維持・理由コメント付き改訂)。

## テスト計画

- t395: AC-5a(発火後 emit 不書込)/ AC-5c(通知1回)/ AC-5b(未発火時不変)。
- t396: 事前 tracer 登録済みでも session-end 経路が throw しない+負の対照。
- t125/t17/t247: mutation ガードで green 復旧(契約無改訂)。
- probe: 正常 merge 後 shard で latch 非発火+真に壊れた台帳(parse 不能・非 merge 巻き戻し・二重マージ)で latch 維持の両側実証。

## リスクと対処

- 複雑度 NEW_VIOLATION は baseline 追加でなく `canonicalRecord()` 抽出で解消。
- committed shard 全数走査(179/179 整合)で probe 規則変更の遡及影響なしを実測。
- dist 7面+self-install 再生成(hooks/otel/tools 面)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T04:36:46Z
- **Iteration:** 1
- **Scope decision:** none

裁定 B の2段 refuse(emitAudit seam)・hooks 非配線・probe merge-aware 規則の両側実証・t125 契約無改訂 9/9・t90 宣言改訂・FR-6 置換と負の対照を diff 実読で確認。指摘 0 件。

### Findings

- None
