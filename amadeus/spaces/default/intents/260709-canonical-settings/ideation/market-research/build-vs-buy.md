# Build vs Buy — 設定の型定義・validation の調達判断

> 上流入力: `../intent-capture/intent-statement.md`(成功指標: TypeScript の型と validation が存在しテストで検証される)。本判断は既決規範に大きく拘束されるため、選択肢と拘束を明示した上で推奨を示す。

## 選択肢の評価

| 選択肢 | 内容 | 評価 |
|---|---|---|
| Buy/Adopt: スキーマライブラリ | zod / valibot / ajv(JSON Schema)等を導入し型+検証を宣言 | **既定で不採用**。project.md「NEVER add runtime dependencies to the shipped framework without documenting why the user-side Bun-only premise changes」に抵触。導入するなら NFR に根拠を明示する例外手続きが必要 |
| Build: 手書き TS 型+バリデータ | TypeScript の型定義+小さな検証関数(パース関数)を自作 | **推奨**。初期スキーマは interactionModes 1 セクションと小さく、手書きの限界コストが低い。functional-domain-modeling-ts 決定(型+コンパニオン、スマートコンストラクタ、判別ユニオン Result)にそのまま載る。フレームワークの既存 tools(amadeus-*.ts)と同じ zero-dep 流儀 |
| Hybrid: JSON Schema を成果物として生成 | 検証は手書き、エディタ補完用 JSON Schema を後日生成・同梱 | 将来オプション。本 intent では必須にしない(受け入れ条件外)。設計ステージで拡張余地として言及可 |

## 判断と根拠

**Build(手書き TS 型+パース関数)を推奨する。**

1. **既決規範との整合** — 出荷フレームワークへの runtime 依存追加は Forbidden(project.md)。buy 案はこの規範の例外承認なしに成立しない。
2. **規模の釣り合い** — 初期スコープ(選挙 Q2=A: 設定基盤のみ、interactionModes 4 キー+既定値+エラー方針)に対し、スキーマライブラリの一般性は過剰。inception ルールの reuse inventory / 規模正当化にも適う。
3. **スタイル整合** — parse-don't-validate をブランド型+スマートコンストラクタで実装する流儀はプロジェクトの DECIDED 事項であり、手書きバリデータはその自然な適用先。
4. **検証可能性** — 成功指標(Q4=A: 失敗ケース注入の落ちる実証)は自作バリデータでも bun test で完全に実施可能。既存の t92 等センサーテストと同じ検証様式が使える。

## 発見事項の処理(棚卸しトリガー)

選挙 Q3=A により、既存ハーネス別設定の棚卸しは後続ステージ(reverse-engineering / requirements)で実施し、canonical へ移すべき項目が見つかれば GitHub Issue として起票する(本 intent では移行しない)。build-vs-buy の観点からの追加発見はここには含めない。
