<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T12:45Z — 対象がシェルスクリプトのため「コンポーネント = シェル関数」として設計した。新規モジュールは作らず、既存関数の改変 + 導出関数1つの新設に閉じる(org.md Forbidden の要求外機構の追加を避ける)。
- 2026-07-25T12:45Z — ADR-2 の核心は「member_bootstrap_prompt は role をフォーマットに埋めるだけで、判定に使う ' actas ' の有無は role に依存しない」という不変条件。これにより watcher_verification_applies(member 文脈を持たない)が代表 role leader で導出しても判定が一意に定まる。この不変条件はテストで固定する必要があり FR-5 の受け入れ基準へ含めた。
- 2026-07-25T12:45Z — ADR-3(実在走査)の副次効果として、create_run → rollback_prepared_run の状態依存が消える。両者は RUN_ROOT という共有された観測対象を介してのみ関係するようになり、並列化に伴う子→親の状態共有機構が不要になる。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T13:00Z — §12a reviewer iteration 1 が Critical 1件・Major 2件・Minor 2件を検出。全件を実測確認のうえ是正した。
  (1) Critical: **前 intent で自分が作った t294-team-up-watcher-applicability.test.ts が CLAUDE_MONITOR_PROMPT を env 上書きで駆動している**(:53/:61/:75/:97)ため、定数廃止で全項目が破綻する。FR-5 は t-team-up-watcher-arming.test.ts しか是正対象に挙げておらず、独立した消費者を見落としていた。components/component-methods へ追加し、廃止に伴う消費者棚卸し表を新設した(cid:code-generation:fixture-propagation-grep)。
  (2) Major: **team-up.sh は POSIX sh ではなく bash**(#!/usr/bin/env bash + 配列 + local + [[ ]] + $RANDOM)。ADR-1 の連想配列却下理由「POSIX の移植性を落とす」は事実誤認だった。却下理由を「状態を持つ必要がない(member 集合の変化への追従が要る / MSG_BACKEND が起動途中で解決される)」へ差し替えた。
  (3) Major: :1210 の診断メッセージが '/agmsg mode monitor' をリテラル固定しており、actas 移行後は事実と異なる表示になる。改修対象を :1211 単独から :1210-1211 の2行へ拡張した。
  (4) Minor: ADR-3 の「rm -rf フォールバックが実装時に要る」は誤り。現行 rollback_prepared_run が :1250 で無条件 rm -rf を既に実行している（当初 :1249 と記載していたが :1249 は `done` 行、正しくは :1250 — U2 functional-design で自己捕捉し是正）。
  (5) Minor: 並列化時の RUN_RECORD メタデータ書込(:1307-1309)の所在が未規定だった。サブシェル内で行う契約を明記(パスが member ごとに非交差でファイルシステム書込はサブシェル境界を越えて残るため成立)。

- 2026-07-25T12:50Z — 引用の機械的総当たり照合で1件自己捕捉。RUN_ROOT の作成箇所を :1274 付近と書いていたが、実際は組立が :1280、mkdir -p が :1285。:1274 は base_commit の rev-parse であり無関係だった。reviewer 前に是正済み。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-25T13:15Z — §12a reviewer iteration 2。iteration 1 の5件は全て閉包確認 OK。新規 Major 1件: **t-team-up-watcher-arming.test.ts:172 の `expect(err).toContain("/agmsg mode monitor")` が棚卸しから漏れていた**。根本原因は棚卸しの検索キーを変数名(CLAUDE_MONITOR_PROMPT / CREATED_MEMBERS)に限定していたこと — このテストは展開後のリテラル文字列を assert しているため変数名 grep では構造的に捕捉できない。棚卸し表を「キー1: 変数名」「キー2: 展開後のリテラル」の2軸へ拡張し、リテラル面で :89 / :104 / :1210 / arming:3 / arming:172 / t294:55 の6箇所、変数名面で 5箇所を列挙した。あわせて iteration 1 で t294 の行番号を :53 と誤記していた点も実測で :55 へ訂正した。

## Tradeoffs
- 2026-07-25T12:45Z — ADR-3 の Alternatives Rejected で `git worktree list` の parse 案を却下したが、**孤児ディレクトリ(add が途中失敗して git 登録されていない残骸)には `worktree remove` が効かない**という論点を Consequences へ引き継いだ。実装時に rm -rf フォールバックが要る。却下理由(コマンド出力形式への依存を増やさない)は維持しつつ、却下案が指摘していた実在の課題を落とさないようにした。
- 2026-07-25T12:45Z — ADR-4(並列度固定4)は環境差を吸収しない。実測が macOS のみのため動的式を導入しない判断だが、「上限があること自体」が退行(並列度7 = 7.55秒)を防ぐ主目的であり、値の最適性は副次的と位置づけた。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T12:50Z — ADR-3 の走査範囲の安全性: RUN_ROOT 直下の member 名ディレクトリに限定し members_for の集合と突き合わせる設計にしたが、孤児ディレクトリの削除手段(worktree remove が効かない場合の rm -rf)の扱いは functional-design で確定する。
- 2026-07-25T12:50Z — 並列度4の実装形(サブシェル + wait でのバッチ制御か、ジョブ数カウンタか)は component-methods で契約のみ定め、具体形は functional-design/code-generation に委ねた。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
