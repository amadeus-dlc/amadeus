# Scope Document: TLA+ Model Authoring

上流入力: `intent-statement.md`

## Objective

現在の要求または設計とTLA+モデルの間に、適用判定、authoringまたは改訂、トレーサビリティ、proof、独立レビュー、人間承認、既存`formal-model-check`実行までの監査可能な価値鎖を構築する。既存モデルの`NOT_DETECTED`だけでは、無関係な現在要求のholdを解除できないfail-closed契約を成立させる。

## In Scope

1. Requirements Analysisで形式モデルの適用可否を明示判定し、対象identityと理由を証拠化する。
2. 未知の新規対象では、要求・裁定からinvariantを導出し、新規`.tla`、`.cfg`、reduction manifest、`model-map.json`登録を供給する実行可能ownerを設ける。
3. 登録済みモデルに関係する意味変更では、影響判定からモデル改訂へ到達させる。
4. 意味不変の実装変更では、既存`--impl-only`契約と監査receiptへ分岐させる。
5. 非対象判定では、理由、対象identity、人間承認を永続receiptへ残す。
6. requirement、FR、cid、裁定、design identityからモデルとnamed invariantへの全数トレーサビリティを強制する。
7. requirementsまたはdesign identityの変更で旧evidenceをstale化し、coverage欠落をfail-closedにする。
8. TLC完全探索、falling proof、vacuity proof、reductionとinvariantの独立レビュー、人間ゲートを完了条件へ含める。
9. 生成・改訂済みモデルを既存`formal-model-check`へ引き渡し、決定論的実行stageの責務を維持する。
10. `MirrorLifecycle`以外の未知題材を使った要求→authoring→proof→登録→実行のE2Eを追加する。
11. canonical sourceと全配布harnessの生成・検証契約を同期する。

## Out of Scope

- TLC実行器、verdict normalization、既存model receipt処理の全面再実装
- 全てのコード変更へのTLA+適用強制
- LLMによるTLA+生成そのものの決定論化
- `FormalElection`と`MirrorLifecycle`の既存verdict identityまたは利用者向け実行契約の意図的変更
- 本initiativeを規模だけで複数Intentへ分割すること
- deploymentや長期運用機能の追加

## Must-Have Outcomes

| ID | Outcome | Verification signal |
|---|---|---|
| M1 | 未知プロトコルで新規authoringが必須 | 既存`FormalElection`成功だけではhold解除不能 |
| M2 | 意味変更でモデル改訂が必須 | guard等の変更fixtureが旧モデルをstale化 |
| M3 | 意味不変変更を`--impl-only`へ分岐 | identity付き監査receiptを確認 |
| M4 | 非対象理由と承認を永続化 | pure function fixtureのreceiptを確認 |
| M5 | 要求からinvariantまで全数対応 | coverage欠落fixtureがfail-closed |
| M6 | requirements/design変更でstale化 | 旧verdict再利用を拒否 |
| M7 | 未知題材のE2Eを完走 | authoring、proof、登録、実行を実測 |
| M8 | 既存2モデルを互換維持 | 既存回帰テストとidentityが不変 |

Should/Couldは置かない。M1〜M8は単独では利用者価値を完成せず、全てが「現在要求を形式検証した証拠」を構成するMustである。

## Value Stream

```text
要求・設計
  -> 適用判定
  -> 新規authoring / モデル改訂 / --impl-only / 非対象
  -> trace coverage + staleness検査
  -> TLC + falling proof + vacuity proof
  -> 独立レビュー + 人間ゲート
  -> model-map登録
  -> formal-model-check実行
  -> 現在要求に相関したverdict receipt
```

## Constraints and Assumptions

- scopeは`self-feature`、depthはStandard、test strategyはComprehensive。
- canonical変更は`packages/framework/core/`およびplugin sourceへ置き、生成`dist/`やself-install面をコミットしない。
- 既存のadvisory correlation、source byte identity、model receiptを再利用し、requirement/design coverageをその上に追加する。
- authoring責務の配置方式はscopeでは固定せず、新規stageと既存stage overlayを後続設計で比較する。
- 外部期限は未指定。walking skeletonとdependency/risk-firstの順序で早期に最大リスクを検証する。

## Risks

- LLM生成モデルの意味妥当性を機械検査だけで保証しようとすると検証劇場になる。
- requirement/design identityを粗く定義すると無関係変更で過剰stale化し、細かすぎると意味変更を取り逃す。
- stage graph拡張とplugin opt-in境界が衝突すると、非利用者のstock workflowへ不要な責務を漏らす。
- proofとreviewの永続証拠がmodel-map更新と原子的でなければ、部分成功をcompleteとして扱う危険がある。

## Acceptance Boundary

M1〜M8、宣言されたComprehensive検証、全配布面のsource-only/reproducibility契約がgreenで、未解決BLOCKERが0件のときだけscope完了とする。文書だけの存在、既存モデルの再実行、1本の例示モデル作成だけでは完了しない。
