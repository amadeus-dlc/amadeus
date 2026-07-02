# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、phase gate の skill 契約の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
skill 本文の最終文言と decision review への統合位置は Construction で確定する。

## 設計戦略

- 迂回路を主観条件の削除ではなく、客観条件への置き換えで塞ぐ。「質問不要で進められる」を確定判断の記録の実在に、「承認待ちでも進める」を `passed` だけの許可に置き換える。
- 禁止形ではなく肯定形で契約を書く。`ready_for_approval` で「停止して承認を待つ」行動と、承認後に「`passed` にして approval evidence を追加する」行動を手順として明記する。
- grilling 起動の判定を文言規約に固定する。前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出しで「<現在 phase> で判断する」を含む項目が 1 件以上残っていれば `grill_required` とする。
- 書き手側の記録規約（後続 phase へ送る項目は「〜は <phase> で判断する。」の形で書く）を同じ契約に含め、トリガーの空振りを防ぐ。
- 実装ゲートの両側（bolt-preparation の停止と implementation-execution の前提）を同じ変更単位で扱い、cycle が前へ進めない中間状態を作らない。

## 責務境界

- 所有するもの: implementation-execution の前提行、bolt-preparation の停止と承認手順、3 つの phase skill の decision review トリガー記述、ideation の auto 判定の scaffold-only 条件、記録規約の記述、promote 同期。
- 所有しないもの: validator の検査実装（U002）、承認内容の妥当性判断、Task Generation 以外のゲート、完了済み Intent 成果物の遡及修正。
- 依存してよいもの: `amadeus-decision-review` の outcome 契約、`state.json.construction.bolts[].taskGeneration` の既存構造、promote 手順、レビュー支援契約。
- 後続で再確認が必要になる条件: decision review の判断ノード契約が変わった場合、state.json の taskGeneration 構造が変わった場合（関連: Issue #311）。

## 構成候補

- 実装ゲート契約: implementation-execution の前提と bolt-preparation の停止・承認手順を扱う。
- grilling トリガー契約: 3 つの phase skill の decision review 記述と文言規約を扱う。
- scaffold-only 許可契約: ideation の auto 判定条件と確定判断の記録 3 種の定義を扱う。
- 昇格同期: source skill と昇格先成果物の promote 同期を扱う。

## データと契約候補

- 入力候補: `state.json.construction.bolts[].taskGeneration.status`、前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出し、入力テーマに含まれる確定判断の記録への参照。
- 出力候補: `passed` と `kind: approval` evidence の追加、`grill_required` の outcome、scaffold-only または guided の判定。
- 状態候補: `ready_for_approval`（停止して承認待ち）、`passed`（人間承認済み）。
- 事前条件候補: `tasks.md` が実装へ渡せる粒度で存在する。
- 事後条件候補: 人間承認なしに実装実行へ進めない。
- 不変条件候補: `passed` は人間承認済みを意味し、approval evidence と常に対になる。

## 検証観点

- 変更後の skill 本文を読み、迂回路 4 件（`ready_for_approval` での実装、停止行動の欠落、主観的な auto 判定、質問ゼロ通過）が塞がれていることを確認する。
- 3 つの phase skill のトリガー記述が同じ文言規約を参照していることを確認する。
- promote 同期を `npm run test:it:promote-skill` と標準検証で確認する。
- skill 変更 PR の挙動差分要約で、変更前後のゲート挙動の違いを説明する。

## Bolt 分割方針

- B001 で実装ゲートの契約（implementation-execution と bolt-preparation）を変更し、promote で同期する。
- B002 で grilling トリガーと scaffold-only 条件の契約（ideation、inception、construction、decision-review）を変更し、promote で同期する。

## Construction への引き継ぎ

- 文書変更で確定する事項: 各 skill 本文の最終文言、decision review トリガーの記述位置（`amadeus-decision-review` の判断ノード表への統合、または各 phase skill の Decision Review 節だけ）。
- 検証時に確定する事項: 変更対象 skill の eval（`skills/amadeus-*/evals/`）への反映要否。
- 記録規約の告知先: 記録規約が既存の書き手慣行と一致していることの確認と、契約文書上の置き場所。
