# Scalability Design — u3-lifecycle-integration

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

scalability-requirements の固定 boundary 集合と線形 gate 評価を、構造の不変性で実現する。水平スケーリング・キュー・スケジューラは非適用(scalability-requirements — cid:nfr-design:c1)。

## 規模の構造

- **boundary 集合は固定**: 既存5種のみ(business-logic-model の表 — scalability-requirements の新設禁止)。規模の変数は同期対象 Project 数 N だけで、boundary 数は成長しない。
- **gate 評価は台帳線形**: `completionProjectGate` は台帳 entry の線形走査(scalability-requirements — 台帳は U2 の規模論で有界)。N が増えても close 条件の意味論(全同期対象 Done — reliability-requirements)は不変で、コストのみ線形増。

## 再評価の駆動

- close 保留の再評価は次の boundary / manual sync 駆動(scalability-requirements)— 再評価キュー・スケジューラを設計しない(tech-stack-decisions の却下案どおり)。保留の永続表現は U2 の台帳がそのまま担い、U3 は判定の執行のみ(責務分離により U3 側に規模を持つ状態が存在しない)。
- 呼び出し予算(performance-requirements)は boundary 配線の再利用構造で維持され、N 増加時も per-Project 上限を超えない。

## 出力面の規模

- ask 文言の Project 面要約(security-requirements の同意境界)と blocking 可視化は Project 数に線形の識別子列のみ — 出力肥大の設計リスクなし。
