# Code Generation Plan — bug-zero-batch

> 上流: `../../inception/requirements-analysis/requirements.md`(FR-674〜FR-668、選挙確定済み)。units-generation は bugfix scope により SKIP のため、ステージ規定のフォールバックどおり requirements と codekb から Bolt を編成する。org.md により bugfix はスケルトンセレモニーなし。全 Bolt は変更モジュールが非交差で相互独立(#675 の共通ヘルパーは `amadeus-state.ts` 内に置き、#668 の `amadeus-lib.ts` と交差させない)のため、**1並列バッチ・6 Bolt・各1 PR** で実行する。
>
> 注記: 本ファイルの初版(2026-07-09T09:08:34Z、監査 ARTIFACT_CREATED 記録あり)は並列エージェントの本線ツリー誤入インシデント中に作業ツリーから消失したため、同一内容+実績を反映して再作成(2026-07-09T09:47)。

## Bolt 編成(1バグ = 1 Bolt = 1 PR)

| Bolt | Issue | 変更対象 | 回帰テスト | 優先度 | 実績 |
|---|---|---|---|---|---|
| swarm-finalize-merge | #674 | `packages/framework/core/tools/amadeus-swarm.ts`(handleFinalize) | `tests/e2e/t134-swarm-referee.test.ts` に merge-back 失敗ケース追加 | P1 | PR #691 READY |
| reject-presence-guard | #675 | `packages/framework/core/tools/amadeus-state.ts`(共通ヘルパー抽出+reject 配線) | `tests/unit/t188-human-presence-gate.test.ts` に fabricated reject 拒否+fresh turn 成功 | P1 | PR #692 READY |
| codekb-repo-name | #668 | `packages/framework/core/tools/amadeus-lib.ts`(codekbRepoName) | `tests/unit/t182-codekb-placement.test.ts` に remote slug/フォールバック pin | P1 | PR #693 READY |
| bolt-start-preaudit | #676 | `packages/framework/core/tools/amadeus-bolt.ts`(start 全経路 pre-audit) | `tests/unit/t33.test.ts` fixture seed 化+negative 追加 | P2 | PR #695 READY |
| http-getjson-result | #677 | `packages/setup/src/ports/http.ts`(getJson の json() 保護) | 新規 `tests/unit/setup-http.test.ts` | P2 | PR #694 READY |
| tar-pax-chunk | #678 | `packages/setup/src/internal/tar-archive-extractor.ts`(pending 拡張ヘッダ状態) | PAX/GNU fixture helper+チャンク跨ぎ再現 | P2 | PR #690 READY |

## 実行ステップ(各 Bolt 共通、worktree 隔離の実装サブエージェントが実施)

- [x] origin/main から短命ブランチ `fix/<bolt-slug>` を作成
- [x] 回帰テストを先に書き、未修正コードに対して**赤**を実測(exit code 記録)— 落ちる実証
- [x] requirements.md の該当 FR/AC どおりに修正を実装
- [x] 回帰テストの**緑**を実測。core を触る Bolt は `bun scripts/package.ts` + `bun run promote:self` を同一コミットに含める
- [x] 検証: typecheck / lint / dist:check / promote:self:check / tests/run-tests.sh --ci(実測 exit code)
- [x] 英語コミット、push、Issue リンク付き PR 作成
- [x] codex メンバーへレビュー直接依頼(690/692→codex-1、691/694→codex-2、693/695→codex-3)— 全件 READY

## トレーサビリティ

各 Bolt の実装は requirements.md の AC 番号(AC-674-1〜AC-668-6)へ 1:1 で遡及し、詳細は各 `construction/<unit>/code-generation/code-summary.md` に記録。工程記録は conductor ブランチのチェックポイントコミットで本線へ流し、実装 PR には含めない(6 PR とも amadeus/ 混入なしをステージレビューで確認済み)。

## #668 の統合作業の分離

AC-668-4 の codekb 統合(`codekb/amadeus/` への一本化+旧ディレクトリ削除)は、derivation 修正 PR(#693)のマージ後に conductor が workspace データ移行として実施する(修正マージ前に統合すると codekb-path が旧名を返し再分裂するため)。ステージレビューの minor 指摘どおり、マージ後の明示タスクとして追跡する。
