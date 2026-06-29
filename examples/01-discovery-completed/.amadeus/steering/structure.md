# プロジェクト構造

この文書は、複数 Intent で共有するディレクトリ編成、命名、依存関係、コード構成の原則を扱う。

ファイルツリーの網羅ではなく、新しいファイルを置く判断に使うパターンだけを記録する。

## 編成方針

- Amadeus 成果物は `.amadeus/` 配下に置く。
- Discovery は `.amadeus/discoveries/` 配下に置く。
- Intent は、この Discovery では作成しない。

## ディレクトリパターン

| パターン | 場所 | 役割 | 例 | 状態 |
|---|---|---|---|---|
| Steering layer | `.amadeus/steering/` | 複数 Intent で共有する目的、方針、知識を扱う。 | `.amadeus/steering/objective.md` | 確認済み |
| Discovery layer | `.amadeus/discoveries/` | Intent 化前の入力テーマを整理する。 | `.amadeus/discoveries/20260629-ec-site-construction.md` | 確認済み |
| Intent layer | `.amadeus/intents/` | Intent ごとの状態、要求、設計、実施単位を扱う。 | `.amadeus/intents/20260629-minimum-purchase-flow/` | 段階に応じて利用 |

## 命名規約

| 対象 | 規約 | 例 | 状態 |
|---|---|---|---|
| Discovery ディレクトリ名 | `YYYYMMDD-<slug>` | `20260629-ec-site-construction` | 確認済み |
| Intent ディレクトリ名 | `YYYYMMDD-<slug>` | `20260629-minimum-purchase-flow` | 確認済み |

## 依存関係の整理

- Discovery は steering layer を参照する。
- Intent は Discovery の recommended 候補から初期化する。
- この例では、最初の Intent として販売管理の最小購入フローを扱う。

## コード構成原則

- 未確認
