# Intent Backlog — Election CLI 多問対応

本 Backlog は [Intent Statement](../intent-capture/intent-statement.md) の成功条件と対象利用者を、実装可能な Proto-Unit へ分解したものである。

## Prioritization Method

MoSCoW で受入条件への必須度を示し、同じ Must 内では依存関係とリスク低減を優先する。WSJF は相対比較の補助値として、`(利用者価値 + 時間重要度 + リスク低減) / 作業規模` で算出する。依存先が未完了の項目は、WSJF が高くても先行させない。

## Prioritized Proto-Units

| 順位 | ID | Proto-Unit | MoSCoW | 価値 | 時間 | リスク低減 | 規模 | WSJF | 依存 |
|---:|---|---|---|---:|---:|---:|---:|---:|---|
| 1 | PU-1 | 問い識別子、ballot、保存形式、単問互換読み取り | Must | 10 | 8 | 10 | 5 | 5.6 | なし |
| 2 | PU-2 | 問い別 tally と部分成立・部分保留 | Must | 10 | 9 | 9 | 5 | 5.6 | PU-1 |
| 3 | PU-3 | 保留分抽出、部分再実行、CLI 契約 | Must | 9 | 8 | 8 | 5 | 5.0 | PU-1, PU-2 |
| 4 | PU-4 | 単問・多問・部分再実行の回帰検証 | Must | 9 | 9 | 10 | 4 | 7.0 | PU-1–PU-3 と並行 |
| 5 | PU-5 | 関連 bundled norm の縮約 | Must | 5 | 4 | 5 | 2 | 7.0 | PU-1–PU-4 |

## Proto-Unit Outcomes

### PU-1 — Multi-question Data Foundation

- Election と ballot が問い単位の識別子と裁定入力を保持する。
- 旧単問形式を読み取り、新規形式を追記型で保存する。
- 旧データを破壊的に書き換えない。

### PU-2 — Per-question Tally

- 各問いの choice・GoA・留保を tally に保持する。
- 成立と保留が同じ Election 内に共存できる。
- 全体の最悪 GoA だけへ丸めない。

### PU-3 — Hold-only Rerun and CLI

- 保留中の問いを機械的に抽出する。
- 成立済み結果を維持したまま保留分だけを再実行する。
- CLI の多問入力、結果表示、再実行が同一の問い識別子を使う。

### PU-4 — Compatibility and Scenario Verification

- 既存単問フローの回帰を検証する。
- 全問成立、全問保留、部分成立、再実行後成立を検証する。
- 保存と読み取りの往復で問い別裁定が失われないことを検証する。

### PU-5 — Norm Distillation

- 実装済みの問い別データ契約を根拠に、重複した bundled norm を特定する。
- 週次 distillation の既存経路で縮約し、必要な規範を失わない。

## Acceptance Traceability

| Issue #2813 の成果 | 対応 Proto-Unit |
|---|---|
| 問いごとの choice・GoA・留保を tally に保持 | PU-1, PU-2 |
| 部分成立と保留分のみの再実行 | PU-2, PU-3, PU-4 |
| 既存単問・保存データの後方読み取り、追記型維持 | PU-1, PU-4 |
| bundled norm の縮約 | PU-5 |

## Deferred Items

nice-to-have は設定しない。Issue #2813 が明示した能力はすべて Must であり、Out of Scope の項目は別 Issue または別 Intent でのみ扱う。
