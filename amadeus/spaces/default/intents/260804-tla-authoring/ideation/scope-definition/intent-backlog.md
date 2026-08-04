# Intent Backlog: TLA+ Model Authoring

上流入力: `intent-statement.md`

## Prioritization Policy

全項目をMustとする。順序はdependencyを制約、risk-firstとwalking-skeletonを経済的優先原則として決める。raw WSJFの数値は、利用者価値が鎖全体で初めて成立し、現時点に実測costがないため使用しない。

## Proto-Capabilities

| Priority | ID | Capability | Value | Dependency | Confidence hypothesis |
|---:|---|---|---|---|---|
| 1 | CAP-1 | 適用判定と要求・設計identity | 現在要求を検証対象へ結び付ける | なし | 未知要求が既存model成功で解除されない |
| 2 | CAP-2 | Authoring ownerと成果物契約 | 新規・改訂モデルを反復供給する | CAP-1 | stage graphがactor/trigger/produces/完了条件を所有する |
| 3 | CAP-3 | Trace coverageとstaleness gate | 対応漏れと旧evidence再利用を防ぐ | CAP-1, CAP-2 | requirement/design変更が決定的に赤になる |
| 4 | CAP-4 | Proof・独立レビュー・人間ゲート | reductionとinvariantの妥当性を承認可能にする | CAP-2, CAP-3 | TLC greenだけでは登録できない |
| 5 | CAP-5 | 分岐契約 | 改訂、`--impl-only`、非対象を正しく分ける | CAP-1, CAP-3, CAP-4 | 各fixtureが相互排他的なreceiptへ到達する |
| 6 | CAP-6 | model-map登録とexecutor handoff | 既存決定論的実行stageへ安全に渡す | CAP-2, CAP-4 | 部分成功では登録されず、完全成功だけ実行可能になる |
| 7 | CAP-7 | 互換性・配布面同期 | 既存2モデルと全harnessを維持する | CAP-1〜CAP-6 | 既存identity不変、source-only/reproducible build green |
| 8 | CAP-8 | 未知題材E2E | 価値鎖全体を実証する | CAP-1〜CAP-7 | MirrorLifecycle以外で要求からverdictまで完走する |

## Walking Skeleton

最初のConstruction Boltは、未知の最小プロトコル1件を入力に、CAP-1〜CAP-6の最薄い縦断経路を通す。production規模のモデル機能より、次の最大リスクを先に検証する。

1. 要求identityからauthoring必要判定が起動する。
2. 最小`.tla`/`.cfg`/reduction/trace evidenceを生成する。
3. proofと人間ゲートなしでは登録できない。
4. 登録後だけ既存`formal-model-check`が対象モデルを実行する。
5. 無関係な`FormalElection`の`NOT_DETECTED`では解除できない。

## Subsequent Slices

1. 登録済みモデルの意味変更と改訂分岐。
2. 意味不変変更の`--impl-only`分岐。
3. 非対象判定と承認receipt。
4. coverage/stalenessの同根・対称fixture拡張。
5. 既存2モデル互換性と全harness配布検証。
6. 未知題材の完全E2Eと回帰suiteへの恒常化。

## Dependency Notes

- CAP-1なしにCAP-2を実装すると、authoring対象を現在要求へ相関できない。
- CAP-3なしにCAP-4を実装すると、正しいproofでも古い要求identityへ再利用できる。
- CAP-4なしにCAP-6を実装すると、未承認model-map更新が可能になる。
- CAP-7は各capabilityのcanonical sourceが固まるごとに継続確認し、最後にまとめて生成面を修正しない。
- CAP-8は最後の飾りではなく、walking skeletonで最小形を先に通し、最終sliceで完全受け入れ条件を再演する。

## Deferred Decisions

- 新規stageか既存stage overlayか
- requirement/design identityの正規化粒度
- trace/reduction/proof receiptのschemaと原子性境界
- model authoring agentのpersona・reviewer配置

これらはscope追加ではなく、M1〜M8を満たす実装方式としてRequirements AnalysisとApplication Designで決定する。
