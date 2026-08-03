# Performance Requirements — mirror-persistence-propagation

## 適用範囲と上流トレーサビリティ

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、`persistBlocked`／`applyTransition` の同期ファイル永続化経路だけを対象とする。常駐サービス、HTTP、データベース、外部キューは存在しないため、RPS・同時ユーザー数・ネットワークレイテンシのSLOは非適用とする。

上流の FR-03、FR-04、FR-10、FR-15 と NFR-03、NFR-05、NFR-06、NFR-09、および Functional Design の BR-01、BR-08、AR-01〜AR-11 を性能境界として扱う。正しさ、fail-closed、byte不変、outbox収束を性能のために緩和してはならない。

## 実行コスト要件

| ID | 要求 | 測定方法 | 合格条件 |
|---|---|---|---|
| PERF-MPP-01 | 今回transitionの評価回数を有界にする | failure-injection testで `applyTransition` call countを計測 | `ready` は1回、maintenance-onlyは0回 |
| PERF-MPP-02 | 同一invocation内の自動retryを行わない | lock、read、parse、conflict、render、各file I/O失敗でretry counterを計測 | 全失敗点で0回 |
| PERF-MPP-03 | prior outboxの収束と今回transitionを直列に重ねない | maintenance append／clear成功・失敗の各fixtureでtransition構築回数を計測 | 全maintenance経路で0回 |
| PERF-MPP-04 | clean経路に外部プロセス・ネットワーク・追加依存を導入しない | production call graphと依存差分を検査 | 同期in-processのBun／filesystem境界だけ |
| PERF-MPP-05 | focused検証をCIの既存制限内で決定的に完了させる | 同一revisionでfocused testを5回実行し、timeoutとflaky retryを記録 | 全5回が既存Bun test timeout内、retry 0回 |

PERF-MPP-05は新しい実時間SLOを導入しない。長時間の実I/O待機ではなく、注入可能なportとcall counterで同じ制御経路を検証する。全体の no-silent-drop gate に対する15秒制約は NFR-01 の別Unit契約であり、本Unitへ誤って転用しない。

## レイテンシ予算

`persistBlocked` のクリティカルパスは、preparation read、必要な場合の単一transition評価、atomic state write、audit append、outbox clearから成る。各段階に新しい待機、backoff、sleep、同期retryを追加しない。maintenanceを検出したinvocationはmaintenance結果を返して終端し、明示的な後続invocationだけが今回transitionを開始する。

性能退行は平均時間ではなく、次の構造的上限で先に検出する。

- `applyTransition`：invocationあたり最大1回
- current-transition用atomic state rename：最大1回
- 同一transaction identityのaudit新規append：最大1件
- maintenance invocation内のcurrent-transition評価：0回
- failure後の暗黙retry／再帰呼出：0回

## ベンチマークと証跡

Build and Testでは、focused testのコマンド、revision、5回分の実行時間、call counter、失敗注入点を記録する。性能超過が出ても、`business-rules.md` のbyte不変・typed failure・outbox保持を弱める最適化は禁止する。

本Unitは外部ロード試験、k6、auto-scaling検証を生成しない。実在する境界がローカルCLIとfilesystemのみであり、`requirements.md` がそれらを要求していないためである。
