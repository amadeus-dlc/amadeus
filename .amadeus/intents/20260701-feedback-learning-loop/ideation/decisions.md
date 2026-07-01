# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | 対象境界、実行スコープ、成果物深度、検証戦略を採用し Ideation を完了する。 | 採用 | なし | [D001-complete-ideation.md](decisions/D001-complete-ideation.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Ideation gate を通す判断であり、対象境界と scope 制御値を Inception へ渡すため。 |

## 採用した判断

- Issue #259 は、AI-DLC v2 における後段 feedback と Intent 横断学習を、Amadeus DLC の lifecycle contract として扱う。
- 依存 Intent は Issue #248 の `20260701-skill-execution-reporting` とする。
- Issue #257 は decision review と grilling 起動条件の標準化として関連づけるが、この Intent の責務とは分ける。
- Ideation では要求、Unit、Bolt、実装を作らず、対象、対象外、学習候補、初期モック、追跡、判断を確定する。

## 置き換えられた判断

なし。

## 再確認条件

- Inception で内部 skill を新設しない判断になった場合は、学習分類を phase skill 共通契約として扱う。
- Domain Map または Context Map への昇格条件が広すぎる場合は、Steering knowledge 候補へ戻す。
- Issue #257 の成果物が先に確定した場合は、decision review の起動条件を参照して traceability を更新する。
