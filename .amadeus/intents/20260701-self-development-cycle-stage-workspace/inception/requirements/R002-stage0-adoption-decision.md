# R002: stage0 採用判断

## 要求

- stage2 を次回 stage0 として採用する条件と、人間による採用判断を追跡できること。
- stage2 は自動昇格せず、Maintainer の承認を必要とすること。

## 受け入れ条件

- stage2 を次回 stage0 として扱う条件が成果物から追跡できる。
- 対象 PR が基準 branch に merge 済みであることを確認できる。
- build workspace が merge 後の基準 commit を参照していることを確認できる。
- Maintainer が次回 stage0 として採用するかを判断した証拠を記録できる。

## 根拠

- [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233)
- [policies.md](../../../../steering/policies.md)
- [development.md](../../../../development.md)

## 未確認事項

- 採用判断の主記録先を `decisions.md`、`traceability.md`、PR 説明のどれにするかは Construction で確定する。
