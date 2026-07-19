# Business Rules — election-transport(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ルール一覧(テストは integration 層 — spawn/実 FS、fs-tests-integration-first)

| # | ルール | 由来 | テスト |
|---|---|---|---|
| BR-T1 | ShortNotification 型は質問文・選択肢テキストのフィールドを持たない(構造的 blind — 含めた実装は型エラー) | FR-2a | 型面 compile 検査+生成 payload のキー全数 assert(落ちる実証: フィールド追加注入で赤) |
| BR-T2 | DeliveryRecord は送信実行の結果からのみ生成される(agmsg: spawn exit 由来 / subagent: 返却時)— 送らず記帳する公開経路が存在しない | FR-2b | fake send.sh(exit 0/1)での記録有無 assert |
| BR-T3 | agmsg spawn は env: process.env を明示(bun-spawn-env-snapshot) | 既習ノルム | spawn 引数の assert |
| BR-T4 | 両輸送の DeliveryRecord スキーマは transport 判別子以外同一(FR-7b) | FR-7 | 同一選挙を両輸送で流しスキーマ deep-equal |
| BR-T5 | 送信失敗は Result で返り、部分成功(N 名中 k 名送達)は voter 別に記録される | FR-2b | 混在 exit の per-voter 記録 assert |

## 落ちる実証

BR-T1(型キー検査)と BR-T2(exit 由来生成)の実行時消費行へ注入し赤→revert。
