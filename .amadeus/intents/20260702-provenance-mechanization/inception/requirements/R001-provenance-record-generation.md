# R001 provenance 記録の生成

## 要求

作業実行の事実（build workspace と target workspace の path と commit、host environment の識別情報、target artifacts の対象範囲、利用した昇格済み skill / validator / 開発用スクリプトの path、commit、md5、stage 判定の根拠、人間による次回 stage0 採用判断の有無）を実測して、対象 Intent 直下の `provenance/` に機械可読 JSON として出力できる。出力だけで `.amadeus/steering/policies.md` の最低記録項目を満たせる。人間は値を手書きしない。

## 背景

現在はエージェントが `.amadeus/development.md` の「stage と workspace 対応記録」に従い、traceability や decisions へ手書きで provenance を記録している。実例（`.amadeus/intents/20260629-self-dev-steering-layer/ideation/traceability.md`）では commit と md5 が手書きで転記されており、値が実測と一致するかを機械的に確認する手段がない。もっともらしく間違った値でも、validator は成果物構造だけを検査するため pass する。

## 受け入れ条件

- `provenance:generate` が git コマンドとファイルハッシュで実測し、policies.md の最低記録項目 9 項目に対応する値をすべて出力する。
- 出力先は対象 Intent 直下の `provenance/` ディレクトリであり、実行単位の JSON を累積する。
- 出力された JSON だけで policies.md の最低記録項目を満たせる。人間が値を手書きする手順を必要としない。

## 依存

なし。

## 対応する対象境界

- SC-IN-001
- SC-IN-002

## 未確認事項

- JSON スキーマの項目の詳細型と命名、`provenance/` 配下のファイル命名規則は Construction の Functional Design で確定する。
