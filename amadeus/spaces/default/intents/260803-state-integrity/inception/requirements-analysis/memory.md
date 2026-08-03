<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-03T13:06:14Z — Q1(`Completed` の正準定義)を当初「仕様判断につきユーザー専権」として質問にかけたが、ユーザー指摘(逐語「issueでわかることは質問するな」)により撤回した。Issue #1875「## 期待」が共有 writer `rebuildDerivedPlanFields` を逐語で指名しており、統一先は Issue 本文から一意に導かれる。クロスレビュー reviewer-1 が「統一先は仕様判断であり未裁定」と書いていたが、Issue 本文の指名を読めば未裁定ではなかった。
- 2026-08-03T13:06:14Z — Q4(Bolt 編成)と Q5(NSD001 対処)も質問せず執行とした。Q4 は `cid:code-generation:c6` の交差判定を実ファイル目録へ機械適用すれば一意(`amadeus-lib.ts` の生成コピー12個が交差 → 直列)、Q5 は org.md Forbidden(検証劇場)と Mandated(落ちる実証)から baseline 延命が排除され一意。`cid:requirements-analysis:always-elect` の「既決 contract への機械的適用は執行」に該当する。
- 2026-08-03T13:06:14Z — 選挙不要判定の根拠種別を質問ファイル冒頭に1問1行で記載した(`cid:requirements-analysis:no-election-judgment-gate`)。ソロモードかつ `auto-solo-election: true` だが、自動発動3類型(設計逸脱/ブロッカー/§13)に明確化質問は含まれないため選挙は行っていない。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-03T13:15Z — §12a reviewer を `run_in_background: false` で起動したにもかかわらずハーネスが非同期起動し、ターンが終了して Stop hook が2回発火した。`cid:code-generation:conductor-sync-subagent-collection`(サブエージェント待ちのままターンを終了せず同期回収する)への逸脱。トランスクリプトのサイズ安定と最終行の role/type を有界ループで監視する前景待機へ切り替えて回収した。1回目の待機ロジックは symlink に対する `stat -f%z` が空を返して機能せず、`wc -c` へ是正した(壊れた計装が対照実測を汚染しかけた実例 — `cid:requirements-analysis:instrumentation-syntax-check` の同族)。
- 2026-08-03T13:28Z — reviewer iteration 2 の前に `amadeus-reviewer-runtime.ts scope` を再実行せず、iteration 1 の invocationId を再利用して `complete-review` へ渡した。`complete-review` は exit 0 で受理し Review ブロックも正しく着地したが、SKILL の「repeat the whole reviewer flow」からは逸脱している。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-03T13:10Z — 裁定 Q2=A の選択肢文は wedge holder の回収を「専用 CLI verb 等」と例示していたが、実測(`grep` でロック回収 CLI verb は不在、一方 FR-1 後も死亡 owner の reap は維持)により「holder プロセスを終了させれば死亡 owner reap が自動解放する」既存経路で充足すると判断し、前提 A-1 として明示切り出しのうえ承認ゲートでの確認事項に回した。新規 CLI verb は `self-feature` へのスコープ切替を要するため、`self-fix` を保つ方を採った。
- 2026-08-03T13:10Z — RE 報告の断定「`Completed` 定義のいかなる統一も既存テストを最低1本は必ず壊す」を採用しなかった。R と E が乖離するのは `[x]` 行が SKIP 実効を持つ場合に限られ、該当フィクスチャがその形を作るかは未実測である。受け入れ基準を「赤になること」から「生カウント意味論をピン留めしたままにしないこと」へ置き換え、赤/緑の実測は実装時の記録要求とした。上流の断定を無検証で要件へ昇格させるより、検証可能な形へ落とす方を選んだ。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-03T13:10Z — 前提 A-1(wedge 回収に新規 CLI verb を追加しない)の承認。裁定 Q2=A の選択肢文からの実質的な逸脱であり、承認ゲートで明示確認する。
- 2026-08-03T13:06Z — `re-scans/260803-state-integrity.md` の observed(`498c3034a`)と共有 codekb 9本の記録 ref(`6c15af23a`)が7コミットずれている。患部5ファイルは区間内 0 コミットのため引用の正しさには影響しないが、記録面の是正要否は未決。
- 2026-08-03T13:12Z — 独立再列挙により定義 R のテスト pin が RE 報告・クロスレビュー2名の列挙(2本)より1本多い3本と判明した(`t-tui-t139-revision-loop-idempotency.serial.test.ts:243`/`:307`)。同種の列挙漏れが他にも残っていないかは、実装段の第3再列挙(`cid:requirements-analysis:enumeration-reverify-at-implementation`)で再確認する。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
