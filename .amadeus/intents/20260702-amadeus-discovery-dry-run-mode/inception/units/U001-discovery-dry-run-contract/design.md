# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、`amadeus-discovery dry-run` の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- `amadeus-discovery` の mode 説明に `dry-run` を追加する。
- `dry-run` を読み取り専用の Intent 候補表示 mode として説明する。
- 入力対象、出力項目、判定案、recommended 候補、推奨次アクションを skill 本文へまとめる。
- `dry-run` と `scaffold-only` の差分を、読み取り専用と質問しない成果物作成の違いとして説明する。
- `amadeus-history-review` と `amadeus-learning-review` は入力候補として扱い、`dry-run` は過去分析と学習分類を所有しない。

## 責務境界

- 所有するもの: 候補表示、既存成果物との関係整理、判定案、根拠、未確認事項、推奨次アクション。
- 所有しないもの: Discovery 成果物作成、Intent Record 作成、GitHub Issue 作成、`amadeus-ideation` 自動実行、過去分析本体、学習分類本体。
- 依存してよいもの: `.amadeus/` 成果物、GitHub Issue、PR、validator 結果、evaluator 結果、CI 結果、`amadeus-history-review` 結果、`amadeus-learning-review` 結果。
- 後続で再確認が必要になる条件: 機械向け JSON 出力が必要になる場合、`dry-run` が内部 skill を直接起動する判断になる場合。

## 構成候補

- dry-run input resolver
- existing artifact relation reader
- intent candidate classifier
- candidate recommendation presenter
- no side effect boundary
- review result consumer

## データと契約候補

- 入力候補: 入力テーマ、探索対象、GitHub Issue、PR、validator 結果、evaluator 結果、CI 結果、過去分析結果、学習分類結果。
- 出力候補: 入力テーマ、既存 Discovery との関係、既存 Intent との関係、Intent 候補、分類、根拠、未確認事項、判定案、recommended 候補、推奨次アクション。
- 状態候補: 候補あり、既存 Intent 更新候補、調査のみ、Intent 不要、判断未定。
- 事前条件候補: `.amadeus/` の steering layer が存在する。
- 事後条件候補: 候補表示が返る。
- 不変条件候補: `dry-run` は `.amadeus/` 成果物、GitHub Issue、Intent Record を作らず、`amadeus-ideation` を自動実行しない。

## 検証観点

- skill 本文に `dry-run` mode が含まれている。
- skill 本文に入力対象と出力項目が含まれている。
- skill 本文に副作用禁止が含まれている。
- skill 本文に `scaffold-only` との差分が含まれている。
- skill 本文に過去分析と学習分類を所有しないことが含まれている。

## Bolt 分割方針

- B001 で `amadeus-discovery` の `dry-run` mode 契約を更新する。

## Construction への引き継ぎ

- Domain Design で確定する事項: なし。
- Logical Design で確定する事項: 出力項目、判定案、recommended 候補、推奨次アクションの表現。
- 実装時に確認する事項: `dry-run` が内部 skill を直接起動するか、結果を入力として受け取るだけにするか。
- 検証時に確定する事項: source skill、昇格先成果物、text contract、validator の結果。
