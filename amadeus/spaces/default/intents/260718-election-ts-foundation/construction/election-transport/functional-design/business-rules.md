# Business Rules — election-transport(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ルール一覧(テストは integration 層 — spawn/実 FS、fs-tests-integration-first)

| # | ルール | 由来 | テスト |
|---|---|---|---|
| BR-T1 | ShortNotification 型は質問文・選択肢テキストのフィールドを持たない(構造的 blind — 含めた実装は型エラー) | FR-2a | 型面 compile 検査+生成 payload のキー全数 assert(落ちる実証: フィールド追加注入で赤) |
| BR-T2 | DeliveryRecord は実行結果からのみ単段生成(agmsg: spawn exit 由来 / subagent: **U5 report 時に provenance=reported-by-conductor で生成 — notify は DeliveryDirective のみ返す**。Q1=B 裁定)。module 内部ファクトリのみが構築可 | FR-2b | fake send.sh(exit 0/1)での記録有無+notify 戻り値に record 非含有+外部構築不能の型面 assert |
| BR-T3 | agmsg spawn は env: process.env を明示(bun-spawn-env-snapshot) | 既習ノルム | spawn 引数の assert |
| BR-T4 | 両輸送の DeliveryRecord スキーマは **transport 判別子と provenance 以外**同一(FR-7b — provenance は spawn-exit/reported-by-conductor で輸送別。iter2 #5 是正) | FR-7 | 同一選挙を両輸送で流し、当該2フィールドを除くスキーマ deep-equal |
| BR-T5 | 送信失敗は Result で返り、部分成功(N 名中 k 名送達)は voter 別に記録される | FR-2b | 混在 exit の per-voter 記録 assert |

## 落ちる実証

BR-T1(型キー検査)と BR-T2(exit 由来生成)の実行時消費行へ注入し赤→revert。BR-T3〜T5 も code-generation 時に同水準の落ちる実証を実施する(reviewer F4 是正 — 対象の明示)。
