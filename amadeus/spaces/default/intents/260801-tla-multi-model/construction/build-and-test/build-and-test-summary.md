# ビルド・テストサマリ

全 Unit の `code-generation-plan.md` と `code-summary.md` を対象に、Comprehensive 戦略で build、unit、integration/E2E、performance、security を統合検証する。結果の正本は `build-test-results.md` とする。

## 検証インベントリ

| 区分 | 対象 | 判定基準 |
|---|---|---|
| Build | package/promote/typecheck/lint | 全て exit 0 |
| Unit | schema、resolver、loader、vocabulary、CI domain | fail 0、fail-closed 分岐を含む |
| Integration/E2E | sensor、model-map、runner/port、artifact、workflow | cross-unit 結線と red→green 往復 |
| Performance | 全モデル12 run、Mirror 統計 pin | 190秒/run、30分/job、完全一致 |
| Security | path/symlink/drift/語彙/権限/fixture | 境界バイパス・権限増加0件 |
| Drift | 7 dist harness + 5 promoted root harness | 正本と byte 同期 |

## Readiness

- Build-ready: package/promote drift guard、型検査、lint、complexity gate は全て合格した。
- Test-ready: 重点テストは全て合格し、フル CI は719ファイル・9,763アサーション・失敗0で合格した。
- Security-ready: 新規依存・権限増加・秘密情報・Critical/High 相当の境界バイパスは0件である。
- Deployment-ready: 本リポジトリは短命 CLI でデプロイ対象サービスを持たない。GitHub hosted Ubuntu の実 `workflow_dispatch` による30分予算確認だけを最終 CI acceptance の残リスクとして保持する。
- 最終判定: ローカル build-and-test gate は READY。既知の cold/並列 timeout は今回の最終実行では発生していない。
