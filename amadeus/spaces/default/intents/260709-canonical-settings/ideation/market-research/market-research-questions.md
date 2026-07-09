# Market Research — 明確化質問(canonical-settings)

> 判定: 本ステージの標準質問(競合・トレンド・build-vs-buy 等)は、(a) 調査で解決できる事実、または (b) 既決規範(project.md「NEVER add runtime dependencies to the shipped framework without documenting why」等)のいずれかに帰着し、**ユーザー/選挙に問うべき未決の意思決定は検出されなかった**。no-election-for-decided-norms 学習に従い選挙は実施せず、各質問には調査結果ベースの回答を根拠付きで記入する。上流入力: `../intent-capture/intent-statement.md`。

## Q1. 競合・比較対象となるソリューションは何か?

[Answer]: (調査で解決)本 intent は内製フレームワークの設定基盤であり市場競合は存在しない。比較対象は「開発ツールの canonical 設定ファイル方式」のデザインパターン群: TypeScript `tsconfig.json`(JSONC+階層 extends)、Biome `biome.json`(JSON+JSON Schema)、ESLint flat config(JS モジュール)、VS Code `settings.json`(JSONC+スキーマ)、Deno `deno.json`、Bun `bunfig.toml`、Prettier(cosmiconfig 多形式発見)。詳細は competitive-analysis.md

## Q2. それぞれの強み・弱みは何か?

[Answer]: (調査で解決)単一形式+スキーマ検証(Biome/tsconfig 型)は予測可能性と doctor 型診断に強く、多形式発見(cosmiconfig 型)は導入自由度と引き換えに置き場所の不確定性・ドリフトを生む — 本 intent の問題定義(ドリフト排除)は前者を支持する。詳細は competitive-analysis.md

## Q3. 関連する業界トレンド・規制シフトはあるか?

[Answer]: (調査で解決)規制は該当なし。トレンドは (1) スキーマ検証付き設定(JSON Schema Store 収載が事実上の標準)、(2) 多形式発見からの回帰(単一 canonical パス化)、(3) 型付き設定ローダー(parse-don't-validate)、(4) AI ハーネスのツール別設定ディレクトリ(.claude/ 等)の定着 — Amadeus はまさにそのハーネス別設定からの独立を図る位置。詳細は market-trends.md

## Q4. テーブルステークス(当然期待)と差別化要素は何か?

[Answer]: (調査で解決)テーブルステークス: 決まったパス・1形式・既定値・不備時の明確なエラー。差別化(Amadeus 文脈での価値): ハーネス中立(N ハーネスで同一 semantics)、doctor 統合、space 単位のスコープ。intent-statement.md の成功指標と整合

## Q5. 既存ツール・OSS 代替(buy/adopt)はあるか? build-vs-buy の判断は?

[Answer]: (既決規範+調査で解決)validation を外部ライブラリ(zod/valibot/ajv 等)に buy する案は、project.md の「NEVER add runtime dependencies to the shipped framework(Bun-only 前提)」により既定で不採用。設定スキーマは小規模(初期は interactionModes 1 セクション)で、手書き TS 型+バリデータ(build)が既存の functional-domain-modeling-ts 決定(ブランド型+スマートコンストラクタ+判別ユニオン Result)にも整合する。詳細は build-vs-buy.md

## Q6. 対象市場規模・オーディエンスは?

[Answer]: (調査で解決)外部市場なし。オーディエンスは intent-statement.md の両受益者 — フレームワーク保守チームと amadeus 導入チーム(全ハーネス利用者)。規模の議論は本 intent には不要
