# R003: 副作用禁止と `scaffold-only` 差分

## 要求

- `dry-run` は `.amadeus/discoveries.md` を更新しない。
- `dry-run` は `.amadeus/discoveries/<discovery-id>.md` と `.amadeus/discoveries/<discovery-id>/state.json` を作らない。
- `dry-run` は `grillings.md` を作らない。
- `dry-run` は `.amadeus/intents/**` を更新しない。
- `dry-run` は GitHub Issue を作らない。
- `dry-run` は `amadeus-ideation` を自動実行しない。
- `dry-run` は読み取り専用 mode であり、`scaffold-only` は質問しない成果物作成 mode であることを説明している。

## 受け入れ条件

- `dry-run` の禁止する副作用が skill 本文で説明されている。
- `dry-run` と `scaffold-only` の差分が mode 説明として読める。
- `scaffold-only` の既存責務を読み取り専用へ変更していない。

## 根拠

- [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272)
- [decisions.md](../../ideation/decisions.md)
- [codebase-analysis.md](../codebase-analysis.md)

## 未確認事項

- 読み取り専用性を text contract だけで見るか、実行前後の差分検証も追加するかは Construction で確認する。
