# インテント：AI-DLC v2 への完全準拠

## 概要

Amadeus DLC の workspace 構造、状態、成果物を AI-DLC v2 の規定へ完全準拠させ、衝突は常に v2 を優先する。

## 依存

| 依存 | 理由 |
|---|---|
| なし | 再初期化後の最初の Intent であり、先行 Intent がないため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | 成果物契約と構造の準拠であり、利用者向け機能を追加しないため。 |
| scope | refactor | 振る舞い（ライフサイクルの意味論と全検証 green）を保存する構造変更のため。 |
| labels | aidlc-v2, contract | v2 準拠と契約変更の追跡用。 |
