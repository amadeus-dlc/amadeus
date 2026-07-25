<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T23:15Z — **#1384 の保護が導入以来はじめて機能した。** 7人構成の実 launch で ready sentinel 7/7・actas ロック 7/7 を実測。現行 main では sentinel が運用履歴 251 エントリ中 0件だったのに対し、本実装では全員分が生成され検証が exit 0 で成功した。
- 2026-07-25T23:15Z — ADR-5 の効果が数値で確認できた。3人構成でアタッチ到達 **T+6.02秒** / スクリプト終了 T+124.88秒 — **118.86秒の検証待機が利用者体験から完全に切り離された**。前 intent ベースライン 5.87秒 に対し 6.02秒 で悪化なし(差は worktree 作成の実測ばらつき 1.013〜1.154秒/個 の範囲)。
- 2026-07-25T23:15Z — 7人構成の全寿命 112.56秒 は `WATCHER_READY_TIMEOUT × (RESEND_MAX+1)` = 120秒 の範囲内で、タイムアウトせず全員 armed に至った。60秒 への縮小が7人構成でも正常系を壊していないことの実測。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T23:10Z — 実装者が2点を申告: (a) 新規テストファイル(t295 以降)を作らず既存2ファイルへ集約 — 全ルールが同一シームで固定でき新設は重複になるため、(b) 設計表にない2つの assert を是正(`t294:111` の `"90 1"`、`t-team-up-watcher-arming:227` の `"90"`) — BR-15 のタイムアウト変更で無条件に破綻する行であり BR-15 の直接の対象。いずれも設計内の判断と conductor は評価し、§12a reviewer にも判定を求めた。
- 2026-07-25T23:10Z — 実装者が**落ちる実証の途中で vacuity を自己捕捉**した。`herdr backend derives an empty bootstrap prompt` が pre-fix でも green だった(関数不在でも展開が空になる構造的偽 green)。`declare -F` ガードを追加し t294 単体の fail が 6→7 へ増加、再度フルスイート green を確認してから commit を amend。
- 2026-07-25T23:20Z — conductor が上流入力ヘッダの consumes 漏れを是正。宣言7件のうち domain-entities / unit-of-work / requirements の3件が未参照で upstream-coverage が FAILED。総当たり grep で 7/7 を機械確認して解消(cid:requirements-analysis:consumes-first-drafting の再発)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T23:15Z — 7人構成の実 launch は約113秒かかるが、これは**設計どおりの挙動**である。利用者はアタッチ済みで作業を開始しており、待っているのは呼出元シェルのプロンプト復帰だけ。この区別を code-summary で明示した。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T23:20Z — resume(`-c`)でのロック残存は未実測。build-and-test で扱う。
- 2026-07-25T23:20Z — R-3(actas の受信範囲制限が配送を壊さないか)は未実測。7人起動の成功は傍証だが、実際のメッセージ配送は試していない。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
