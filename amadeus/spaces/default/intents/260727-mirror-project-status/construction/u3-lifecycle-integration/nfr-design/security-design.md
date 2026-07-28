# Security Design — u3-lifecycle-integration

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

security-requirements の同意境界・操作境界・秘匿を、既存 ask 機構への内包と gate のオフライン構造で実現する。新しい認証面・同意種別を作らない。

## 同意境界の設計(security-requirements の中核)

- **既存 ask への内包**: prompt モードの Project 面要約(business-logic-model の FR-10a 節 — 同期対象 Project 数と適用予定 Status)は既存の操作単位 ask の文言に追記する構造 — 新しい ask 種別・同意フローを実装しない。文言はテストで固定(tech-stack-decisions の ui-less-mockups 決定)。
- **要約に含める情報の制限**: Project 数・Status 名のみ(security-requirements — token・API 応答を含めない)。文言組み立てはローカル値のみから行い、外部応答文字列を ask へ素通ししない。
- **scopeExclusions 不変**: PR merge / release / deploy / daemon / polling への consent 拡張禁止は既存 negative assert(security-requirements)を維持 — U3 が argv 生成面を変更しないことで構造的に保証。

## 操作境界の設計

- **boundary 新設禁止**: 既存 eligible boundary / manual invocation チェーンのみに配線(security-requirements — 攻撃面の不拡大)。タイマー・外部トリガーの実行契機を作らない(performance-requirements の配線構造と同一の保証)。
- **close の gate 前置**: close 実行は `completionProjectGate` ready のみ(business-logic-model 手順3)。gate は台帳のみ入力のオフライン決定(security-requirements)— 外部応答の細工で gate をバイパスする経路が存在しない(reliability-requirements の安全性と同じ機構を攻撃面の観点で消費)。

## 秘匿の設計

- close 保留時の blocking 可視化(business-logic-model 手順2 — 警告と台帳)は Project 識別子と状態ラベルのみで構成(security-requirements — U2 redact 流儀の継承)。可視化量は Project 数に線形(scalability-requirements)で出力面の肥大なし。
