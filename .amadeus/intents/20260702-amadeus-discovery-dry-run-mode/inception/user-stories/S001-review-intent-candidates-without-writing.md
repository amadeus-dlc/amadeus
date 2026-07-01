# S001: 成果物を作る前に Intent 候補を確認する

## ストーリー

Maintainer と Agent は、Discovery 成果物や Intent Record を作る前に、既存成果物と外部参照から次に起こすべき Intent 候補を確認したい。

これにより、候補、分類、根拠、未確認事項、推奨次アクションを確認してから、成果物作成に進むかを判断できる。

## 受け入れ条件

- `dry-run` は候補表示だけを行う読み取り専用 mode として説明されている。
- `dry-run` は `.amadeus/` 更新、GitHub Issue 作成、Intent Record 作成、`amadeus-ideation` 自動実行を行わない。
- `dry-run` は既存 Discovery と既存 Intent との関係を表示できる。
- `dry-run` は recommended 候補と推奨次アクションを表示できる。

## 根拠

- [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272)
- [ideation.md](../../ideation/ideation.md)

## 未確認事項

- `dry-run` の出力形式に機械向け JSON を含めるかは Construction で確認する。
