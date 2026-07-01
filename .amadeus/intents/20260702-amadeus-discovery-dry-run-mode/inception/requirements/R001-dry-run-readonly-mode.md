# R001: `dry-run` 読み取り専用 mode

## 要求

- `amadeus-discovery` は、`dry-run` を実行 mode として説明している。
- `dry-run` は、入力テーマまたは探索対象から Intent 候補を表示する読み取り専用 mode として説明されている。
- `dry-run` は、Discovery 成果物を作る mode ではなく、次の skill を選ぶための候補表示として扱われている。

## 受け入れ条件

- `amadeus-discovery` の mode 説明に `dry-run` が含まれている。
- `dry-run` が読み取り専用であることが skill 本文から確認できる。
- `dry-run` から成果物作成へ進む場合は、人間が次の skill を明示することが説明されている。

## 根拠

- [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272)
- [scope.md](../../ideation/scope.md)
- [codebase-analysis.md](../codebase-analysis.md)

## 未確認事項

- `dry-run` を既定 mode に含めるか、明示指定時だけ使う mode にするかは Construction で確認する。
