# Reliability Design — u2-state-reconcile-hardening

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

reliability-requirements の収束保証・恒久停止回避を、3状態台帳と一律再分類の状態機械で実現する設計。circuit breaker・指数バックオフ・ヘルスチェックは非適用(cid:nfr-design:c1 — boundary 駆動 reconcile で代替)。

## 状態機械の設計(reliability-requirements の中核)

- **3状態台帳**: synced / pending / safety-blocked を reducer transition 3種(business-logic-model 手順3)で書く。遷移は**現在状態に依存しない一律再分類**(reliability-requirements の 9セル全数定義)— その回の結果のみで次状態が決まるため、デッドエンド状態・遷移漏れが構造的に存在しない。
- **写像の固定**: retryable(rate-limit / network / api)→ pending / 解決不能(フィールド・選択肢未解決、permission)→ safety-blocked / 成功・既一致 → synced(business-logic-model の失敗分類表)。body 層失敗検出(reliability-requirements の FR-7d 面)の写像表は実装時に実 gh 応答で実測確定し、本設計では確約しない。

## 収束の設計

- **冪等 reconcile**: 次の boundary / manual sync で台帳起点の再評価(business-logic-model 手順4)— 成功済みへは mutation ゼロ(performance-design の早期 skip と同一分岐 — per-Project 呼び出し予算は performance-requirements が規定)。二重実行テストで mutation 総数不変を assert(reliability-requirements)。
- **リトライ方針**: 手順内リトライ・バックオフなし — pending 台帳が「再試行すべき対象」の永続表現であり、再試行の時機は boundary 駆動(tech-stack-decisions の決定)。

## 恒久停止の構造回避(reliability-requirements の層分離)

- 未完(pending / safety-blocked)が残る間、操作 receipt は `pending`(IN_PROGRESS 分類)に留め、`safety-blocked` を operation receipt に書かない — 既存 policy の terminal-block 分類(reliability-requirements の実装直読: amadeus-mirror-policy.ts:61-65)による completion 恒久停止を避ける(層分離は台帳=真実 / receipt=操作進行度の役割分担として設計)。
- gh 不在・未認証・API 障害は loud fail+workflow 継続(reliability-requirements の FR-7e 面)。

## 検証の設計

- failure injection: 部分成功(A 成功+B retryable 失敗 → B のみ pending → 次回収束)を FakeGateway 差し替えで固定(reliability-requirements の受入基準)。注入の秘匿検査は security-requirements の 0 hit assert(設計は security-design)と同一注入を共有。
- 独立性: 1 Project の失敗が他へ波及しないこと(scalability-requirements の独立性)を同じ injection スイートで assert。

## 非目標

- SLA/SLO・バックアップ・レプリケーション: N/A(reliability-requirements の N/A 規律 — 永続状態は git 管理の state のみ)。
