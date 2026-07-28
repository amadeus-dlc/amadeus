# Scalability Design — u2-state-reconcile-hardening

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

scalability-requirements の独立性・線形性を、per-Project 独立ループの構造で実現する設計。水平スケーリング・パーティショニング・auto-scaling は非適用(scalability-requirements — cid:nfr-design:c1)。

## 独立性の構造(scalability-requirements の中核)

- **per-Project 独立処理**: 1 Project の失敗が他 Project の処理・記録を妨げない(business-logic-model 手順2)— ループ本体を Project 単位の try 境界で包み、失敗は当該 Project の台帳分類(reliability-requirements の写像)へ落ちて次の Project へ進む。部分障害の blast radius = 1 Project。
- **逐次処理の維持**: 並列化の性能要求を置かない(scalability-requirements — A-2 の少数前提で逐次が十分。並列導入時は外部コマンドの並行安全性文書確認が前提)。

## 台帳の規模設計

- entry は単調増加・削除手順なし(scalability-requirements — business-logic-model の reconcile ループに削除ステップが存在しない構造的事実)。A-2 により実用上有界で、容量しきい値・パージ機構を設計しない。
- 台帳読取は boundary あたり1回(reconcile の起点 — business-logic-model 手順4)で、entry 数への依存は線形走査のみ。

## 負荷制限への応答

- rate-limit(429)→ retryable → pending の分類吸収(business-logic-model の失敗分類表)— throttle・バックオフを設計しない(tech-stack-decisions の却下案どおり)。pending の再評価タイミングは boundary 駆動(scalability-requirements)で、負荷の平準化は boundary 間隔が自然に担う。
- 検証: 部分成功の failure injection(reliability-requirements)と per-Project counter assert(performance-requirements)が独立性・線形性の両方を機械固定する。秘匿制約(security-requirements)により負荷試験・注入の出力検査も分類ラベルのみ。
