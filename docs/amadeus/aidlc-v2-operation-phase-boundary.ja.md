# AI-DLC v2 Operation Phase Boundary（AI-DLC v2 の Operation phase 境界）

この文書は、Issue #394 の判断として、AI-DLC v2 の Operation phase skill を Amadeus DLC で対象外にする理由と境界を定義する。

参照元は次である。

- リポジトリ: https://github.com/awslabs/aidlc-workflows/tree/v2
- 参照 commit: `d341522e1491db4884e9127004c3882365229218`
- Operation stage 定義: `core/amadeus-common/stages/operation/**`（7 stage）

## 判断

Amadeus DLC は、Operation phase を現在の対象外として維持する。

record の scaffold（`operation/` ディレクトリ）と Stage Progress の 7 行だけを持ち、いずれの stage も実行対象にしない。Stage Progress は常に `[S]`（`SKIP: out of Amadeus scope`）にする。

Operation skill の追加や取り込みは行わない。

## 対象外にする理由

### 成果物契約の観点

Amadeus DLC の成果物は、`amadeus/` 配下の日本語 Markdown（設計、計画、判断、追跡）であり、リポジトリ内で完結する。

Operation stage の成果物は、実環境への作用（デプロイ、プロビジョニング、監視設定）と実環境からの観測（インシデント、性能実測、フィードバック）を前提にする。これらはリポジトリ内の record だけでは真実性を保てず、成果物契約の外にある。

### gate の観点

Amadeus DLC の承認は、stage gate と phase PR・Bolt PR の人間 merge で構成され、承認対象はリポジトリ差分である。

デプロイ実行やインシデント対応の承認は PR merge では表現できず、環境権限や運用手順といった別の承認機構を要する。既存の gate 契約に Operation を載せると、承認対象と承認手段の対応が崩れる。

### validator の観点

`amadeus-validator` は、配布先ユーザー環境で `amadeus/` の構造を機械検証する契約であり、`pass` は「実行時に参照できる最低限の構造条件の充足」を意味する。

デプロイ結果や監視設定といった実環境状態の検証手段を validator は持たない。Operation を対象に含めると、`pass` の意味が構造条件の充足から逸脱する。

### PR 境界の観点

Amadeus DLC のライフサイクルは、phase PR と Bolt PR で完結する。

Operation の実行単位はリリースや運用イベントであり、PR 境界と一致しない。PR にならない作業を lifecycle に含めると、完了証拠を merge で確定する現在の追跡モデルが成立しない。

## 本家 Operation skill の一覧と Amadeus 側の扱い

| 本家 Operation stage | Amadeus 側の扱い |
|---|---|
| Deployment Pipeline | 対象外。パイプラインの設計までは Stage 3.4 Infrastructure Design の `cicd-pipeline.md` と Stage 3.7 CI Pipeline の `ci-config.md`、`quality-gates.md` が扱う。実パイプラインの構築と実行は扱わない。 |
| Environment Provisioning | 対象外。デプロイアーキテクチャの設計までは Stage 3.4 の `deployment-architecture.md` が扱う。実プロビジョニングは扱わない。 |
| Deployment Execution | 対象外。実行行為そのものであり、対応する設計成果物を持たない。 |
| Observability Setup | 対象外。監視項目と通知の設計までは Stage 3.4 の `monitoring-design.md` が扱う。実設定は扱わない。 |
| Incident Response | 対象外。インシデントからの学びは、Issue、PR、CI 結果を入力とする `amadeus-history-review` と `amadeus-learning-review` の分類で取り込める。対応作業そのものは扱わない。 |
| Performance Validation | 対象外。性能の要求と設計は Stage 3.2 NFR Requirements と 3.3 NFR Design が、テスト実行の記録は Build and Test の `performance-test-instructions.md` と `build-test-results.md` が扱う。実環境での検証は扱わない。 |
| Feedback & Optimization | 対象外。フィードバックの受け口は `amadeus` Intake の合流判定とスコープバックログ、および history / learning review である。改善の実施は新しい Intent として起票する。 |

## 将来対応する場合の入口

Operation phase の採用は、この文書の更新だけでは行わない。

次の手順で分離して扱う。

1. 採用の検討は、専用の GitHub Issue を起票して行う（roadmap item として扱う）。
2. 採用が確定した場合は、`amadeus` の Intake を通じて人間承認付きの新しい Intent として実施する。
3. その際、成果物契約、gate、validator、PR 境界の 4 観点それぞれで本文書の理由を再評価し、`docs/backward-compatibility.md` の要否も判断する。

## 関連文書

- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.ja.md)
- [Lifecycle Contract Overview](lifecycle/overview.md)
- [Skill Language Policy](skill-language-policy.md)（維持する契約に Operation phase の対象外境界を含む）
