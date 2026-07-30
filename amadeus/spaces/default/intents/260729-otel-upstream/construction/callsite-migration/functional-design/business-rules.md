# Business Rules — U7: callsite-migration

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 不変条件

- BR-1: 互換 Adapter は移行期間限定の存在であり、恒久 dual-write／dual-read を行わない（FR-MIG-1）。Adapter 内部で旧 writer 実装を呼ぶ経路は持たない
- BR-2: Adapter は旧 `appendAuditEntry()` のシグネチャを維持し、内部で registry 引き当て → `emitEvent` へ委譲するのみとする（FR-MIG-1、`component-methods.md` migration-adapter.ts どおり）
- BR-3: registry 未登録の eventType は drift guard 違反として例外とする（VER-1）。未知 eventType の silent fallback・既定 event への丸めは禁止
- BR-4: Adapter 経由の emit は直接経路と同一の失敗契約を持つ。書き込み失敗の同期例外と fatal latch set を Adapter が握りつぶさない（FR-MIG-1 が FR-EVT-3/4 に整合）
- BR-5: 移行は batch 単位の段階実施とし、各 batch は変換前 backup を必須とする。rollback 手段は git revert＋backup 復元に限定する（FR-MIG-2）
- BR-6: 移行期間中の canonical 書き込み経路は常に単一（Event API → AuditLogExporter）。新旧混在は「未変換 site の Adapter 経由」としてのみ存在する（FR-MIG-1/2）

> **申告付き読み替え: BR-2 の「シグネチャを維持」（執行裁定 2026-07-30、conductor 承認）**
>
> BR-2 と `component-methods.md` は Adapter を literal に `appendAuditEntry(...)` と描いているが、実装では **関数名を `appendAuditEntryViaEvents` とし、引数形状・戻り値形状（`AppendAuditResult`）のみを維持**した。BR-2 の「シグネチャを維持」は**引数形状の互換**と読み替える。
>
> 根拠は既決契約からの一意導出: 本 Unit が VER-4 で実装した call-site guard は (file, symbol) 件数キーで残存を可視化するため、Adapter を legacy と同名にすると **移行済み site と未移行 site が構造的に区別不能**になり、VER-4 の残存可視化（既決）が空文化する。引数形状が同一である限り call-site 書換えは1行スワップのままで、FR-MIG-2 の段階移行の機械性は損なわれない。
>
> 実装: `packages/framework/core/otel/migration-adapter.ts`。同じ申告は `code-generation/code-summary.md` § Deviations にも記録している（record 内の矛盾文を無修正で放置しない — E-U7CG-Q1 裁定の留保と同じ扱い）。

## 条件付き振る舞い

- BR-7: allowlist 外で `appendAuditEntry` 直接呼出しまたは旧 `observe()`／`observeSubprocess()` 利用を検出した場合、CI はこれを拒否する（VER-4）
- BR-8: guard の allowlist は縮小のみ許可する ratchet とする。site 追加を含む差分は CI 拒否（VER-4）
- BR-9: 残存 call site は可視化 report として常時出力する。残存ゼロは削除ゲート FR-MIG-4(c) の条件として U8 が機械判定する（VER-4）
- BR-10: shadow 比較は event count・linkage・status・許可属性の同等性を機械可読 report に出力し、未説明差分がある限り削除ゲート FR-MIG-4(d) の入力は未充足とする（FR-MIG-2、VER-5 連携）
- BR-11: audit CLI append verbs は互換 Adapter 経由で一時維持する（FR-MIG-3 の adapter 維持側。公開互換方針の確定は Phase 4 ADR に委ね、本 Unit では判断しない）
- BR-12: batch 書換え後に残存 site 数が減少しない変更は移行 commit として認めない（FR-MIG-2 の段階性を機械的に担保）
