# Business Logic Model — unit s13-zero

## 現状(reality-check)

- `handleSurface`(`packages/framework/core/tools/amadeus-learnings.ts:203-267`)は memory.md をパースし `SurfaceOutput`(:114-121: `schema_version` / `stage_slug` / `phase` / `memory_entries_total` / `candidates[]` / `parked_open_questions[]`)を stdout へ JSON 出力する。digest フィールドは存在しない。
- 「0 件」の確定は現状 stage-protocol.md §13 手順3(:1220「most runs surface nothing worth keeping; that's the most common outcome」)の記述どおり、conductor(LLM)が JSON を読んで自己申告する構造 — 機械的な束縛は一切ない。ADR-6 が「AI の自己申告で儀式が消える構造」と呼ぶ欠陥はこの断面。
- ソロ自動選挙フック(stage-protocol.md :1224-1236)は `solo-election.trigger.mode` が `auto` のとき、0 件候補提案も含めて選挙にかける — この経路は無改変(Q3)。

## 処理フロー

```
handleSurface(args, projectDir)                     # 既存・無改変の候補抽出
  └─ SurfaceOutput { ..., candidates, parked_open_questions }
        └─ [新規] surfaceDigest = digest(candidates, parked_open_questions)
              を SurfaceOutput へ追加して stdout へ出力

confirmZeroCandidates(surfaceOutput: SurfaceOutput): Result<ZeroReceipt, NotZero>
  ├─ candidates.length !== 0        → NotZero(0 件ではない — 通常の選定裁定へ)
  ├─ candidates.length === 0        → ZeroReceipt { surfaceDigest, confirmedAt }
  └─ ZeroReceipt が発行された回のみ、選定裁定(構造化質問・ソロ自動選挙)を発火しない

addConductorCandidate(candidate, diskEvidencePath): Result<AugmentedCandidateSet, EvidenceRefusal>
  ├─ diskEvidencePath が存在しない            → EvidenceRefusal("evidence-path-missing")
  ├─ 内容が candidate の主張と対応しない       → EvidenceRefusal("evidence-mismatch")
  └─ 検証通過                                  → 既存 candidates[] へ追記(削除・置換は不可)
        └─ 追加後 candidates.length > 0 のため confirmZeroCandidates は
           NotZero を返す(0 件確定は成立しない — 通常の選定裁定へ合流)
```

- `addConductorCandidate` は `confirmZeroCandidates` の**前段**に置く運用(conductor が §13 の会話全体から追加候補があると判断したら先に追加し、残りを surface 由来の候補と合わせて 0 件判定にかける)。追加後に候補が1件でもあれば「0 件」は成立せず、通常の選定裁定フローへ合流する(Q3)。

## 統合面

- 依存なし(unit-of-work-dependency.md: U9 blockedBy = 空、直列化制約も空)。`amadeus-learnings.ts` を単独で改修できる。
- 出力の消費者: stage-protocol.md §13 手順(orchestrator = conductor 自身)。本 RFC の他 unit(U1〜U8, U10〜U13)からは参照されない。

## エラーパス(fail-closed semantics)

- `surfaceDigest` の算出元(candidates + parked_open_questions)が変化した後に古い digest で `confirmZeroCandidates` を呼んでも、digest 不一致で `ZeroReceipt` は発行されない(NotZero または明示エラー)。
- `addConductorCandidate` の disk 証跡が読み取り不能・存在しない場合は拒否(fail-closed) — 「証跡なし」を「0 件でよい」の追加候補として通してしまうと ADR-6 の趣旨(自己申告排除)に反する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:28:56Z
- **Iteration:** 1
- **Scope decision:** none

s13-zero は ADR-6 の digest 束縛・addConductorCandidate の増加限定・fail-closed 拒否を型で表現し、amadeus-learnings.ts の引用も実測一致。

### Findings

- FOLLOW-UP | domain-entities.md | 監査記録(0件確定・追加候補集合)のペイロード型が不在 — 実装時の見落としリスク(code-generation で型を明示)
