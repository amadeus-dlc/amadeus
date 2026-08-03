# Code Generation Plan — mirror-persistence-propagation

## 対象とトレーサビリティ

本計画は Unit `mirror-persistence-propagation`、要件 #1878、`requirements.md` の永続化失敗時の fail-closed 契約、および当該 Unit の Functional／NFR Design に対応する。

## 実装計画

- [x] Step 1: `persistBlocked` が `applyTransition` の結果を破棄しないよう、内部 `StateResult` を `ok(clean | outbox-pending)` と `failed(pre-commit | durability-unknown)` に閉じる。対応: #1878、永続化失敗の偽成功防止。
- [x] Step 2: 既存 outbox の drain を maintenance-only とし、同一 invocation で今回 transition を評価しない。対応: audit at-most-once、再試行境界。
- [x] Step 3: pre-commit と durability-unknown を既存 `stateFailure` の effect へ型安全に写像し、公開 outcome union、rollback、同期 retry を増やさない。対応: 互換性と fail-closed。
- [x] Step 4: state commit 後の audit／outbox clear 失敗を `outbox-pending` として次回の冪等 drain へ委譲する。対応: transactional outbox 収束。
- [x] Step 5: executor と state-store の focused unit／integration test を追加・更新し、failure injection、maintenance-only、public outcome を検証する。対応: Comprehensive test strategy。
- [x] Step 6: TLA model registration の source digest と全 harness projection を正本から再生成する。対応: 配布 drift 防止。
- [x] Step 7: `typecheck`、`lint`、package/promote drift check、Mirror 関連回帰を実行する。対応: 完了条件。

## 非適用項目

API、DB migration、UI、デプロイ資産、新規 test runner 設定は本 Unit の境界外である。既存 Bun test／TypeScript 設定を利用する。
