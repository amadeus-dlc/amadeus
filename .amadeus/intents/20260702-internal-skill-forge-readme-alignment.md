# 内部 skill と README の skill-forge 確認

## 概要

`amadeus-*` skill を `skill-forge` で確認し、README の skill 一覧と内部 skill の扱いをそろえる。

## 依存

| 依存 | 理由 |
|---|---|
| 20260702-stage-prerequisite-checks | `amadeus-*` skill の供給元、昇格先成果物、README の公開入口説明を区別して確認する必要があり、stage 前提確認の成果物を前提にするため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | `amadeus-*` skill の説明、公開入口、内部 skill の扱い、README の記述を確認する技術目標である。 |
| scope | refactor | 既存の skill 契約、README、昇格先成果物を確認し、互換性維持対象を暗黙に増やさず整合させる Intent である。 |
| labels | skill-forge, readme, internal-skill, skill-contract, compatibility, self-development | skill-forge、README、内部 skill、skill 契約、互換性、自己開発を表す。 |

## 目的

`amadeus-*` skill を `skill-forge` の観点で確認し、README の公開入口説明と内部 skill の扱いがずれないようにする。

この Intent は、入力テーマ「amadeus-* skill を skill-forge で確認する」と、指定識別子 `20260702-internal-skill-forge-readme-alignment` を根拠にする。

現時点では、指定された Discovery Brief `discoveries/20260702-internal-skill-forge-readme-alignment.md` は target workspace に存在しない。
そのため、この Ideation ではユーザー入力を Discovery Brief 相当の入力テーマとして扱う。

## 成功条件

- README に載せる公開入口 skill と、内部 skill として扱う `amadeus-*` skill の境界が説明できる。
- `skill-forge` で確認すべき観点が、trigger description、skill 本文、eval、Codex metadata、昇格先成果物に分けて整理されている。
- source skill と昇格先成果物の差分確認、昇格手段、検証入口が後続 phase へ渡せる。
- 互換性維持対象がない場合に、古い入口や別名を暗黙に残さない方針が説明できる。
- README の更新が必要な場合でも、README だけを直して skill 契約、validator、example とのずれを残さない。
- Inception で要求、受け入れ状態、必要な既存コード分析、Unit、Bolt を具体化できる。

## 範囲

含めるもの:

- README の Phase Skills、Cross-Cutting Support Skills、Internal Skills の分類確認。
- `skills/amadeus-*` と `.agents/skills/amadeus-*` の対応確認。
- `skill-forge` による `SKILL.md` の trigger description、本文構成、eval、Codex metadata の確認観点。
- 内部 skill を README にどう載せるか、または載せないかの判断。
- source skill と昇格先成果物の同期手段、検証入口、provenance の確認。
- 互換性維持対象が明示されていない場合に、旧入口、旧名、alias、互換層を追加しない判断。

含めないもの:

- `amadeus-*` skill の一括リライト。
- `skill-forge` 本体の変更。
- README 以外の docs 全面再構成。
- validator 契約の破壊的変更。
- example snapshot の一括再生成。
- `docs/backward-compatibility.md` に未記録の互換性維持対象を追加せずに互換層を作ること。
- Inception の前に要求、ユースケース、Unit、Bolt、Task、実装を作ること。

## 現在の phase

Ideation を開始する。

Inception では、README と `amadeus-*` skill の整合確認を要求、受け入れ状態、既存コード分析、Unit、Bolt に分解する。
