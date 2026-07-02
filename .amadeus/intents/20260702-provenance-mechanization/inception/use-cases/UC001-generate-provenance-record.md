# UC001 作業実行後に provenance 生成を実行する

## ユースケース

Agent が作業実行後に `provenance:generate` を実行し、実測された JSON 記録を確認してそのままコミットする。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- 対象 Intent のディレクトリが存在する。
- build workspace と target workspace で git コマンドとファイルハッシュ計算が実行できる。

## 基本フロー

1. Agent は、成果物作成、実装、検証などの作業を完了する。
2. Agent は、対象 Intent を指定して `provenance:generate` を実行する。
3. スクリプトは、build workspace と target workspace の path と commit、host environment の識別情報、target artifacts の対象範囲、利用した昇格済み skill / validator / 開発用スクリプトの path、commit、md5、stage 判定の根拠、人間による次回 stage0 採用判断の有無を実測する。
4. スクリプトは、実測値を対象 Intent 直下の `provenance/` に機械可読 JSON として出力する。
5. Agent は、出力された JSON を確認し、値を手書きで修正せずそのまま成果物の変更に含める。

## 代替フロー

| 条件 | 扱い |
|---|---|
| 対象 Intent ディレクトリが存在しない。 | スクリプトは失敗し、対象 Intent を指定するよう示す。 |
| 人間による次回 stage0 採用判断がまだ行われていない。 | 未判断であることを示す値を出力する。 |

## 対応要求

- R001

## 未確認事項

- なし。
