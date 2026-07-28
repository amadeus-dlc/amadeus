# Scalability Design — u1-project-sync-skeleton

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

scalability-requirements の線形規模モデルを、ステートレスな単発実行構造で実現する設計。水平/垂直スケーリング・負荷分散・パーティショニング・auto-scaling はすべて非適用(scalability-requirements の N/A 規律 — cid:nfr-design:c1 の置換)。

## 実行構造

- **ステートレス単発実行**: 同期は boundary チェーン内の1回の直線実行(business-logic-model の8ステップ)— プロセス間で共有するメモリ状態を持たず、永続状態は git 管理の state file のみ(reliability-requirements のデータ耐久性)。スケール単位という概念自体が存在しない。
- **線形ループ**: U1 は単一の設定済み Project が典型(business-logic-model 手順1)— 複数 Project の一般化は U2 責務であり、U1 の構造(1 Project の直線経路)は N=1 の特殊形として設計する。呼び出し係数は performance-design の予算構造が上限を保証(performance-requirements)。

## 負荷・制限への応答

- rate-limit(429)は既存 retryable 分類で吸収(scalability-requirements)— U1 では警告+継続(reliability-requirements の loud-fail 設計)で、throttle・バックオフ機構を持たない(tech-stack-decisions のプロセスモデル決定)。
- 台帳は synced entry の最小形のみ(business-logic-model 手順8)— データ増加面の設計は「書く対象を最小にする」ことで完結(scalability-requirements の台帳規模)。

## 容量しきい値・auto-scaling

- N/A — 常駐サービス・キュー・ワーカーが存在しないため容量管理の対象がない(scalability-requirements の非適用明示を設計でも維持)。診断出力の秘匿制約(security-requirements)により、規模が増えても出力は識別子・ラベルのみで線形。
