# Competitive Analysis — 開発ツールの canonical 設定方式

> 上流入力: `../intent-capture/intent-statement.md`(問題定義: canonical 設定置き場の欠落による3形式ドリフト)。本 intent に市場競合は存在しないため、「比較対象」は他の開発ツールが採る設定ファイル設計パターンとする。出典は各ツールの公式ドキュメント(名称併記)。

## 比較対象と方式

| ツール | 設定ファイル | 形式 | 検証 | 既定値の扱い |
|---|---|---|---|---|
| TypeScript | `tsconfig.json` | JSONC(コメント可) | コンパイラ内蔵(未知キー警告・型不一致エラー) | 省略時は文書化された既定値。`extends` で階層合成 |
| Biome | `biome.json` | JSON | 同梱 JSON Schema+CLI 検証 | 全キー省略可、既定値内蔵 |
| ESLint (v9) | `eslint.config.js` | JS/TS モジュール | 型定義+実行時検証 | コードなので合成自由。ただし「実行可能設定」は再現性・静的解析性が弱い |
| VS Code | `settings.json` | JSONC | スキーマベースの補完+警告(不明キーは無視) | 既定値はスキーマに内蔵 |
| Deno | `deno.json` | JSON(C) | 内蔵スキーマ検証 | 既定値内蔵 |
| Bun | `bunfig.toml` | TOML | 実行時に解釈(緩い) | 既定値内蔵 |
| Prettier | `.prettierrc(+多形式)` | JSON/YAML/JS/TOML ほか | ライブラリ検証 | cosmiconfig による多形式・多所探索 |

## 強み・弱みの分析

- **単一形式+固定パス+スキーマ検証**(Biome、Deno、tsconfig): 置き場所が常に1つで、doctor 型の診断・エディタ補完・CI 検証が作りやすい。弱みは表現力(コメント・条件分岐)が形式に縛られること。JSONC はコメント許容で JSON の硬さを緩和する中間解。
- **実行可能設定**(ESLint flat config): 合成・条件分岐が自由だが、静的検証・安全な機械読み取り(実行せずに読む)ができない。Amadeus の設定は hooks/tools(bun スクリプト)とエンジンの双方が安全に読む必要があり、実行可能設定は不適。
- **多形式・多所探索**(Prettier/cosmiconfig): 導入の摩擦は低いが「どこに何形式であるか」が環境依存になり、本 intent が解こうとするドリフト問題をツール内部に抱え込む形。反面教師として重要。

## 本 intent への示唆

intent-statement.md の問題定義(3形式ドリフトの排除・同一設定体験)に照らすと、比較群の中で成功しているパターンは一貫して「**固定パス・単一形式・スキーマ内蔵既定値・ツール内蔵検証**」の組である(Biome/Deno/tsconfig 型)。多形式探索と実行可能設定はいずれも本 intent の目的と矛盾する。形式の最終決定(JSON か JSONC か等)は設計ステージの決定事項として持ち越すが、市場観察としては「機械が書き戻す可能性のある設定は JSON、人間が主に編集する設定はコメント可能な JSONC」という使い分けが観測される。
