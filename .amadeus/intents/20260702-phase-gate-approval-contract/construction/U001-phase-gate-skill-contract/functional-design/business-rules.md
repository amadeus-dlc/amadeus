# Business Rules

## 目的

phase gate の skill 契約が満たすべき規則を、実装とレビューの判定基準として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 実装実行は `taskGeneration.status` が `passed`（人間承認済み）の場合だけ実装へ進む。`ready_for_approval` では実装せず停止する。 | R001, UC002 | accepted |
| BR002 | `passed` への遷移は人間承認の後だけ行い、同時に `evidence` へ `kind: approval` の項目を追加する。 | R001, UC001 | accepted |
| BR003 | 前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出しに「<現在 phase> で判断する」を含む項目が 1 件以上残っている場合、decision review の outcome を `grill_required` とする。 | R002, UC003, [G001 GD001](../../grillings/G001-construction-judgments.md) | accepted |
| BR004 | トリガーの判定規則の定義は `amadeus-decision-review` に 1 箇所だけ置き、3 つの phase skill（ideation、inception、construction）の Decision Review 節はその規則を参照する。 | [G001 GD001](../../grillings/G001-construction-judgments.md) | accepted |
| BR005 | 後続 phase へ送る未確定事項は「〜は <phase> で判断する。」の形で書く。 | R002 | accepted |
| BR006 | scaffold-only は、GitHub Issue の確定判断、Grilling Decision Trail、Discovery Brief の確定済み判定と候補判断の 3 種への参照が入力に実在し、Ideation の判断項目がそこから導ける場合だけ許可する。 | R003, UC004 | accepted |

## 例外

- 調査（既存成果物、実データの確認）で解消できる未確定事項は、解消した根拠を記録すれば質問を省略できる。残った項目だけを一問ずつ確認する。

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
| PRE001 | 事前条件 | `passed` へ遷移する前に、対象 Bolt の `tasks.md` が実装へ渡せる粒度で存在する。 | R001 | accepted |
| PRE002 | 事前条件 | トリガー判定の前に、前段 phase の必須成果物が読める。 | R002 | accepted |
| POST001 | 事後条件 | 人間承認なしに実装実行へ進めない。 | R001 | accepted |
| INV001 | 不変条件 | `passed` は人間承認済みを意味し、`kind: approval` の evidence と常に対になる。 | R001, R004 | accepted |
| INV002 | 不変条件 | GitHub 上のファイルパスまたはコード参照は commit SHA 付き permalink を使う。 | [Intent 20260702-reference-link-policy](../../../../20260702-reference-link-policy.md) | accepted |

## 未確認事項

なし。
