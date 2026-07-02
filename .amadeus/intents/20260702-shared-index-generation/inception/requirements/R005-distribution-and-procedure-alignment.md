# R005 配布先実行と手順の整合

## 要求

生成入口が配布先ユーザー環境（repo root の開発用スクリプトなし）で動作し、共有インデックスを更新する skill 手順とテンプレートが再生成前提に更新される。

## 背景

grilling の確定判断 GD002 により、生成入口は validator 同梱 scripts に置く。
`StateScaffold.ts` で確立した同梱スクリプトと promote の方式を再利用できる。
現状、`amadeus-ideation-intent-capture` と `amadeus-discovery` の手順はインデックスへの行の手書き追加を含み、steering テンプレートは手書き前提の index 雛形を持つ。

## 受け入れ条件

- 生成入口が `skills/amadeus-validator/scripts/` に置かれ、promote で昇格し、配布先ユーザー環境で `bun` から実行できる。
- `amadeus-ideation-intent-capture` と `amadeus-discovery` の手順が、行の手書き追加から「モジュールファイルへの記述 + 再生成の実行」へ更新される。
- steering テンプレートの index 雛形が、生成マーカー付きの形へ更新される。
- skill 変更は promote 手順で同期され、PR がレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従う。

## 依存

R002。

## 対応する対象境界

- SC-IN-003

## 未確認事項

- 手順を更新する skill の全リスト（intent-capture、discovery 以外に index を書く skill の有無）は、Unit Design Brief で確定する。
