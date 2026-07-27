# Security Requirements — solo-election-core (U1)

上流入力(consumes 全数): business-logic-model.md(tally 2体分岐・個数照合)、business-rules.md(BR-U1-1〜8 の検証列)、requirements.md(NFR-01〜03 の正本)、technology-stack.md(Bun/TS/ESM・テスト4層の実行環境)。

## セキュリティ要件

| ID | 要件 | 合否基準 | 出典 |
|---|---|---|---|
| U1-SEC-01 | ballot 入力の fail-closed 検証は不変 — voterKind/GoA/choice の parse 拒否(Ballot.parse)を2体経路でも素通りさせない | 既存 parse 検証テスト green+solo loop テストで不正 ballot(voterKind 欠落等)の拒否を1ケース以上 | business-rules.md BR-U1-8、requirements.md FR-03 |
| U1-SEC-02 | 新規の外部入力面・資格情報・シークレットを追加しない | 実装 diff に env/credential/network 追加ゼロ | requirements.md(新規外部依存なし) |
| U1-SEC-03 | split hold の人間解決は既存の tally.json 先行永続化契約(改竄検知は verify の再計算比較)に乗る — 新規の承認バイパス経路を作らない | HOLD_RESOLUTIONS 経由以外に state を動かす経路が diff に存在しない(grep) | business-logic-model.md、requirements.md FR-07 |

## 明示的に設けない検査(比例選定)

DAST・依存監査の新規追加はなし — U1 は依存を増やさず、既存 CI の必須 scan を省略もしない。新規検査を追加しない根拠は比例選定(cid:build-and-test:bt-proportional-selection — 承認済み NFR と実在境界へ trace できない検査は生成しない)。既存 scan の扱い(regression と依存監査の分離判定)は cid:build-and-test:c3 のとおり不変。
