# UC001: README と skill 役割を棚卸しする

## 概要

Agent は、README の skill 分類と、実際に存在する `amadeus-*` skill の一覧を照合する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- Ideation が完了している。
- README と skill ディレクトリを読める。

## 基本フロー

1. Agent は README の Phase Skills、Cross-Cutting Support Skills、Internal Skills を読む。
2. Agent は `skills/amadeus-*` の一覧を取得する。
3. Agent は `.agents/skills/amadeus-*` の一覧を取得する。
4. Agent は README が公開入口中心の案内か、内部 skill 一覧として不足しているかを整理する。
5. Agent は互換性維持対象の有無を確認する。

## 代替フロー

- `docs/backward-compatibility.md` が存在する場合は、そこに記録された対象だけを互換性維持対象として扱う。

## 対象要求

- R001
- R004

## 未確認事項

- README に内部 skill を全列挙するかは Construction で判断する。
