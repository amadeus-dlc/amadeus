# インテント：内部 skill の対象範囲と暗黙起動ポリシー整合

## 概要

内部 skill の対象範囲と暗黙起動ポリシーを揃える。

## 依存

| 依存 | 理由 |
|---|---|
| なし | Issue #284 の recommended 候補は、現在の skill ディレクトリと README の差分を整理するため、既存 Intent の完了を前提にしない。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | Amadeus の内部 skill 一覧と暗黙起動ポリシーを整合させる技術目標である。 |
| scope | refactor | 既存 skill の責務を変えず、README と設定の整合を扱う。 |
| labels | internal-skill, readme, policy, self-development, issue-284 | 内部 skill、README、暗黙起動ポリシー、自己開発を表す。 |

## 目的

内部 skill として扱う対象を整理し、`README*.md` の Internal Skills 一覧と `policy.allow_implicit_invocation = false` の設定対象を揃える。

この Intent は [Issue #284](https://github.com/amadeus-dlc/amadeus/issues/284) と [Discovery 20260702-internal-skill-forge-readme-alignment](../discoveries/20260702-internal-skill-forge-readme-alignment.md) の recommended 候補を根拠にする。

## 成功条件

- `README.md` と `README.ja.md` を含む `README*.md` の Internal Skills 一覧が、現在の内部 skill 構成と照合されている。
- 内部 skill として扱う対象と、公開入口として扱う対象の判断基準が追跡できる。
- `policy.allow_implicit_invocation = false` を設定する対象が整理されている。
- Codex と Claude Code の両方で、暗黙起動を抑える設定の配置先が確認されている。
- `skill-forge` 監査と `SKILL.md` 英語化を後続候補として分離する理由が追跡できる。
- 関連する validator または構造確認が実行され、結果を後続 phase へ渡せる。

## 範囲

含めるもの:

- `README*.md` の Internal Skills 一覧。
- `skills/amadeus-*` と `.agents/skills/amadeus-*` の内部 skill 判定。
- 内部 skill の暗黙起動ポリシー設定対象。
- Codex と Claude Code の設定ファイルまたは生成物の配置確認。
- `skill-forge` 監査と `SKILL.md` 英語化を後続候補として分離する判断。

含めないもの:

- `skill-forge` による全 `amadeus-*` skill の内容監査。
- `SKILL.md` の英語化。
- skill 本文の大規模な責務変更。
- 新しい内部 skill の追加。
- validator を意味検証エンジンへ拡張すること。
- Inception の前に Requirement、Use Case、Unit、Bolt、Task を作ること。
