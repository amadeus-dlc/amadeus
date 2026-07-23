# Performance Design — U4-engine-boundary

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## PD-U4-1: phase境界限定の評価(PR-U4-1)

追加分岐は`PHASE_CHECK_REQUIRED_PHASES`を通過したphase境界だけで評価し、通常の`next`経路には条件判定以外のI/Oを追加しない。境界ではU3の設定JSON最大3 readと、既にロード済みstate文字列への`getField` 1回だけを行う。

## PD-U4-2: 既存状態からの冪等判定(PR-U4-2)

発火済み判定は既存stateの`Mirror Boundary Receipts`とcheckbox/gate情報から導出し、新しいディレクトリ走査、audit全走査、ネットワークI/Oを行わない。後続`next`共通入口では同フィールドのpending有無だけを1回読む。

## 検証

非境界の`next`テストで設定reader呼出し0回、各境界の初回で最大3回、同境界の再実行で追加directive 0件を検証する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:13:30Z
- **Iteration:** 1
- **Scope decision:** none

auto-sync失敗後の再試行経路、重複副作用安全性、Receipt永続スキーマが不足する。

### Findings

- MAJOR NFR-U4-I1-001: workflow継続後もpending境界を共通next入口で再評価する。
- MAJOR NFR-U4-I1-002: sync冪等契約またはpending/completed状態機械と障害注入テストを追加する。
- MINOR NFR-U4-I1-003: Receiptの最小スキーマ、保存位置、原子更新、破損時fail-safeを定義する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:15:36Z
- **Iteration:** 2
- **Scope decision:** none

再試行経路・冪等sync・Receipt形式は解消。ask pendingとsync再発行の混同、複数pending処理順が未定義。

### Findings

- RESOLVED NFR-U4-I1-001/I1-002/I1-003。
- MAJOR NFR-U4-I2-001: pendingをauto-sync専用としaskは回答処理後completedへ直接記録する。
- MAJOR NFR-U4-I2-002: 複数pendingをcanonical順で1件ずつ処理し対応Receiptだけをcompletedへする。
