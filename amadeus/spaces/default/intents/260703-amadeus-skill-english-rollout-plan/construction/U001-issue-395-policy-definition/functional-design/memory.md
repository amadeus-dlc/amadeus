# Memory: functional-design

## Interpretations

- U001 は #395 方針確定を扱う。
- B001 は walking skeleton であり、後続 Bolt が参照する英語化方針、対象範囲、検証方法、完了証拠の最小経路を通す。
- Issue #395 本文の旧配置名は、現行の `aidlc/` と `aidlc-state.md` の契約へ読み替える。

## Deviations

- UI はないため `frontend-components.md` は作成しない。
- 新しい実行時サービス、GitHub API クライアント、永続ストアは導入しない。

## Tradeoffs

- 言語ルール変更を B001 の PR に含めると #400 の前提は明確になるが、方針確定 PR の差分が大きくなる。
- 方針文書だけを B001 の PR にすると差分は小さいが、#400 着手前に言語ルール変更 PR が別途必要になる可能性がある。

## Open questions

- #395 対応 PR の最小差分を、方針文書、Issue 更新、言語ルール変更のどこまでにするかは Code Generation で確定する。
