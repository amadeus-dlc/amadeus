# Reliability Design — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../nfr-requirements/reliability-requirements.md`(RL-1〜RL-4)、`../nfr-requirements/performance-requirements.md`(P-2)、`../nfr-requirements/security-requirements.md`(S-3)、`../nfr-requirements/scalability-requirements.md`(N/A 前提)、`../nfr-requirements/tech-stack-decisions.md`(spawn 契約)、`../functional-design/business-logic-model.md`(決定木 — 全終端 advisory)。2026-07-17。

## resilience パターンの採否(RL-1〜RL-4 の設計面確定)

| パターン | 採否 | 設計 |
|---|---|---|
| record-and-continue | **採用** | 全失敗経路(未配線・語彙未登録・payload 欠落・spawn 失敗・非0 exit)で stderr 記録 → 次の処理へ継続(RL-1)。cursor defaultSpawn の discard からの意図的強化(FD 明文照合済み) |
| fail-closed | **採用** | 不確実な状態では配線しない(RL-3)— payload 欠落・mint 条件不成立は「実行しない」が正動作 |
| 構造的縮退(graceful degradation) | **採用** | plugin 不在・全損時は「hooks なし opencode 運用」(現状)へ自然縮退(RL-4)— 検知・切替機構を要しない構造で充足 |
| リトライ | **不採用** | 単発 advisory イベントへのリトライは audit 二重 emit(重複行)リスクのみ持ち込む — 失敗は記録して落とすのが正(DQ-3 回答) |
| circuit breaker | **不採用** | 保護対象の下流サービス・遮断すべき常駐接続が存在しない |
| ヘルスチェック・failover | **不採用** | 常駐プロセスなし — 監視対象実体なし。フェイルオーバー先という概念が構造上不成立 |
| バックアップ | **不採用** | plugin 保有の永続データなし。audit 耐久性は core hooks 側の既存契約(変更面外) |

## 例外安全の設計

- entrypoint(C1)の各フックハンドラは本体を try/catch で包み、catch で stderr 記録のみ行い**必ず正常 return**(R-1 — 例外を opencode へ漏らさない)
- spawn は同期(cursor spawnSync 同型)で戻り値の code を読み、非0 は stderr 記録(FD の意図的強化)— 記録後に throw しない
- 「plugin 全損でも opencode と core hooks の正しさ不変」(C-2 保存)が全パターン採否の判定基準
