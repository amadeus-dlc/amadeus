<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-11T06:20:00Z — FR-CBG-7「CI の blocking step として実行する」は、ジョブが赤くなり得ることではなく、赤がマージを止めることを要求する。本リポジトリの ruleset(id 18843917)が要求する status check は `CI Success` 一件のみのため、`ci-success` の `needs` に載らないジョブは、どれだけ大きく赤くなっても advisory に留まる。先例とした ci.yml の走査系ゲート群はすべて `lint` ジョブ内の step で、`lint` が集約に載ることで blocking 性を継承していた。独立ジョブ化はパスフィルタ盲点(FR-CBG-8)の回避としては正しいが、その継承を失う代償があり、補償が要る。
- 2026-08-11T06:20:00Z — 「いつ走るか」(`needs`/`if` を持たない独立性)と「赤が止めるか」(集約への所属)は別の面である。実装時の設計注記はこの二つを同一視しており、それが誤りの記録として残っていた。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-11T06:20:00Z — §12a レビューは iteration 2 で NOT-READY のまま予算(2/2)を使い切った。ただし iteration 1 の BLOCKER 1(FR-CBG-7 未達)はレビュアーが独立に CLOSED と確認し、iteration 2 が新たに提起した BLOCKER(426 行 vs 表の 381 行)は conductor が宣言 ref(`cc775f87b`)で再測定して 381 を再現し不成立と確定した。verdict の記録は書き換えず、`quality_repair` の観測経路で閉包を実証してゲートで開示する。
- 2026-08-11T06:20:00Z — PR #2866 は §12a の verdict 確定前にマージされた。そのため FR-CBG-7 未達が main へ着地し、修正に別 PR(#2880)を要した。pr-convergence plugin 導入下では「PR 発行 → 収束 → report → §12a」の順序が構造的に強制されるため、レビュー完了前の着地は起こりうる。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-11T06:20:00Z — PR head を GitHub に追随させるため空コミットを1つ積んだ。履歴の綺麗さより、走行中の CI を無効化しないことを優先した(rebase/amend は SHA を変え、解こうとしている BLOCKED を再発させる)。squash マージ運用のため main の履歴には残らない。
- 2026-08-11T06:20:00Z — t222 の `ci-success` needs pin は Set 比較と逐語文字列の2系統ある。冗長に見えるが、片方が緩いと契約が守られない(CodeRabbit の指摘で、文字列側が位置を見ておらず case 分岐への移動を検出できないことが判明)。両方を load-bearing に保つ判断をした。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-11T08:35:00Z — code-generation の produces `pr-convergence-report.md` は PR #2866 の収束後にしか書けない(pr-convergence CLI が未収束では書込を拒否する)。収束は main 側の既存回帰(Issue #2873 / t533)で外部要因ブロック中。帰属は未改変ベース afd3cb369 との失敗集合一致(10 pass / 2 fail、同一テスト名)で自変更由来でないことを実測済み。autonomy=full のため park は engine に拒否された。#2873 の修正着地までこのステージは完了できない。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-11T06:20:00Z — reviewer profile(Read/Grep/Glob のみ)では `git show <ref>:<path>` が実行できず、履歴節・宣言 ref を持つ成果物の照合が構造的に不能。iteration 2 の誤指摘はこれが原因。measurement を伴うレビュー課題では shell を与えるか、測定値を渡して検算させる形にする必要がある。
- 2026-08-11T06:20:00Z — CI 集約ジョブ(`CI Success`)は依存が全完了していてもランナー割当待ちで `queued` のまま数十分滞留しうる。失敗と区別するには check-run の `status`/`conclusion` 実値を読む必要があり、`gh pr checks` の bucket では実行中を pending として捉えられない場合がある。
- 2026-08-11T06:20:00Z — `formal-verif-ci-baseline.sha256` は ci.yml の生ファイルではなく `normalizedCiBaseline`(U4 formal ブロックと dispatch 行を除去した正規化後)の digest。両者が ci.yml を変更した衝突では、どちらの側の値を選んでも不正で、再計算が唯一の正解になる。
