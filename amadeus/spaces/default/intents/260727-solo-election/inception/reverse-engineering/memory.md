<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-27T14:05:02Z — 差分リフレッシュ(base 1673c4332 祖先・距離63、observed 3eba39a90)。Developer スキャン→Architect 合成の直列2 subagent(c3)。Architect が12点独立照合・訂正1件(1461票→ストア全域 voterKind 出現数の基準精密化、結論不変)。核心発見: (i) subagent transport は指令返却のみの意図設計(spawn/record 不実施 = 検証劇場回避、E-ETF-FD2 Q1=B) (ii) tally は人数非依存で2体ギャップ3点 (iii) SKILL.md H2 は t242 BR-K3 の toEqual で機械固定 — ソロ手順は既存4節への内挿か t242 契約改訂の裁定が必要 (iv) subagent 票の実データ0件(未走行経路)。
- 2026-07-27T14:05:02Z — 宣言センサー3種は codekb 出力パスが sensor filter に構造不適合のため発火不能(cid:reverse-engineering:re-sensors-codekb-filter-mismatch)。代替検証を conductor が実施: 本線ツリー status クリーン(git status --porcelain 出力ゼロ)、re-scan H2=5(grep -c)、上流入力ヘッダ・訂正節の実在(grep -n)、現在マーカーの一意性(本 intent 節のみ)を機械確認(cid:reverse-engineering:c3-codekb-sensor)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-27T14:05:02Z — Architect subagent が初回書込でパス指定を誤り本線ツリーへ着地(cid:code-generation:c2 隔離違反の実例)。subagent 自身が検知し、worktree へ複写+本線を git show HEAD 版の cp 上書きで復元、復元後の本線 status --porcelain 出力ゼロを実測申告。conductor が独立再実測で本線クリーンを確認済み。既知 cid の違反実例として PM 材料(新規ノルム化はしない)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
