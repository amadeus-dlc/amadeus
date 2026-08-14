# Reliability Design — git-drift-plugin

上流入力: `functional-design/business-rules.md`(R2/R3)、`functional-design/business-logic-model.md`(skip 経路)。nfr-requirements は SKIP(expected 不在)。

## 失敗様式と回復

| 失敗 | 挙動 | 回復 |
|---|---|---|
| fetch 失敗・タイムアウト | `skipped(fetch-failed)` を loud 記録、exit 0(fail-open) | 次回発火で再試行(throttle 経由) |
| 非 git / origin 不在 | `skipped` で不発火相当、exit 0 | 環境が変われば自然回復 |
| throttle 記録の破損・不在 | 「前回 fetch なし」として即 fetch | 自己修復(次回書込で正常化) |
| スロットル中のオフライン | 前回の remote-tracking ref で判定継続(警告の空白なし — ADR-5) | fetch 再開で最新化 |
| settings 解決失敗 | U2 側でセンサー起動前に中止(本 Unit へ到達しない) | 設定修正で次回から回復 |

## 設計原則

- advisory 固定: どの失敗もワークフロー・ステージ完了ガードを止めない(blocking 化しない — ADR-5 Alternatives Rejected)。
- 全 skip 経路がテスト対象(エラーパスも TDD の「実行可能な振る舞い」— FR-X-3)。サーキットブレーカ等の常駐パターンは単発 CLI につき非該当(1 行理由)。
