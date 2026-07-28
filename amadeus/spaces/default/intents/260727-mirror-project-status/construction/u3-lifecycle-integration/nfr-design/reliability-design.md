# Reliability Design — u3-lifecycle-integration

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

reliability-requirements の completion 安全性と恒久停止回避を、gate 前置と層分離の構造で実現する。circuit breaker・バックオフ・フェイルオーバーは非適用(cid:nfr-design:c1 — boundary 駆動の委譲で代替)。

## completion ゲートの安全設計

- **順序の固定**: final sync → `completionProjectGate` 評価 → ready のみ close(business-logic-model 手順1〜3 — reliability-requirements の FR-8a=受入条件7)。pending / safety-blocked / Done 未適用が残る間は close しない(FR-8b=受入条件10 後段)。
- **検証**: Done 未達1件で close mutation 0 回の negative assert+全 Done 後の close 実行の対照ペア(reliability-requirements)。検査面は performance-requirements が規定する counter assert と同一の既存検証シーム。

## 恒久停止の構造回避(層分離)

- `safety-blocked` は Project 台帳のみ、operation receipt は `pending`(IN_PROGRESS 分類)留置(business-logic-model の層分離 — reliability-requirements の実装直読 amadeus-mirror-policy.ts:61-65 / :218-219)。close 保留は失敗ではなく、次の boundary / manual sync の reconcile(U2)へ委ねる — workflow は停止しない。
- gh 不在・未認証・API 障害は loud fail+継続(reliability-requirements の FR-7e 面)。

## parked の不変性設計

- parked boundary / registryStatus=parked の二重判定で Status mutation 0(business-logic-model の表 — reliability-requirements)。判定は期待導出の keep 分岐に一本化(canonical 共有 — tech-stack-decisions の複製禁止決定)し、boundary 側と manual 側で別の判定式を持たない。
- `Done` 遷移は final sync のみ(reliability-requirements)— フェーズ同期の経路に Done を書く分岐が存在しない構造。

## 検証面の統合

- boundary 表の全行を integration テストで固定(business-logic-model の検証面)。parked 2経路の mutation 0、close 阻止/実行の対照、ask 文言 golden(security-requirements の同意境界)を同一スイートに収める。

## 非目標

- SLA/SLO・バックアップ: N/A(reliability-requirements の N/A 規律)。gate 評価の可用性設計は不要 — オフライン決定のため外部障害の影響を受けない(scalability-requirements の線形評価と同一の構造的性質)。
