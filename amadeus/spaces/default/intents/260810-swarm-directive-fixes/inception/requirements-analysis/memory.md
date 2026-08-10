# Requirements Analysis Memory

## Interpretations

- 2026-08-10T13:42:28Z — #2833 の Retry / Skip / Abort は既存 stage protocol から結果契約を導出し、engine 内の読み取り台帳・projection の選択は Application Design に委ねる。Stop hook の変更と新規 state は要件に含めない。
- 2026-08-10T13:42:28Z — #2834 は機械抽出で一致した7 consumer stage と reviewer read scope を同一欠陥クラスとして扱う。upstream-coverage sensor は path を読まないため影響対象外とする。
- 2026-08-10T13:51:30Z — §12a Iteration 1 BLOCKER は stage-protocol.md:143-147 の既決契約から解消した。parallel batch は全 Task 帰還後、Retry / Skip を失敗 Unit Z 1件へ適用し、Abort だけを Construction 全体へ適用する。downstream fan-out は succeeded Unit を母集団とし、cancelled Unit を除外、failed / pending が残る場合は consumer 発行前に fail-closed とする。

## Deviations

- 2026-08-10T13:42:28Z — なし。

## Tradeoffs

- 2026-08-10T13:42:28Z — #2834 の pinned placeholder exemption は Issue の受け入れ条件と衝突するため、要件本文を確定する前にユーザー専権の仕様変更裁定へ送る。

## Open questions

- 2026-08-10T13:42:28Z — 解決済み: ユーザーは限定改訂を選択。非 per-unit consumer は確定 Unit 集合へ fan-out し、Unit 集合不確定時は fail-closed、正当な placeholder 免除は維持する。
