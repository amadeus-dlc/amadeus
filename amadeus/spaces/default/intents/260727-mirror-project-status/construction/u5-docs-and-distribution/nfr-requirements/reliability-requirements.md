# Reliability Requirements — u5-docs-and-distribution

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

U5 の信頼性は「配布・文書・契約が機械検査でズレなく着地すること」— 実行時の可用性ではなく、検査機構の網羅と実測記録が規定の中心。

## 機械検査の網羅(requirements FR-12b/FR-12c)

- drift guard: `bun run dist:check` / `bun run promote:self:check` の green を機械確認(business-rules BR-U5-3)— 正本と7ハーネス生成物+self-install の一致を保証する既存の決定的ガード(technology-stack: 配布の drift guard は既存基盤)。
- parity: docs⇔契約台帳の一致は t291 parity テストで機械固定(business-logic-model のドキュメント更新フロー手順3)。
- 台帳不変の検収: 新設モジュールゼロの期待値を機械確認し、変化検出時は設計逸脱として停止・報告(business-rules BR-U5-4 — 無音の配布面変化を作らない)。

## 検収の実測規律(requirements FR-12a — 受入条件16)

- 検証コマンド群の exit code・件数は集計コマンドの実出力からのみ転記する(business-rules BR-U5-8)— 見込み・記憶による green 報告を禁止(検証劇場の禁止と同根)。
- 新設ガード・検査(該当分)は「落ちる実証」+「正当データで赤くならない」の両側実測を完成条件とする(requirements FR-12c — org.md Mandated)。落ちる実証の注入は赤の実測 → revert までを不可分1セットで実施(business-rules テスト規約)。

## 障害時挙動

- drift guard 赤・parity 赤は正本修正 → 再生成/再同期で回復する(business-logic-model のエラー・エッジケース節)— 生成物側の手当てで隠さない。
- 検収で他 Unit のテスト欠落を発見した場合は U5 で代作せず当該 Unit の欠落として可視化する(business-rules BR-U5-6 — 検収の責務分離)。

## 非目標

- SLA/SLO・バックアップ目標: N/A — U5 は常駐面を追加せず、成果物(docs・dist)は git 管理で回復手段はバージョン管理(根拠: requirements FR-1b のチェーン内実行のみ。cid:observability-setup:c3 の N/A 規律)。
