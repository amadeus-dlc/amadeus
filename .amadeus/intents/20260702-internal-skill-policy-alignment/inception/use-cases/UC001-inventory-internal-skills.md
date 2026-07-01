# UC001: 内部 skill 構成を棚卸しする

## 概要

Agent は、Issue #284、README、skill ディレクトリを読み、Internal Skills 一覧と現在の `amadeus-*` skill 構成の差分を整理する。

## アクター

- ACT002 Agent

## 外部システム

- EXT001 GitHub

## 事前条件

- Issue #284 を参照できる。
- README と skill ディレクトリを参照できる。

## 基本フロー

1. Agent は Issue #284 の README 追加対象を読む。
2. Agent は `README.md` と `README.ja.md` の Internal Skills 一覧を読む。
3. Agent は `skills/amadeus-*` と `.agents/skills/amadeus-*` の構成を確認する。
4. Agent は README の一覧と実際の skill 構成の差分を整理する。

## 代替フロー

- source skill と昇格先成果物の構成がずれている場合は、Construction で昇格手順の確認対象にする。

## 対象要求

- R001
- R002

## 未確認事項

- `amadeus-*` 以外の内部 skill を README の Internal Skills に含めるかは対象外である。
