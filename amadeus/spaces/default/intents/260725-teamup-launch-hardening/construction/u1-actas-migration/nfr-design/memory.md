<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T15:45Z — WATCHER_READY_TIMEOUT の設計値を **60秒**(実測 32.2秒 の約1.86倍)とした。マージンの根拠は (1) 実測が1メンバー・1回であること、(2) 7人同時起動でホスト負荷によりコールドスタートが延びること、(3) ディスク・CPU 状態の変動。現行90秒からの縮小幅を確保しつつ正常系で偽タイムアウトを出さない値として選んだ。全寿命は 180秒 → 120秒(33%短縮)。
- 2026-07-25T15:45Z — D-SC2 でアンチパターンを明記した。メンバーごとに順次待つ実装にすると7人で最悪 60×7×2 = 840秒 になる。共有ポーリング(既存構造)なら 60×2 = 120秒。**本体を変更しないことが要件**であることを設計として言語化した。
- 2026-07-25T15:45Z — 性能設計と信頼性設計が**同一の構造変更**(検証を mux_attach 後ろへ)で達成される点を両文書で相互参照した。P-1(アタッチ到達時間)と R-1(検証失敗が起動を妨げない)は同じ順序変更の別の側面である。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T15:45Z — D-R3 で「U1 後は既定構成でスキップ分岐に入らない」ことを明記した。actas プロンプトになるため判定が真になるためで、WATCHER_SKIP_ANNOUNCED ラッチは MSG_BACKEND=herdr や将来の構成変更に備えて残す。消し忘れではなく意図的な保存であることを記録する必要がある。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T15:45Z — D-S4 で「actas ロックを迂回する実装をしない」と決めた。排他は agmsg が意図して設けた保護であり、こちらで無効化すると複数セッションが同一ロールで受信する状態を作る。可用性リスクは受け入れ、実測で恒久ブロックが確認された場合はエスカレーションする方針。
- 2026-07-25T15:45Z — logical-components で「新設しないもの」表を置いた(プロンプト表・通知経路・リトライ機構・並列化機構)。新設が関数1つ + 定数変更のみであることを、省略ではなく判断として示すため。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T15:45Z — 60秒 というマージンの妥当性は7人構成の実測で確認する。実測で正常系がこれを超えるなら値の見直しが要る。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
