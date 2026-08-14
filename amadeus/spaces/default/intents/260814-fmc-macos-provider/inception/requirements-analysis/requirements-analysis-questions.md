# Requirements Analysis — 質問(intent 260814-fmc-macos-provider)

Intent autonomy: `full`(grant `intent-grant-0c97f07f3e3e3eaf75d83badf8656e84`)。本ファイルの質問は人間へ直接提示せず、`amadeus-bolt decide-question` の autonomy ladder で裁定する(project.md cid:scope-definition:c1-semi-ladder-routing)。fail-closed の結果のみ人間へ回す。

承認: full autonomy ladder による AUTO_DECIDED 2件(Q1 `auto-decision-4698c9378a8cd4edff7a840a73c0dd17` 2026-08-14T01:15:07Z / Q2 `auto-decision-2586119774c425a67d6eb897e7b134bf` 2026-08-14T01:15:07Z、audit `amadeus.intent_autonomy.transaction.committed` 行より転記。いずれも recommendation 採用、solo-election 不在の loud degradation 記録あり)。

対象: Issue #2361(formal-model-check の macOS 既定 provider 不通 + JDK ピン脆弱性)。

既決事項(再質問しない — cid:requirements-analysis:c5):

- 提案1(provider auto の可用性判定と Docker フォールバック、両方不可なら fail-closed で停止)と提案2(JDK ピンを major 26 一致へ緩和)を実装する — ユーザー指示(2026-08-14 本セッション、着手指示 手順4)および Issue #2361 本文の提案。
- 提案3(診断性改善)は PR #2453 で着地済みのため実装しない(二重実装禁止) — 同指示。
- JDK ピン緩和は「README 契約(major 26)と実装の整合を取る方向を基本」 — 同指示。README:74-79 / mise.toml:3-5 の「patch 完全一致は deliberate」宣言は PR #2453 由来の文面であり、ユーザー指示はこれを踏まえた上で major 26 整合を指示している(仕様変更の裁定者=ユーザーによる事前裁定)。両文面は同一変更内で major 26 契約へ書き換える。
- 明示 `--provider sandbox-exec` / `--provider docker` にはフォールバックを適用しない(明示選択は尊重し loud fail) — Issue 本文の対象が「既定 provider 経路(auto)」であることから機械的に導出。

残余の判断点(以下2問、full autonomy のため decide-question 梯子で裁定):

## Q1: mise.toml の JDK ピン(temurin-26.0.1+8)の扱い

検証を major 26 受理へ緩和した後、リポジトリの `mise.toml` の完全版ピンをどうするか。

A. ピンは維持する(開発環境の既定 JDK としての再現性を保つ)。コメントの「patch 完全一致を検証する」記述だけを major 26 契約へ更新する
B. ピンも `temurin-26` へ緩める(mise が major 内最新を解決)
C. ピンを削除する(グローバル環境に委ねる)
X. Other (please specify)

[Answer]: A — ピン維持+コメント更新。根拠: ピンは検証契約ではなく開発既定の供給手段であり、維持しても major 26 受理と矛盾しない。緩めると環境間の JDK が不定になり、Issue が求めていない変更で再現性を下げる(P5 surgical)。auto-decision `auto-decision-4698c9378a8cd4edff7a840a73c0dd17`(agent-recommendation、2026-08-14)

## Q2: フォールバック発生時の env-receipt / 可観測面の表現

auto(darwin)で sandbox-exec 検査が失敗し Docker へフォールバックして完走した場合、受け皿の表現をどうするか。

A. env-receipt は実際に走った provider(docker)の inspection plan と整合させる(選択と receipt 判定の2箇所同期 — scan §4-2-1)。フォールバック発生の事実と一次失敗理由は既存の stderr / errorDetail 面へ載せ、新しい receipt スキーマフィールドは追加しない
B. env-receipt スキーマへ fallback 履歴フィールドを新設する
C. フォールバック発生時は receipt に darwin 側 plan を残す(選択時の意図を優先)
X. Other (please specify)

[Answer]: A — receipt は実走 provider と整合、新スキーマなし。根拠: B はスキーマ拡張で Issue が求める範囲(提案1)を超える(P5)。C は「receipt が実行を反映しない」検証劇場に近づき P2 違反。receipt スキーマ(amadeus.env-receipt.v1)は provider 中立で変更不要(scan §1-6 実測)。auto-decision `auto-decision-2586119774c425a67d6eb897e7b134bf`(agent-recommendation、2026-08-14)
