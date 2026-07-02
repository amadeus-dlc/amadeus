# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、phase PR 統合契約の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
policy の最終文言と節の配置は Construction で確定する。

## 設計戦略

- gate を弱めずに往復を減らす。phase gate の判定単位（`state.json`）と PR の単位を分離し、gate はこれまでどおり phase ごとに判定したまま、PR だけを統合できるようにする。
- 統合は既定ではなく例外として定義する。既定は phase ごとの PR のままとし、3 条件すべてを満たす場合だけ統合を許可する（GD002）。
- 統合の切れ目を人間ゲートに合わせる。仕様側（Discovery〜Inception）と実行側（Construction 実装）の間には Task Generation Gate があり、ここで PR を分ける（GD001）。
- 契約は既存の Branch Lifecycle に追記し、記録の型は既存の例外記録に合わせる（GD003）。

## 責務境界

- 所有するもの: 統合条件と既定の記述、統合単位と branch 命名、統合 PR の記録項目、development.md の整合補正。
- 所有しないもの: phase gate の判定規則（ゲート契約の Intent の責務）、state.json の構造（雛形生成の Intent の責務）、skill 変更 PR の粒度制約（レビュー支援契約の責務）。
- 依存してよいもの: Git Branching Policy の既存節構造、例外記録の型、`ideation/scope.md` の実行スコープの語彙、StateScaffold による複数 phase の state 更新。
- 後続で再確認が必要になる条件: phase の構成が変わった場合、Task Generation Gate の位置が変わった場合。

## 構成候補

- 統合条件: 3 条件と既定の記述を扱う。
- 統合単位と命名: 仕様側 2 グループの境界と branch 命名の例を扱う。
- 記録項目: 統合 PR の説明に含める項目と gate 判定の独立を扱う。
- 整合補正: development.md の PR 準備条件の読み替えと粒度制約との関係を扱う。

## データと契約候補

- 入力候補: 対象 Intent の実行スコープ、変更対象の種別、未確定事項の解消状況。
- 出力候補: 統合可否の判定、統合 branch 名、統合 PR の記録項目。
- 状態候補: 統合許可、既定（phase ごとの PR）。
- 事前条件候補: 仕様側の各 phase 成果物が validator で pass している。
- 事後条件候補: 統合しても phase ごとの gate 判定と validator の state 検証が成立する。
- 不変条件候補: Construction 実装と finalization は統合しない。gate の判定は PR の単位に依存しない。

## 検証観点

- 変更後の policy を読み、統合条件、既定、単位、命名、記録項目が受け入れ条件どおりに読めることを突き合わせで確認する。
- development.md と粒度制約を読み、矛盾する記述が残っていないことを確認する。
- validator と標準検証の pass を確認する。

## Bolt 分割方針

- B001 で Git Branching Policy へ統合条件、単位、命名、記録項目を追記する。
- B002 で development.md の整合を確認し、必要な補正を行う。

## Construction への引き継ぎ

- 文書変更で確定する事項: 統合条件の最終文言、節の配置（PR 作成節の拡張か新しい小節か）、branch 命名例の追加位置。
- 検証時に確定する事項: development.md の補正の要否（読み替えで足りるか、明記が必要か）。
