# D001: Functional Design scope

## 背景

U001 承認待ちキュー一覧契約は、Inception の Unit Design Brief で走査、判定、整形、手順、検証の構成候補まで確定しており、Construction の入口で待ち理由の文言写像、スクリプト契約、並び順、0 件文言、`status: waiting_approval` の扱いが未確定として残っていた。

## 判断

U001 の Functional Design を必須（`requirement: required`、`frontendSurface: absent`）にし、core 3 文書を作成する。
次を Functional Design で確定した。

- 判定条件は 3 つ（phase gate の `waiting_approval`、top-level と phase ブロックの `status: waiting_approval`、`taskGeneration.status` の `ready_for_approval`）。`status` の扱いは [G001 GD001](../grillings/G001-status-waiting-approval-detection.md) の確定判断による（BR001）。
- 待ち理由は「`<フィールドパス>` が `<値>`」形式（BR003）。
- スクリプトは `skills/amadeus-validator/scripts/GateQueueList.ts`、CLI は第 1 引数 workspace（BR006）。
- 並び順は Intent ID 辞書順、phase 順、Bolt ID 昇順（BR004）。
- 0 件時は「承認待ちはありません。」で exit 0（BR005）。
- 解釈不能な `state.json` は stderr 警告のうえ読み飛ばす（BR007）。

## 理由

判定語彙の定義元（契約カタログと validator の語彙）と同梱スクリプトの先例が既存コードに確立しており、Functional Design はそれらへの準拠として確定できるため。

## 影響

B001 の Task 分解はこの設計を根拠にする。
Domain Map と Context Map は更新しない（BC001 既存境界内の運用手段の追加）。
