# Business Rules

## 目的

共有インデックスの再生成と不整合検査が満たすべき規則を、実装と検証の判定基準として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 同じ配下モジュールと `state.json` から、常に同じ内容の `intents.md` と `discoveries.md` が生成される（決定論、冪等）。 | R002, UC001 | accepted |
| BR002 | 生成される表の列構成は現行と同じにする。`intents.md` の一覧は識別子、概要、依存、詳細、依存関係表はインテント、依存、理由、`discoveries.md` の一覧は識別子、テーマ、状態、判定、推奨次アクション、詳細とする。 | R002 | accepted |
| BR003 | 概要と依存（理由付き）の定義元は Intent のモジュールファイルだけとする。`## 概要` は H1 直後に置き、本文 1 段落とする。`## 依存` は概要の次に置き、依存と理由の 2 列の表とする。 | R001, [G001 GD001](../../../inception/grillings/G001-index-generation-contract.md) | accepted |
| BR004 | 生成マーカーはファイル先頭の HTML コメント 1 行とし、生成物であることと編集先（配下モジュールと再生成スクリプト）を示す。Markdown の表示を壊さない。 | R003 | accepted |
| BR005 | スクリプトは `skills/amadeus-validator/scripts/` に置き、同じ skill 内だけを import する。repo root の開発用スクリプトを参照しない。 | R005 | accepted |
| BR006 | 行の並び順は識別子の辞書順とする。`YYYYMMDD-<slug>` 形式のため日付昇順、同日内は slug の辞書順になり、決定論的である。 | R002 | accepted |
| BR007 | 検証は実装より先に追加して RED を確認する。決定論性、冪等性、並行統合シナリオ、不整合注入の fail 化をケースに含める。 | R007, UC002, UC003 | accepted |
| BR008 | validator の不整合検査は生成ロジックの再利用で実装し、生成規則と検査規則を単一の実装に保つ。 | R004, UC003 | accepted |

## 例外

- 配下モジュール自体の構造不備（見出し契約違反）は、インデックスの不整合ではなくモジュール側の補修対象として報告する。

## 参照リンク方針

| 参照種別 | 表示 | リンク先 | 備考 |
|---|---|---|---|
| ID | Requirement ID、Use Case ID、Unit ID、Bolt ID など | 参照先成果物への Markdown リンク | 参照先が一意に決まる場合だけ扱う。 |
| 成果物名または workspace 内ファイルパス | 成果物名または相対パス | 参照元 Markdown から見た相対 Markdown リンク | 同一ファイル内アンカーは、見出し安定性がある場合だけ使う。 |
| GitHub 上のファイルパスまたはコード参照 | ファイルパスまたはコード位置 | commit SHA 付き permalink | branch URL で代替しない。 |
| PR番号 | PR #123 | GitHub Pull Request URL | PR を言及するときは URL を持つリンクにする。 |
| Issue番号 | Issue #123 | GitHub Issue URL | Issue を言及するときは URL を持つリンクにする。 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対象 workspace に `.amadeus/intents/` が存在する。各モジュールファイルが見出し契約を満たす。 | R001 | accepted |
| POST001 | 事後条件 | 生成直後の validator が、インデックスに起因する fail を出さない。 | R002, R004 | accepted |
| INV001 | 不変条件 | 再生成は配下モジュールファイルと `state.json` を変更しない。 | R002 | accepted |
| INV002 | 不変条件 | 同じ入力での再実行は出力を変えない。 | R002 | accepted |

## 未確認事項

なし。
