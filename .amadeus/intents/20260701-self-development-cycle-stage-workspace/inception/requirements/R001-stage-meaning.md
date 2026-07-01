# R001: stage 判定語彙

## 要求

- stage0、stage1、stage2 の意味を、後続 Intent が参照できる形で説明できること。
- stage 判定は、build workspace、host environment、target workspace、target artifacts と混同せずに読めること。

## 受け入れ条件

- stage0、stage1、stage2 の説明が成果物から追跡できる。
- stage0 が作業開始時点の利用可能な skill、validator、開発用スクリプトを表すことが説明できる。
- stage1 が target workspace の作業中成果物とローカル検証結果を表すことが説明できる。
- stage2 が target workspace の昇格先成果物、example、validator がそろって通った状態を表すことが説明できる。

## 根拠

- [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233)
- [glossary.md](../../../../glossary.md)
- [policies.md](../../../../steering/policies.md)

## 未確認事項

- `CONTEXT.md` への stage0、stage1、stage2 の追加は、この Intent の対象外として後続判断に残す。
