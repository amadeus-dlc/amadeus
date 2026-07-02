# Construction 判断

## 一覧

| 識別子 | タイトル | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|---|
| D001 | Functional Design scope | U001 の Functional Design を必須にし、UI 構成なしとして core 3 文書を作る。判定条件の検出範囲、待ち理由の形式、スクリプト契約、並び順、0 件文言を確定する。 | accepted | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Functional Design の設計判断が Task 分解と実装の前提であるため。 |

## Domain Map と Context Map

| 対象 | 判断 | 根拠 |
|---|---|---|
| Domain Map | 更新しない | U001 は既存の BC001 自己開発運用内の運用手段（承認待ちの可視化）の追加であるため。 |
| Context Map | 更新しない | 新しい Bounded Context 間依存は採用しないため。 |
