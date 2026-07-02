# Business Rules

## 目的

雛形生成スクリプトが満たすべき規則を、実装と eval の判定基準として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 各遷移の実行直後に validator を実行しても、`state.json` に起因する構造 fail が出ない。 | R001, UC002 | accepted |
| BR002 | 更新は対象遷移が定義する項目だけを設定し、既存の値、他 phase のブロック、evidence を変更しない。 | R002, UC001 | accepted |
| BR003 | 同じ遷移を同じ引数で再実行しても、結果の `state.json` は変わらない（冪等）。 | R002, UC001 | accepted |
| BR004 | 必須成果物配列と evidence には、実在するファイルの相対パスだけを含める。 | R001, R002 | accepted |
| BR005 | スクリプトは `skills/amadeus-validator/scripts/` に置き、同じ skill 内の生成済み契約（`validator/generated/**`）だけを import する。repo root の開発用スクリプトを参照しない。 | R003, [G001 GD001](../../../inception/grillings/G001-script-placement.md) | accepted |
| BR006 | 不正な遷移種別または不足した補助引数では、利用可能な遷移種別と引数を示して失敗する。 | R001, UC001 | accepted |
| BR007 | 検証は eval 先行（RED → GREEN）で進め、6 遷移の生成結果、冪等性、既存値保持、validator pass を固定入力で検証する。 | R005, UC002 | accepted |

## 例外

- `state.json` 以外の成果物（Markdown）に起因する validator fail は、雛形の責務外として扱う。

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
| PRE001 | 事前条件 | 対象 Intent のディレクトリが存在する。`intent-capture` 以外では既存の `state.json` が JSON として解釈できる。 | R001 | accepted |
| POST001 | 事後条件 | 生成直後の validator が `state.json` に起因する構造 fail を出さない。 | R001 | accepted |
| INV001 | 不変条件 | 既存の値と前 phase の状態ブロックは変更されない。 | R002 | accepted |
| INV002 | 不変条件 | 同じ遷移の再実行は結果を変えない。 | R002 | accepted |

## 未確認事項

なし。
