# Application Design — 明確化質問(0問)

**Intent**: 260810-grilling-frontier-resync / **Stage**: application-design (2.6) / **Depth**: Standard

上流入力の消費: 0問判定の母集団は `requirements.md` の FR 22件から設計委譲2点(FR-PROTO-1 の識別手段 / FR-CONTRACT-4 のマーカー形)を抽出して確定した。判定根拠の既存マーカー慣行・行ピン stale 前例は codekb `component-inventory.md`(grilling 対話契約の棚卸し節)を、変更面が core 中立層に閉じることは codekb `architecture.md`(core/harness 境界)をそれぞれ参照した。

## 選挙不要判定(E-OC1 判定申告)

本ステージの設計判断は質問0問とする。根拠(1問1行):

- 骨格識別機構(FR-PROTO-1 の「行範囲 or マーカー」): 既存実装の流儀から一意 — 行ピンは stale 化の実測前例(cid:code-generation:allowlist-line-pin-stale)があり、リポジトリ既習のマーカー慣行(`<!-- amadeus-issue-form:v1 ... -->` / mirror-state センチネル)に合わせて begin/end マーカー方式を採用する執行判断(cid:requirements-analysis:c5 — 既存パターンに合わせる事項は問わない)。ADR-1 に代替案とともに記録。
- grilling モードマーカーの様式(FR-CONTRACT-4): 同上 — 既習の1行 HTML コメントマーカー形を踏襲する執行判断。ADR-2 に記録。
- 上記以外の設計面(コンポーネント境界・通信・データ所有)は requirements 裁定3点+#2785 採用方針で既決であり再質問しない(cid:intent-capture:c1)。

承認: 本判定は requirements-analysis ゲート承認(ユーザー承認: 2026-08-10T04:43:11Z の裁定3点+ゲート Approve)で確定した設計委譲の範囲内の執行であり、新規のユーザー裁定を要しない。

## 裁定の記録

- 質問 0 問。選挙なし(執行クラス — 権威ある一次証拠 = 既存マーカー慣行の実在と stale 前例の cid により一意)。裁定が必要になった場合(reviewer が設計判断と指摘した場合)は本ファイルへ質問を追記して諮る。
