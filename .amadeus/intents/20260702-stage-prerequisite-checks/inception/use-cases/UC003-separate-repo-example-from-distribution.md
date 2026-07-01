# UC003 repo 内代表例と配布対象 skill の説明を分ける

## ユースケース

Agent と Maintainer が、repo 内の Issue 関係を代表例として使いながら、配布対象 skill にはユーザー環境で参照できない Issue 番号前提を混ぜない。

## アクター

- ACT002 Agent
- ACT001 Maintainer

## 外部システム

- EXT001 GitHub

## 事前条件

- repo 内成果物では Issue #277 と Issue #272 の関係を参照できる。
- 配布対象 skill の説明は、このリポジトリの Issue 番号を前提にしない。

## 基本フロー

1. Agent は、repo 内成果物で Issue #277 と Issue #272 の関係を代表例として説明する。
2. Agent は、配布対象 skill では代表例を一般化した前提不成立として書く。
3. Agent は、source skill、昇格先成果物、host environment のどこで前提が崩れたかを一般説明にする。
4. Maintainer は、配布対象 skill に repo 内 Issue 番号前提が混入していないか確認する。

## 代替フロー

| 条件 | 扱い |
|---|---|
| repo 内 Issue 番号が配布対象 skill に必要以上に残る。 | Construction の検証またはレビューで修正対象にする。 |
| 代表例が現在 Intent の成功条件外へ広がる。 | `follow_up_issue_candidate` として扱う。 |

## 対応要求

- R005

## 未確認事項

- repo 内 Issue 番号前提の混入を eval で検出するかは Construction で確定する。
