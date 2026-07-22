# Constraint Register — 260722-space-record-catalog

上流入力(consumes 全数): intent-statement(intent-capture 産)。competitive-analysis / market-trends / build-vs-buy は market-research SKIP により設計上不在(N/A)。

## Technical Constraints

| # | 制約 | 出典 |
|---|---|---|
| T1 | 配布フレームワークへ runtime dependency を追加しない(Bun-only) | project.md Forbidden |
| T2 | 正本は `packages/framework/core/` / `harness/<name>/`、`dist/` とセルフインストールは生成物として同一変更で同期 | project.md Mandated |
| T3 | 既存の安定 ID(UUIDv7・electionId)・監査シャード(append-only)・選挙検証(provenance)を壊さない | #1309 受け入れ基準+org.md |
| T4 | (失効 — 2026-07-23 スコープ縮小裁定により投影は非目標化。drift 検証の対象はレジストリ vs 実ディレクトリへ移る) | intent-statement Amendment |
| T5 | 「レコード」単独表記の禁止 — 上位概念は「ライフサイクルレコード」(ユーザー裁定 2026-07-23、用語集登録済み) | domain-language.md |
| T6 | 選挙 createdAt 導出は「timeline 最古イベント(kind 不問)+空 timeline フォールバック」を要設計(実測: distributed 76 / ballot 25 / 空 2) | feasibility-assessment.md |

## Organizational Constraints

| # | 制約 | 出典 |
|---|---|---|
| O1 | 本 intent は ideation(scope-definition まで)で park。実装着手はユーザー専権の別判断 | ユーザー決定 2026-07-22、cid:issue-selection-user-decides |
| O2 | park 時に record PR+#1309 ミラー化(record → Issue 一方向同期) | cid:intent-first-mirror-issue |
| O3 | 提案語彙(SpaceRecordCatalog 等)は設計確定まで用語集へ登録しない | domain-language.md 運用ルール(ユーザー決定 2026-07-22) |
| O4 | 既存ディレクトリの一括 rename は設計前に行わない(縮小後スコープでは rename 自体が設計対象になるため、「設計・移行方針の承認前に実行しない」と読み替える) | #1309 非目標+2026-07-23 縮小裁定 |

## Regulatory Constraints

N/A — 対象は開発工程メタデータのみで、個人情報・決済・医療等の規制適用面が存在しない(反証可能な根拠は feasibility-assessment.md の Compliance Perspective を参照)。
