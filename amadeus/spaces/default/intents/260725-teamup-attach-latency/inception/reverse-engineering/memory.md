<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-25T08:15Z — Issue #1449 は起票時「タイムアウトが長すぎる性能問題」と解釈されていたが、実 launch 計測(3人構成、200.85秒、armed 0/3)により **actas/monitor モード不一致で検証が原理的に成功しえない**ことが判明。タイムアウト長は症状であり原因ではない。既存 codekb の 260724 節の因果解釈を訂正した。
- 2026-07-25T08:15Z — 本 intent のスコープはユーザー裁定により**起動レイテンシの解消のみ**に限定。actas 移行による根治は #1476 として分離起票済み。
- 2026-07-25T08:15Z — 差分リフレッシュの base は `6d4df9056`(祖先性 exit 0、distance 125)。`re-scans/260725-mirror-review-fixes.md` が observed として記載する `7033693` は HEAD の祖先でなく(PR head)、base 候補から除外した(cid:reverse-engineering:rescan-base-ancestry)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-25T08:15Z — RE ステージの宣言センサー3種は codekb 出力パスが sensor filter に構造不適合で発火不能(cid:reverse-engineering:re-sensors-codekb-filter-mismatch)。センサー成功として扱わず、H2 構成と上流入力参照を直接検証して代替した。
- 2026-07-25T08:15Z — conductor が事前調査で申告した値のうち6点が Developer スキャンの実測で訂正された(agmsg run dir 266→251エントリ、`WATCHER_READY_TIMEOUT` 行 :101→:99、`WATCHER_RESEND_MAX` 行 :104→:114、`verify_watchers_armed` :1139-1178→:1151-1190、テスト 197→268行、`.git` 165MB→166M)。さらに Architect が sentinel 書込行を範囲指定 `:300-310` から単一行 `:308` へ精密化。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-25T08:15Z — Depth Minimal のため、body 4成果物(business-overview / api-documentation / technology-stack / dependencies)は「変更なし、確認済み」の一行追記に留めた(cid:reverse-engineering:c1)。`code-quality-assessment.md` は Architect の独立検証で正確と判定され無変更。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-25T08:15Z — Architect が発見した第2の片側実装: `spawn.sh:565-568` は「readiness ハンドシェイクを持たない起動形態では待機自体をスキップする」適用可否ガードを持つが、`team-up.sh:1077 watcher_verification_applies()` は `RUNTIME=claude && MSG_BACKEND=agmsg` のみで**起動経路が実際に sentinel を出すかを判定しない**。requirements-analysis で、除去案とこのガード移植案のどちらを採るかを確定する必要がある。
