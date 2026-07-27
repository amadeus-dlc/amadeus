# Security Design — solo-election-core (U1)

上流入力(consumes 全数): performance-requirements.md(U1-PERF)、security-requirements.md(U1-SEC)、scalability-requirements.md(U1-SCALE)、reliability-requirements.md(U1-REL)、tech-stack-decisions.md(層配置・形式検証の決定)、business-logic-model.md(tally 2体分岐・TLA 対応の設計正本)。

## 設計

- U1-SEC-01(fail-closed 維持): Ballot.parse は無変更(voterKind 検証 = amadeus-election-model.ts:224 実在)。solo loop テストに不正 ballot 拒否ケース(voterKind 欠落 → parse 失敗 → vote exit 1)を1件配置。
- U1-SEC-02(外部面ゼロ): 変更ファイルは model.ts / election.ts / FormalElection.tla / model-map.json / tests のみ — env・network・credential 追加なしを diff 検分で確認。
- U1-SEC-03(バイパス経路なし): split の解決は HOLD_RESOLUTIONS 経由のみ。人間裁定の先行永続化契約は handleHoldResolved(amadeus-election.ts:243-289、:272-274 の「the human ruling is DURABLE」コメント)を無変更で継承。

## 検証配線

レビュー観点に「HOLD_RESOLUTIONS 以外から state を動かす新規経路の不在(grep)」を含める。
