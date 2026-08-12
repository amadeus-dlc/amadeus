<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-08-12T12:56:00Z — レビュー指摘 18 件は全件を「fix / reject(根拠付き)/ 文書化」のいずれかで終端。設計判断 3 件(sensor ライブ照合・attestation 脅威モデル・status read-only 化)+自己出力 dirty デッドロック是正は semi 梯子(decide-question)で裁定し、人間エスカレーションなしで AUTO_DECIDED。
2026-08-12T12:56:00Z — bun の lcov は複数行型注釈の継続行を、targeted 実行では DA 非出力・フルパイプラインでは DA:0 として扱う(計装差)。patch gate 赤の残余 4 行はこれが原因で、名前付き型への切り出しで行自体を消して解消した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
2026-08-12T12:56:00Z — 旧 PR クローズ→再作成の epoch 再発行慣行を廃し、レビュー指摘 6 の修正(既存 open PR への created 再発行)で PR #2932 を維持したまま 3 回の epoch 再発行を実施。push 前のローカル coverage 実測を怠り CI patch gate を 2 回赤にした反省は Issue #2933 に起票済み。
2026-08-12T12:56:00Z — スレッド返信+resolve のバースト(18 件)が Review Thread Resolution workflow を約 90 run 起動させた(イベント毎トリガー・concurrency 未設定)。全冗長 run をキャンセルし、恒久対策(concurrency グループ)は Issue 起票候補としてゲートで諮る。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
