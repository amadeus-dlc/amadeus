# Requirements Analysis 質問票

ユーザー承認: 2026-08-10T13:59:16Z — AskUserQuestion で Q1=A「限定改訂」を直接裁定。E-OC1 回復として `DECISION_RECORDED` と `QUESTION_ANSWERED` を監査へ記録後、本 evidence header を追記した。

## Q1. `{unit-name}` placeholder の既存契約をどの範囲で改訂しますか？

`amadeus-directive.ts` と `t116` test 16 は、placeholder を含む path を `consumes_absent` に分類しない契約を固定しています。一方、#2834 の受け入れ条件は、非 per-unit consumer が全 Unit の実パスを列挙し、未解決 placeholder を required consume として扱わないことを要求します。

A. **限定改訂（推奨）** — 非 per-unit consumer が per-unit producer の成果物を読む場合は、確定済み Unit 集合へ `N × M` fan-out し、unresolved placeholder を一切 emit しない。Unit 集合を決定できない場合は error directive で fail-closed とする。既存の placeholder 免除は、skeleton / `--single` の produces など placeholder が意味を持つ既存面に限定して維持する。
B. **全面改訂** — fan-out に加え、残るすべての unresolved placeholder path を `consumes_absent` に分類するよう一般契約と `t116` test 16 を改訂する。
C. **構造化契約へ拡張** — flat な `consumes: string[]` の fan-out を避け、Unit と成果物の対応を保持する新しい directive field を導入する。既存 consumer / reviewer も新形状へ対応させる。
D. **現行契約を維持** — placeholder 免除と flat `consumes` を維持し、stage body の glob 読み取りだけを正本とする。この場合、Issue の「directive が全 Unit の実パスを列挙する」受け入れ条件は変更する。
E. Other (please specify)

[Answer]: A — 限定改訂。7 consumer は確定済み Unit 集合へ fan-out し、Unit 集合を決定できない場合は fail-closed とする。skeleton / `--single` の produces など、placeholder が意味を持つ既存面の免除は維持する。（ユーザー裁定 2026-08-10）

## 判断の影響

- A は Issue の全 Unit 列挙を満たしつつ、正当な placeholder round-trip を保存する最小の契約改訂です。
- B は `consumes_absent` の意味を広げ、既存の明文契約と pinned test を直接変更します。
- C は directive schema と全 consumer の変更を伴い、本 intent の変更面を拡大します。
- D は現状の fail-open directive を残すため、起票済み受け入れ条件の縮小になります。
