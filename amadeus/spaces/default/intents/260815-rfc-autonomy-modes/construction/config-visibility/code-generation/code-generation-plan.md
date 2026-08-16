# Code Generation Plan — unit config-visibility(U7 / C7+C8 / FR-7+FR-8)

## 拘束

- R-1/R-2 / ADR-8: `solo-election.trigger.mode` はconfig leafとして存在しない。旧キー(3系統・計6文字列)はすべて loud fail(exit非0+理由)する。
- R-5: `deriveSoloElectionTrigger(mode)` は `AutonomyMode` のみを入力に取る純関数(`none→manual`、`semi|full→auto`)。ファイルI/O・config解決を内部で行わない。
- R-6 / FR-8: `statusAutonomyFacet(projectDir)` は独自の対話性・投影判定ロジックを持たず、U2の`resolveSessionInteractivity`・U5/U6の投影関数・本unitの`resolveAmadeusConfig`結果を素通しで合成する。
- R-8: `amadeus-election.ts:274`と`amadeus-orchestrate.ts:4139`は owned-files外のFD記載だったが、team-lead dispatchが明示的にこの2ファイルの改修を割当。`inception/units-generation/unit-of-work.md`の現行(post-review, iteration-2 READY)版がU7 ownedと記載していることを確認して優先し、FDリーフ文書側を stale として扱った(下記「申し送り」)。

## TDD 順序(実施順)

1. R-1〜R-5(registry): 改修前の `amadeus-config.ts` に対し `t431-structured-config.test.ts` を実行 → Red(`Export named 'deriveSoloElectionTrigger' not found`)。
2. registry abolish/rename(`LEGACY_PATH_REPLACEMENTS`/`LEGACY_KEY_REPLACEMENTS`の廃止/改名分割)を実装 → Green(17/17 pass)。
3. R-6(C8 statusAutonomyFacet、新規モジュールにつき事前exportなし): `t3130-status-autonomy-facet.integration.test.ts`/`t3131-nonInteractiveMarker.test.ts` を先に作成 → importが解決できず失敗 → `amadeus-autonomy-status-facet.ts`実装 → Green(4/4、2/2)。
4. owned-consumer編集(`amadeus-election.ts`/`amadeus-orchestrate.ts`): 既存テストが実行時経路をカバー済みのため `bun run typecheck` をRedゲートとして使用(`TS2339 soloElection does not exist on config type`、2箇所を確認してから修正)。
5. 下流consent-field consumer(6ファイル)・docs・test の同期。

## 検証・配送

- swarm batch 4(config-visibility / presence-closure)。
- referee: `42f99aa32 integrate bolt-config-visibility (batch 4)` で `swarm-int-rfc0001` へ収束。base `57f40d5d5`(batch3統合断面)。
- worktree: `.amadeus/worktrees/bolt-config-visibility`、branch `bolt-config-visibility`、HEAD `b962c2712`。
