# Business Rules

## 目的

approval evidence の構造検査が満たすべき規則を、実装と eval の判定基準として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | `taskGeneration.status` が `passed` の項目は、`evidence` に `kind: approval` の項目を 1 件以上含む。含まない場合、validator は fail を返す。 | R004, UC005 | accepted |
| BR002 | `taskGeneration.status` が `ready_for_approval` の項目は、approval evidence を要求しない。 | R004, UC005 | accepted |
| BR003 | approval evidence の `path` が指す成果物の種類は限定しない。検査は `kind: approval` の実在だけを対象にする。 | [G001 GD002](../../grillings/G001-construction-judgments.md) | accepted |
| BR004 | 検査追加後も、既存の examples と `.amadeus/intents/**` は pass を維持する。 | R004 | accepted |
| BR005 | 検査の実装前に、失敗する eval を追加して RED を確認する。 | R004 | accepted |

## 例外

- `construction.bolts` が存在しない Intent は、この検査の対象外として扱う。

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
| PRE001 | 事前条件 | 検査対象の `state.json` が JSON として解釈できる。 | R004 | accepted |
| POST001 | 事後条件 | 承認 evidence なしの `passed` が構造検証を通過しない。 | R004 | accepted |
| INV001 | 不変条件 | 検査追加の前に pass していた成果物は、追加後も pass する。 | R004 | accepted |
| INV002 | 不変条件 | 検査は構造の実在だけを扱い、承認内容の妥当性判断はしない。 | R004 | accepted |

## 未確認事項

なし。
