<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T14:50Z — U2 の設計の核心は「並列化で失われるのは**親シェルのメモリに載った状態だけ**」という観察。ファイルシステム上の実体(worktree・RUN_RECORD メタデータ)はサブシェル境界を越えて残るため、メモリ上の台帳(CREATED_MEMBERS)をファイルシステムの観測(RUN_ROOT 実在走査)へ置き換えることで並列化が成立する。domain-entities に「並列化で所在が変わる実体」表として明示した。
- 2026-07-25T14:50Z — INV-P3(メンバーごとの RUN_RECORD パスが互いに非交差)が BR-P4(サブシェル内でメタデータを書く)の根拠。これが破れると並列書込が競合する。INV-P2(走査範囲 ⊆ members_for の集合)は安全性の要で、誤ると無関係な worktree を消しうる。
- 2026-07-25T14:50Z — git のロック競合は**失敗にならない**(feasibility 実測: 全並列度で成功 7/7・stderr 0 bytes)ため、リトライ機構は不要。必要なのは並列度の上限だけ。BR-P1 の「上限」が要件の核心であり、無制限 fan-out(並列度7 = 7.55秒)は直列(7.39秒)より遅い退行である。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T14:55Z — 引用の機械照合で自己捕捉: `rm -rf -- "$RUN_ROOT" "$RUN_RECORD"` を :1249 と書いていたが実際は **:1250**(:1249 は `done`)。U2 の3成果物に加え、同根の誤りが上流3ファイル(units-generation/unit-of-work.md、application-design/decisions.md、application-design/memory.md)にもあったため一括是正した。**この誤りは application-design の reviewer iteration 1 で Minor として指摘され、その是正時に私が :1249 と書いてしまったもの** — 是正 diff 自体が新しい誤りを固定した実例(cid:requirements-analysis:fix-diff-independent-reverify)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T14:50Z — BR-P7 で「消費者の棚卸しは grep 出力からの転記で全数を確定し、既存表からの複製をしない」と明記した。U1 の functional-design で同じ棚卸しが3度是正された実測を受けての予防措置。あわせて「実装時に再実行して確定すること(U1 の変更で行番号がシフトするため)」も併記した。
- 2026-07-25T14:50Z — BR-P20 で「U2 実装時の行番号は本書の値から変わる」ことを明示した。U1 が先に着地し定数ブロックへ追記するため、本書の行番号は実装時点では失効している。実ファイルでの再解決を要件化した(cid:reverse-engineering:upstream-cite-reresolve-on-shift)。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T14:55Z — 並列度4の実装形(サブシェル + wait のバッチ制御か、ジョブ数カウンタか)は BR-P1 で契約(同時実行数が上限を超えない)のみ定め、具体形は code-generation に委ねた。
- 2026-07-25T14:55Z — サブシェルで `git worktree add` が失敗したとき親がどう検知するか(終了コードの集約手段)は未確定。BR-P14(1つでも失敗すれば create_run が非ゼロで返る)を満たす実装形を code-generation で決める。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
