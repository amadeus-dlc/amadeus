# Business Logic Model

## 目的

phase skill の人間ゲート（Task Generation 承認）と grilling 起動を、エージェントの自己判断に依存しない決定論的な契約として skill 本文に定義できるようにする。

## 対象 Unit

U001 phase gate の skill 契約。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | Bolt 準備で `tasks.md` を実装へ渡せる粒度まで整えたら `taskGeneration.status` を `ready_for_approval` にし、実装へ進まず停止して人間の承認を待つ。 | tasks.md、state.json | 停止と承認待ちの報告 | R001, UC001 |
| BL002 | 人間承認を得たら `taskGeneration.status` を `passed` にし、`evidence` へ `kind: approval` の項目を追加する。 | 人間の承認判断 | Approval Record | R001, UC001 |
| BL003 | 実装実行の起動時に `taskGeneration.status` を読み、`passed` の場合だけ実装へ進む。それ以外は停止して状態に応じた案内を返す。 | state.json の taskGeneration.status | Implementation Gate Judgment | R001, UC002 |
| BL004 | phase skill 起動時の decision review で、前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出しから「<現在 phase> で判断する」を含む項目を数え、1 件以上残っていれば outcome を `grill_required` とする。 | 前段 phase 必須成果物 | Trigger Judgment | R002, UC003 |
| BL005 | `amadeus-ideation` の auto 判定で、入力に確定判断の記録 3 種への参照が実在し、Ideation の判断項目がそこから導ける場合だけ scaffold-only を選ぶ。 | 入力テーマ、Discovery Brief、GitHub Issue、Grilling Decision Trail | Mode Judgment | R003, UC004 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| `state.json.construction.bolts[].taskGeneration.status` | 実装ゲートの判定に使う Task Generation Gate の状態。 | R001 |
| 前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出し | 決定論的トリガーの判定対象。 | R002 |
| 確定判断の記録への参照 | GitHub Issue の確定判断、Grilling Decision Trail、Discovery Brief の確定済み判定と候補判断。 | R003 |
| 人間の承認判断 | Task Generation Gate の承認または差し戻し。 | R001 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| Approval Record | `passed` と `kind: approval` evidence の組。 | 実装実行のゲート判定、validator の構造検査（U002） |
| Implementation Gate Judgment | 実装へ進む、停止して承認待ち、Bolt 準備へ戻るのいずれか。 | 実装実行の継続判断 |
| Trigger Judgment | `grill_required` または通常の decision review 継続。 | phase skill の grilling 起動 |
| Mode Judgment | scaffold-only または guided の選択と、参照した確定判断の記録。 | ideation の実行モード判定 |

## 未確認事項

なし。
