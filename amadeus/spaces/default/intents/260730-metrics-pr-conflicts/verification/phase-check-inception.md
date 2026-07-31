# Inception フェーズ境界検証

## 検証概要

- **境界:** Inception → Construction
- **Scope:** `amadeus-bugfix`
- **実行対象:** Reverse Engineering、Requirements Analysis
- **スキップ対象:** Practices Discovery、User Stories、Refined Mockups、Application Design、Units Generation、Delivery Planning
- **検証時刻:** 2026-07-30T13:15:04Z
- **判定:** PASS（スコープ固有の注記あり）

本 scope は brownfield の局所バグ修正であり、独立した User Stories、Application Design、Units、Delivery Plan を生成しない。したがって、Reverse Engineering の既存構造分析を設計基準、Requirements Analysis の要件と受入条件を Construction への直接入力として検証する。

## 入力成果物

| 種別 | 成果物 | 状態 |
| --- | --- | --- |
| Brownfield intent | `amadeus-state.md` の Project／Scope | 確認済み |
| 既存構造 | `codekb/amadeus/business-overview.md` | 確認済み |
| 既存設計 | `codekb/amadeus/architecture.md` | 確認済み |
| 変更境界 | `codekb/amadeus/code-structure.md` | 確認済み |
| 要件 | `inception/requirements-analysis/requirements.md` | 7 FR、3 NFR |
| 人間回答 | `inception/requirements-analysis/requirements-analysis-questions.md` | Q1〜Q4 回答・統合承認済み |

## トレーサビリティ検証

| チェーン | カバレッジ | 検証結果 |
| --- | --- | --- |
| Intent → 要件 | 10/10 | 全 FR／NFR が snapshot PR の競合・滞留解消、責務分離、冪等化、観測可能性へ遡る |
| 要件 → 既存設計 | 10/10 | Per-commit Snapshot Publisher／Single Maintenance Publisher、完全 SHA、keep-last-360、PR 状態照合へ対応 |
| 要件 → 変更境界 | 10/10 | `.github/workflows/ci.yml`、`scripts/metrics-*.ts`、t221／t222／t231／t298 系へ対応 |
| 要件 → 受入条件 | 10/10 | 全要件に合否条件または測定可能な閾値あり |
| 要件 → テスト方針 | 10/10 | unit／hermetic integration／workflow wiring の検証先を定義 |
| Stories／Units／Delivery Plan | N/A | `amadeus-bugfix` scope により明示スキップ。孤立成果物なし |

## 整合性検証

- Snapshot PR の変更集合は JSON 1件だけであり、index／retention を所有しない。
- Maintenance は index／retention の単一所有者で、固定 concurrency、cutoff、lease により並行更新を収束させる。
- Q1 と Q4 の統合により、conflicting／closed を観測した run は自動回復後も非0で終了する。
- `landed + OPEN`、複数 OPEN、`no-diff + stale maintenance PR` は、全候補を列挙・所有権確認・処置・再照合してから終了する。
- 通常 merge、既着地、回復後 merge の全経路で maintenance dispatch の受付を必須とする。
- 完全 SHA の正準値は schema 検証済み JSON の `commit` フィールドに一本化されている。
- `push.paths-ignore: metrics/**` と `ci-success` 非依存を維持し、metrics-only merge の再帰起動を防ぐ。

## レビューと残存注記

Product Lead の Review Iteration 2 は `NOT-READY` で終了した。レビュー上限到達後、ユーザーが Request Changes を選択し、次を追加確認・反映した。

1. Q4 で、競合回復後も当該 run を非0とする方針を承認。
2. 複合状態の評価順序、全所有済み対象の処置、終了直前の全候補再照合を追加。
3. merged／既着地／回復後 merged のすべてへ maintenance dispatch 受付条件を追加。

第3レビューは reviewer 上限により実施していない。この注記は reviewer verdict を READY に読み替えない。上記3指摘については、修正版本文への存在確認、質問証跡、required-sections／upstream-coverage／answer-evidence の PASS を代替証拠とした。

## Construction への引き渡し

- Code Generation は requirements.md の FR-01〜FR-07、NFR-01〜NFR-03 を直接実装・試験へ追跡する。
- 実装方式は repo-local helper を優先候補とし、workflow shell の肥大化を避ける。ただし新規抽象化は要件を満たす最小範囲に限定する。
- 実 GitHub repository を変更する live E2E は行わず、fake `gh` と短縮可能な polling seam で状態遷移を決定的に検証する。

## 人間承認

- [x] Requirements Analysis の approval gate に対する承認回答 `1` を受領（phase-check 生成: 2026-07-30T13:15:04Z）
