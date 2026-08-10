<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-10T07:20:00Z — `self-fix` は units-generation を SKIP するため unit ディレクトリが存在せず engine が `next` をエラーで拒否した; エラーメッセージの指示どおり `construction/fix-2790-plugin-harness-dir-token/` を手で作成し、先行 intent の命名慣行 `fix-<issue>-<slug>` に揃えた
- 2026-08-10T07:20:00Z — walking-skeleton スタンスを `scope-dependent` と分類した; project.md（最具体）が「スコープ別の既定は org.md に従う」と述べており、これは「always」でも「never」でもなくスコープへの委譲だから。スコープ判定は engine の権限に返した
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-10T07:20:00Z — フルスイート `bun run test:ci` を conductor 側で実行した（stage 本文に明示の要求は無い）; developer subagent は plugin 関連 45 ファイルに絞っており、新規テストファイル + 新規ヘルパを足したことでカバレッジレジストリ系ゲートが射程外だったため。結果として実際に 2 件（honesty ratchet の未登録、境界ガードが禁じる `scripts/` 参照）を検出した
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-10T07:20:00Z — レビュアーの ADVISORY（`transform()` と `seedBytesForHarness()` の等価性ガード不在）を本 intent では是正せず留保として記録した; 要件の未解決事項が二実装を許容しており、ガード追加は self-fix の「限定的な是正」の外。ただし本 Issue と同一クラスの再発経路であるため FOLLOW-UP 化を推奨として明記した
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-10T07:20:00Z — `harness-transform.ts` の `transform()` と core の `seedBytesForHarness()` の規則集合が乖離しても検出されない; 共有コーパスでの等価性テスト 1 本で閉じられる見込み。別 Issue 化の要否は build-and-test またはユーザー裁定で決める
- 2026-08-10T07:20:00Z — code-generation の必須成果物 `pr-convergence-report.md` は実 PR に対する plugin CLI 実行でしか生成できないため、ステージ完了が外向き操作（commit / push / PR 作成）に構造的に依存する; ワークフロー設計としてこの結合が意図的かは未確認
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
