# Intent Statement: TLA+ Model Authoring

## Problem Statement

Amadeusの`formal-model-check`は、`specs/tla/model-map.json`へ登録済みのTLA+モデルを決定論的に実行できる一方、現在の要求や設計からモデルを新規作成・改訂する責務を持たない。このため、Requirements AnalysisやFunctional Designでadvisoryが発火し、ユーザーがrun-nowを選んだ場合でも、現在の変更と無関係な`FormalElection`固定routeの`NOT_DETECTED`でholdを解除できる断線が残る。

解決すべき問題はTLC実行器の不足ではなく、形式検証の適用判定からモデル供給、トレーサビリティ、proof、独立レビュー、人間ゲートまでを所有する実行可能なauthoring工程がstage graphに存在しないことである。

## Target Customer

- Amadeusを使って状態機械、プロトコル、ワークフローを設計・変更する開発者
- 要求と設計の矛盾を実装前に検出したいプロダクト・アーキテクチャ・品質担当者
- 形式検証の適用可否、モデル鮮度、proof、承認履歴を監査可能にしたいAmadeusメンテナー

利用者の主な痛みは、形式検証stageがgreenでも「現在の要求を検証した」という対応関係を証明できず、未知の新規題材や意味変更に対してモデル作成・改訂が無音で欠落しうることである。plugin未compose、advisory未発火、リスク延期を選んだ場合はこの解除経路を通らない。

## Success Metrics

本Intentは次の観測可能な結果をすべて満たしたとき成功とする。

1. 未知の新規プロトコル要求では、新規モデルauthoringが必須となり、無関係な既存モデルの`NOT_DETECTED`だけでは完了できない。
2. guard、transition、status、operation、load-bearing fieldの意味変更では、既存モデルの改訂が必須となる。
3. 意味不変の実装変更は、既存の`--impl-only`宣言と監査receiptへ到達できる。
4. 形式検証の非対象判定は、理由と人間承認を永続receiptへ残す。
5. 対象要求から登録モデルとnamed invariantへの全数トレーサビリティを持ち、対応漏れをfail-closedで検出する。
6. requirementsまたはdesign identityが変化した後は、旧verdictだけでholdを解除できない。
7. `MirrorLifecycle`とは別の未知題材で、要求から適用判定、モデル新規作成または改訂、proof、登録、`formal-model-check`実行までのE2Eを実測する。
8. `FormalElection`と`MirrorLifecycle`の既存実行契約およびverdict identityを維持する。

## Initiative Trigger

[Issue #2161](https://github.com/amadeus-dlc/amadeus/issues/2161) の再実測により、PR #2178マージ後の現行コードでも、`.tla`、`.cfg`、reduction manifest、`model-map.json`の作成・改訂を完了条件として所有するstageが0件であることが確認された。過去Intentではモデル1本と工程文書の存在を供給工程の成立と扱ったが、将来の未知要求へ反復適用できる実行責務にはなっていない。

この断線を残すと、形式検証のadvisoryと現在要求の検証証拠が分離したままになるため、実行系の追加hardeningだけでは解決しない。

## Initial Scope Signal

- 正規scope: `self-feature`
- 対象: Amadeus自身のstage graph、要求・設計identity連携、authoring成果物契約、proof・review・human gate、既存`formal-model-check`への引き渡し
- 原則非対象: TLC実行器の再実装、全変更へのTLA+適用強制、既存2モデルのverdict identity変更
- 解決方式は未固定: 新規stageと既存stageへのfail-closed overlayを後続stageで比較し、受け入れ条件を最小の深い責務境界で満たす

## Source and Traceability

- Primary source: [Issue #2161](https://github.com/amadeus-dlc/amadeus/issues/2161)
- Human scope ruling: `self-feature`
- Frozen implementation review target: `c12a414bcc1aa367e64dd080868c45f2913f5f25`
- Cross-review target: `c12a414bcc1aa367e64dd080868c45f2913f5f25`
- Reviewer 1: `CONFIRMED_WITH_REFINEMENTS`
- Reviewer 2: `CONFIRMED_WITH_REFINEMENTS`
- Convergence: `ESTABLISHED_WITH_REFINEMENTS`
- Refinements: advisory checkpointの現行参照は`amadeus-orchestrate.ts:1371-1413`。過去Intentが未知要求への一般適用を証明したという記述は逐語事実ではなく、供給工程を利用可能と判定した成果物からの推論として扱う。指定質問票に裁定がないことと、全履歴に裁定がないことは分離する。
