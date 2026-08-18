# External Dependency Map — インセプション固定費バッチ(#3181 + #2415)

本 intent はほぼ AI 完結(フレームワーク内実装)。外部ゲート項目は以下のみ。

| 項目 | 種別 | Owner | リードタイム | ブロックする Bolt | 緩和・迂回 |
|---|---|---|---|---|---|
| gh CLI の runnable/auth readiness | 実行環境依存(optional dependency)| ユーザー環境 | 即時(認証済みなら)| Bolt 1 の live demo のみ | FR-EVD-5 の fail-open 設計により実装・テストは gh 不在でも完結(readiness 失敗 fixture)。demo は GitHub 復旧時に実施 |
| GitHub API 可用性(本セッションで断続 503 実測 — mirror create が retry 状態)| 外部サービス | GitHub | 不定 | Bolt 1 の live demo / mirror 同期 | mirror は fail-open+retry 台帳で追跡中。ワークフロー停止理由にしない(Mandated) |
| merge queue(main Ruleset)| リポジトリ運用 | ユーザー(常任マージ承認は CI green + converged 実測時のみ有効)| CI 実行時間 | 両 Bolt の着地 | 直列着地の rebase 形を bolt-plan.md に織込済み |
| walking-skeleton ゲート承認 | 人間承認(P4)| ユーザー | 応答待ち | Bolt 2 開始 | ゲート提示を PR 作成・CI 並走と同時化 |

外部チームへのハンドオフ・データ可用性ウィンドウ・外部 API 契約は存在しない。
