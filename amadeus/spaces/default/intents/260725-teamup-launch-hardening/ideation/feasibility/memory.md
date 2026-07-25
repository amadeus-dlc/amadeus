<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T11:15Z — actas プローブの第1回は sentinel 未出現だったが、これは actas 移行の不成立ではなく**プローブの手順漏れ**だった。claude-code ドライバ template.md:144-148 step 5d が「delivery mode が monitor または both のときだけ watcher を起動する」と規定しており、第1回は delivery.sh set monitor を実行していなかった。team-up.sh は :877-879 で既に実行しているため、本番経路では前提条件が満たされる。第2回(mode=monitor 設定後)で sentinel が T+32.2秒 に出現し、実現可能性を実証した。
- 2026-07-25T11:15Z — インストール済み SKILL.md:110-114 の actas セクションは codex 向け記述(identities.sh に codex をハードコード、「Codex has no Monitor tool」)で watcher 起動を規定しない。claude-code の actas 挙動はドライバテンプレート側が規定する。この二層構造を読み違えると「actas では watcher が起動しない」と誤結論する。
- 2026-07-25T11:15Z — 並列 worktree は並列度4が最適(3.32秒)で、無制限(7)は 7.55秒と直列(7.39秒)より遅い。「並列化 = 速くなる」ではなく上限設計が要件そのものである。intent-statement の「1〜2秒まで短縮」見込みは過大で、実測ベースの期待値は 3.3秒前後(7人構成で約4秒短縮)。RAID R-5 として訂正を記録した。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T11:15Z — Q2(actas 不成立時の分岐 = 別 readiness 指標へ切替)は実験2により actas 移行が成立したため**発動しない**。intent-capture で先決めした分岐を使わずに済んだ。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T11:20Z — 並列度は固定4を採用し、CPU コア数ベースの動的上限を退けた。実測が macOS のみで動的式の妥当性を検証できないため、実測に接地しない数値を導入しない(cid:requirements-analysis:constants-from-code)。Linux CI での特性差は RAID R-6 として残す。
- 2026-07-25T11:20Z — 待機設計は「mux_attach の後ろへ移す」を採用。exit code の意味づけ再設計というコストを負うが、前 intent の成果(起動の速さ)と #1384 の保護を両立できる唯一の案と判断した。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T11:20Z — actas 排他ロック(template.md step 4 は status=held で abort と規定)が7メンバー同時起動で競合しないか、および異常終了後のロック残存が起動失敗を招かないかが未検証(RAID R-2)。requirements/nfr で扱う。
- 2026-07-25T11:20Z — 並列 worktree の部分失敗時のロールバックは、実験で失敗が発生しなかったため未観測(RAID R-4)。失敗注入での検証を build-and-test に含める。
- 2026-07-25T11:20Z — mux_attach 後へ検証を移した場合の exit code の意味づけが未確定。アタッチは対話的に開くため、検証結果をどう呼び出し元へ返すかを requirements で決める必要がある。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
