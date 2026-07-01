# R003: workspace 対応記録

## 要求

- build workspace、host environment、target workspace、target artifacts の対応記録先が決まっていること。
- 後続 Intent で利用した skill、validator、開発用スクリプト、stage 判定を追跡できること。

## 受け入れ条件

- build workspace の path と commit を記録できる。
- target workspace の path と commit を記録できる。
- 利用した昇格済み skill、validator、開発用スクリプトを記録できる。
- stage 判定の根拠と人間の stage0 採用判断の有無を記録できる。

## 根拠

- [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233)
- [development.md](../../../../development.md)
- [policies.md](../../../../steering/policies.md)

## 未確認事項

- machine-readable evidence 形式を導入するかは、この Intent では確定しない。
