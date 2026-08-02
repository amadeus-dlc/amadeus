# Security Test Instructions — 260802-scope-grid-face-sync

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象(bt-proportional-selection — 実在境界へ trace できる範囲のみ)

- **新規外部依存なし**: code-summary.md の変更一覧に依存追加なし(package.json 不変)— `git diff origin/main...HEAD -- package.json` が空であることで機械確認
- **入力検証**: センサーは workspace 内 JSON/md の読取のみ(ネットワーク・秘密情報アクセスなし)。malformed JSON / unreadable ファイルは既存 `unreadable` finding 経路で fail-closed(既存テストが pin — t-self-scope-consistency-sensor の malformed ケース)
- **認可面の変更なし**: ゲート・承認・presence 機構に非接触(diff 対象は scope-grid/scopes/sensor/tests のみ)

DAST・依存監査の追加実行は対象境界が存在しないため生成しない(既存 CI の必須集合は不変)。

## 生成しない検査の根拠(bt-proportional-selection)

- DAST / 負荷を伴う侵入検査: 常駐サービス・ネットワーク境界が本変更に存在しない(センサーはローカル FS 読取のみ)
- 依存監査の追加実行: 依存追加ゼロのため既存 CI の監査面から変化なし。既存 advisory の扱いは本 intent スコープ外(c1-doctor-seam 規範 — 対象変更の security regression と全体 dependency audit は別判定)
