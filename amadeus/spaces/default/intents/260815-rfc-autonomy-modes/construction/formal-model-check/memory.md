<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-19T10:05:00Z — 【訂正済み】本線ワークフローの本ステージは、直前の tla-authoring が `author-new` へルートしたにもかかわらず新規登録モデルが存在しない状態で実行した(Steps 2〜6 をユーザー裁定により独立 intent = Issue #3246 へ分離したため)。当初この節に「既存の登録 4 モデルに対する検査結果を本ステージの検証実績として扱った」と書いたが、**これは誤りであり撤回する**。§13 選挙 E-260819-RFC0001-FMC-S13 の両票が独立に指摘したとおり、登録 4 モデル(BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate)は author-new が選定した subject(FR-3 の waiting terminal)を一切覆っていない — applicability-assessment.md の語彙 census と `vocabulary.namedInvariants` の全列挙が「waiting terminal・その resume 条件・rate 制約を守る不変量は不在」を確定させている。無関係な検査の成立を対象 subject の検証成立へ代入することは `cid:build-and-test:verdict-names-unverified-facets` に反する検証劇場である。
  正しい記録: **FR-3 の形式検証は未実施であり、open item として Issue #3246 へ持ち越されている。** 本ステージで実測したのは既存 4 モデルの drift 不在と無退行のみ — model-map の実装ハッシュピン 4 モデル 13 エントリすべて MATCH(drift 0)、`model-completeness` センサー exit 0、plugin-activation advisory は `{"verdict":{"kind":"no-hold"}}`、登録 4 モデルは handoff 実行で全て NOT_DETECTED(exit 0)。halt 条項(ステージ本文 `:37` 逐語 `A missing or contradictory outcome is a halt.`)を免除する一般則としては扱わない — 分離は tla-authoring の human gate におけるユーザー裁定であり、その provenance(裁定日・分離先 Issue 番号)は applicability-assessment.md に明記済みである。
- 2026-08-19T07:52:49Z — 先行 applicability outcome なしの明示 --single 実行で、model-map.json 宣言の全4モデルを検査対象とした; 【訂正】当初「--model 指定のない起動では requested model が未定義になる」と解したが、ステージ本文 frontmatter `:7` の condition が逐語で 『Explicit single-stage runs check the selected registered model or all registered models.』と定めており曖昧さは正本側で解決済みだった(実読で確認)。発火元の advisory は target を spec ディレクトリ全体(amadeus/spaces/default/specs/tla、reason: never-run)としていたため、model-map.json が宣言する全ペアを宣言順に検査する読みを採った。実測: BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate の4モデルすべて run-model-check.ts で NOT_DETECTED(exitCode 0)。runId = 9dd237cc-1a43-45a2-afa5-ebe2c6ce0422 / 4de4fca8-a3ad-4cd6-9588-7b32f44f24c6 / 658092e3-2fc3-4713-9d01-57ef1434d1d1 / 20e2b446-3533-4cb1-bdb4-7e49c2533630。--out は repo 外の scratchpad(cid:formal-model-check:c2 に従い run-model-check-ci.ts は使わず単一モデル経路を使用)。完了した検査であるため本文 Step 4 の plugin-activation.ts record .claude を実行し、advisory は no-hold へ遷移。model-completeness センサーは passed。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
