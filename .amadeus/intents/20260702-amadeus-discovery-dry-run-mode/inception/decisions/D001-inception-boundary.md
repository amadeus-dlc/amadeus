# D001: Inception 境界

## 背景

Issue #272 は、`amadeus-discovery` に `dry-run` mode を追加することを求めている。

既存の `amadeus-discovery` には `dry-run` の入力境界がある。
一方で、`dry-run` は mode 一覧、出力項目、副作用禁止、`scaffold-only` との差分としてまだ十分に整理されていない。

## 判断

Inception では、`dry-run` を読み取り専用の Intent 候補表示 mode として要求化する。

要求、ユーザーストーリー、ユースケース、Unit、Bolt は、`dry-run` 契約と同期検証の範囲に限定する。
Discovery 成果物の構造変更、Intent Record 作成、GitHub Issue 作成、`amadeus-ideation` 自動実行、実装詳細、Task 生成は扱わない。

## 理由

Issue #272 の受け入れ条件は、読み取り専用 mode、出力項目、副作用禁止、`scaffold-only` 差分を確認できれば Inception へ分解できる。

既存の過去分析と学習分類の内部 skill は Issue #277 で整理済みであるため、この Intent では `dry-run` がそれらの結果を入力にできる consumer 境界へ集中できる。

## 影響

Construction では、`skills/amadeus-discovery/SKILL.md`、昇格先成果物、text contract、validator の確認へ進む。

`dry-run` の出力に機械向け JSON が必要になる場合は、Construction で未確認事項として扱う。
