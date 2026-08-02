# Tech Stack Decisions — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): business-logic-model(§9.2 下流引き渡し), business-rules(BR-V2), requirements(NFR-4, Constraints)

## 決定

| # | 決定 | 根拠 |
|---|---|---|
| TS-1 | **言語・ランタイムは現行のまま**: TypeScript + Bun。変更なし | 既存ツールチェーン(plugins/formal-model-check/tools/*.ts)の拡張であり、新規ランタイムを要しない(NFR-4) |
| TS-2 | **新規外部依存なし**: bun.lock に差分を出さない。語彙解決・regex 構築・byte 照合は全て標準ライブラリ/既存ユーティリティ(`sameBytes`、zod スキーマ既存分)で実現 | NFR-4。business-logic-model §9.2「新規外部依存なし」 |
| TS-3 | **語彙のデータ源は model-map.json(宣言 JSON)**。コード内定数への語彙保持は廃止し、設定ライブラリ・外部ストアは導入しない | BR-V1 / BR-V2, ADR-5 / ADR-6。loader 検証済み宣言という既存の信頼経路を再利用するため、新たな配布・取得機構は不要 |
| TS-4 | **生成ツリー(dist/ 等)は `bun scripts/package.ts` 再生成で追随**(手編集禁止) | requirements.md Constraints。Unit 末尾の定型手続き |

## 却下した選択肢

- **語彙用の設定フォーマット新設(YAML/別 JSON)**: map が既に u1 で vocabulary スキーマを受け入れるため、第二の源は BR-V1 違反(2箇所管理)になる。
- **語彙解決のキャッシュ機構**: 純粋関数かつ十数要素の配列処理(PERF-1)で、導入する性能上の動機がない。
