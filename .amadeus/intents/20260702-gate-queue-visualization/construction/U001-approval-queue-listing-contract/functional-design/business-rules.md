# Business Rules

## 目的

承認待ちキュー一覧の判定、出力、配布が満たすべき規則を、実装と検証の判定基準として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 承認待ちの判定条件は次の 3 つとする。(1) phase ブロックの `gate` が `waiting_approval`、(2) top-level または phase ブロックの `status` が `waiting_approval`、(3) `taskGeneration.status` が `ready_for_approval`。判定語彙は契約カタログと validator の定義を import して参照し、値を複製しない。 | R001, [G001 GD001](../../grillings/G001-status-waiting-approval-detection.md) | accepted |
| BR002 | 一覧は Intent、phase、ゲート、待ち理由の 4 列の Markdown 表とする。ゲート列は Ideation gate、Inception gate、Construction gate、Task Generation Gate（Bolt ID）のいずれかとする。 | R002, [Inception G001 GD002](../../../inception/grillings/G001-entry-placement-and-output-format.md) | accepted |
| BR003 | 待ち理由は「`<フィールドパス>` が `<値>`」の形式で根拠フィールドを決定論的に示す。同じ phase の複数根拠は 1 行に併記する。 | R002 | accepted |
| BR004 | 行の並び順は Intent ID の辞書順、同一 Intent 内は phase 順（ideation、inception、construction）、Bolt ID の昇順とし、決定論的にする。 | R002 | accepted |
| BR005 | 承認待ちが 0 件の場合は「承認待ちはありません。」を表示し、正常実行（exit 0）とする。 | R003 | accepted |
| BR006 | スクリプトは `skills/amadeus-validator/scripts/GateQueueList.ts` とし、CLI は `bun run GateQueueList.ts <workspace>` とする。同じ skill 内だけを import し、repo root の開発用スクリプトを参照しない。workspace 引数の欠落または不存在は exit 1、`.amadeus/intents` なしは対象外通知のうえ exit 0 とする。 | R004, [Inception G001 GD001](../../../inception/grillings/G001-entry-placement-and-output-format.md) | accepted |
| BR007 | JSON として解釈できない `state.json` は stderr へ警告して読み飛ばし、一覧全体は失敗させない。 | R002, UC001 | accepted |
| BR008 | 検証は実装より先に追加して RED を確認する。承認待ちあり（`examples/04-construction-design-ready` 相当）、承認待ち 0 件、決定論性（同一入力の再実行）をケースに含める。 | R005 | accepted |
| BR009 | 一覧は読み取り専用とし、`state.json` と Amadeus 成果物を変更しない。 | R002 | accepted |

## 例外

- Discovery の `state.json`（gate 語彙は `not_ready` と `passed`）は対象外とする。Issue #350 の対象は「複数 Intent の `state.json`」である。

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
| PRE001 | 事前条件 | 対象 workspace が存在する。 | R002 | accepted |
| POST001 | 事後条件 | 検出したすべての承認待ちが一覧に含まれ、承認待ちでないものは含まれない。 | R001, R002 | accepted |
| INV001 | 不変条件 | 同じ `state.json` の集合からの再実行は出力を変えない。 | R002 | accepted |
| INV002 | 不変条件 | 一覧の実行は `state.json` と Amadeus 成果物を変更しない。 | R002 | accepted |

## 未確認事項

なし。
