# Business Rules

## 目的

phase PR 統合の policy 記述が満たすべき規則を、文書変更とレビューの判定基準として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 既定は phase ごとの PR である。統合は、3 条件をすべて満たす場合だけ選べる例外として書く。 | R001, [G001 GD002](../../../inception/grillings/G001-consolidation-judgments.md) | accepted |
| BR002 | 統合条件は、実行スコープが `refactor` または docs 系、変更対象が文書だけ（実装コードとテストコードを含まない）、Ideation の未確定事項が事前の grilling または Issue の確定判断で解消済み、の 3 件とする。 | R001 | accepted |
| BR003 | 統合できる範囲は仕様側（Discovery〜Inception）に限る。Construction 実装と finalization は従来どおり別 PR とする。 | R002, [G001 GD001](../../../inception/grillings/G001-consolidation-judgments.md) | accepted |
| BR004 | 仕様側統合 branch の命名は `codex/issue-<n>-specification` とし、既存の `codex/issue-<n>-<phase>` と並ぶ例として書く。 | R002 | accepted |
| BR005 | 統合 PR の説明には、含まれる phase 成果物の一覧と各 phase の gate 状態を明記する。 | R003 | accepted |
| BR006 | gate の判定は phase ごとに `state.json` で行い、PR の統合が gate の統合を意味しないことを明記する。 | R003 | accepted |
| BR007 | 統合の対象は仕様成果物（`.amadeus/**` の文書）であり、skill 変更を含む PR は粒度制約に従う（統合の対象外）ことを明記する。 | R004 | accepted |
| BR008 | development.md の PR 準備条件は、統合 PR では含まれる各 phase の成果物に適用されることが読める。 | R004 | accepted |

## 例外

- 統合 branch の途中で grilling が必要な未確定事項が見つかった場合は、統合条件を満たさなくなるため、その phase までで PR を区切り、以降は既定に戻る。

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
| PRE001 | 事前条件 | 統合 PR に含まれる各 phase の成果物が validator で pass している。 | R003 | accepted |
| POST001 | 事後条件 | 統合しても phase ごとの gate 判定と validator の state 検証が成立する。 | R003 | accepted |
| INV001 | 不変条件 | Construction 実装と finalization は統合しない。 | R002 | accepted |
| INV002 | 不変条件 | 既存の phase ごとの PR 運用は引き続き有効である。 | R001 | accepted |

## 未確認事項

なし。
