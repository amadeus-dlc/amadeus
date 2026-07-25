<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T16:05Z — D-R4(失敗の検知)で3案から (c) 完了照合を採った。(a) wait の終了コードは bash のバッチ wait で個別ジョブの結果を取るのが煩雑、(b) 失敗マーカーファイルは新たな状態ファイルを増やす(org.md Forbidden)。(c) は D-R1(ロールバックの実在走査)と**同じ「実体を観測する」原理**で一貫し、追加機構を要さない。
- 2026-07-25T16:05Z — D-S1 で台帳方式と実在走査の**失敗様式の違い**を明記した。台帳は「消し残す」方向、実在走査は「消しすぎる」方向に倒れる。後者の方が有害なため範囲限定(起点・名前・深さの3層)を最優先の設計制約とした。この比較を書かないと、実在走査への変更が単なる等価置換に見えてしまう。
- 2026-07-25T16:05Z — D-SC2 で「メンバー数ぶん並列にするのが最も自然に見えて最も遅い」を設計として明記した。実測(並列度7 = 7.55秒 vs 直列 7.39秒)は直感に反するため、記録しないと後続の変更で復活しうる。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T16:05Z — D-SC4(バッチ境界での失敗)で「1バッチ目で失敗しても2バッチ目を実行する」と決めた。途中打ち切りは実装を複雑にし、得られる時間の節約が小さいため。全バッチ完了後に C-P4(完了照合)が欠落を検知して非ゼロで返る。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T16:05Z — D-P3 でバッチ方式(上限に達したら全完了を待つ)を採り、ジョブスロット制(1つ終わるごとに次を投入)を退けた。スロット制の方が理論上は速いが、bash での実装が複雑になり、実測 3.32秒 はバッチ方式で得た値である。複雑さに見合う改善が確認されていない。
- 2026-07-25T16:05Z — logical-components に「新設しないもの」表を置いた(集約機構・リトライ・外部並列化ユーティリティ・進捗表示)。新設が定数1つ + 制御構造 + 照合1つに限られることを、省略ではなく判断として示すため。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T16:05Z — C-P4(完了照合)の具体実装が未確定。全メンバーの RUN_ROOT/<member> 実在を確認する形は決めたが、`git worktree list` との照合まで行うか、ディレクトリ実在のみで足りるかは code-generation の判断とした。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
