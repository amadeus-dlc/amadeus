# Code Generation Plan — fix-1838-1860-mirror-cluster(Bolt 1)

上流入力(consumes 全数): requirements.md

- 本 unit の実装対象は `requirements.md` の FR-1(#1838 mirror 境界の applicable-operations 非対称と create 無条件先行)と FR-2(#1860 close receipt prepared 滞留、2欠陥同梱)。共通契約 CR-1〜CR-6 と AC-1a〜1c / AC-2a〜2c を検収基準とする。functional-design 系 consumes は degrade スコープにより設計どおり不在 — 設計判断は本 plan と PR 本文に記録する。

## 方針

1. **FR-1 修正4面をガード先行の順序で適用**(クロスレビュー確定の順序制約): (i) 事前ガード(issueNumber 既存時の create 抑止)→ (ii) coordinator の operationForBoundary(link 状態で create/sync を選択)→ (iii) policy の applicable-operations 対称化(`intent-capture-approved` へ sync 追加)→ (iv) reducer の対称化(別 Issue への complete 再リンク拒否・provenance 上書き禁止)。
2. **FR-2 主患部**: executor の close 短絡へ prepared 前進を導入。第2欠陥(mark-pending 死経路)は**reducer 拡張**方式を採用 — `mark-pending` が `prepared` を受理し `attemptedAt` を now で打刻(要件が実装者裁量とした2方式のうち、回復記録の発火可能性を呼び出し元へ複製しない側。codec の fail-closed 不変条件〔pending は attemptedAt 必須〕を保つ)。あわせて executor:527 の `applyTransition` 戻り値破棄を是正し、記録不能を「記録済み」として返さない。
3. **TDD**: 各 AC につき失敗テスト先行。FR-1 の層跨ぎ対称性は t391 新設(境界6種 × link 状態の機械照合、state-machine-cardinality-check 準拠)。FR-2 は t279 / t275 の拡張(t392 は返上)。
4. **同根棚卸し**: mirror 4ファイル横断で create/sync/close の非対称を grep 全数棚卸しし、スコープ外の発見は報告のみ(修正はしない — bughunt-file-only 準拠で Issue 化判断は conductor へ)。

## テスト計画

- t391(新設): 全境界種別 × applicable-operations × link 状態の総当たり機械照合。
- t279(拡張): 既 link 時の create 非再発行 / prepared からの complete 収束 / state 書込失敗の warning 実在 / 未永続 warning の正直な報告。
- t280(拡張): 境界層の sync 収束。
- t275(拡張): 別 Issue への complete 再リンク invalid / provenance 保存 / mark-pending from prepared。

## リスクと対処

- 「操作開始時点で remote 既 CLOSED × prepared receipt」fixture は t279 に不在の組み合わせ — 新規 fixture で固定(AC-2a)。
- AC-2c(本 intent 自身の pending receipt の retry 収束)は conductor が build-and-test 段で実環境実測する(builder スコープ外)。
- dist 再生成(7面+self-install)を同一コミット群に含める。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T03:47:24Z
- **Iteration:** 1
- **Scope decision:** none

FR-1 4面のガード先行順・FR-2 の reducer 拡張選定と codec 不変条件維持・executor:527 是正を diff 全読で確認。t391 は実在の個数照合。留保転記の尊重(初回窓非着手)確認。CI 完了待ちは非ブロッキング注記。

### Findings

- None
