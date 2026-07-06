<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-06T12:15:00Z — 既存の平坦な関数構成（実測: 関数 17 個の単一スクリプト）を維持し、追加も関数群とした（AD-1）。中核判断は「書き込みの単一入口化（AD-2）」で、3 箇所の copyFileSync/writeFileSync を TrackedWriter へ寄せることで、ハッシュ計上・3-way・退避が構造的に漏れなくなる。resolveSourceCommit の実行手段（Bun.spawnSync 等）は functional-design で確定する。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-06T12:40:00Z — §12a 反復 1 の指摘 5 件（Critical 1 / High 1 / Medium 2 / Low 1）を全件反映した。(1) Critical: feasibility 実測 5 の「copyFileSync/writeFileSync 3 箇所」は誤記で、実態は rmSync→cpSync ×2 + writeFileSync ×2。丸ごと置換はファイル単位 3-way と構造矛盾するため、copyEngine/copySkills の全面書き換え（DistEnumerator による列挙 → TrackedWriter → 削除パス）を AD-7 として明示。(2) High: copySkills の stale-skill 無条件 rmSync を ObsoleteScanner へ統合し削除前判定へ。依存図で廃止走査を各コピー段階の内側へ移動（観測可能な挙動は不変）。(3) settings.json の特則を AD-6 として新設。(4) 依存図へ relinkClaude を非接続として明記。(5) --version-info 経路の manifest parse 失敗の catch を明記。feasibility-assessment 実測 5 の誤記は本ステージの記録で訂正し、原本への post-gate 追補はしない（訂正の正は本ステージ = 下流が読む設計文書、と判断）。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
