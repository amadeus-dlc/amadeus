<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-21T07:13:53Z — 最新ユーザー裁定は検証対象をAmadeus repository内へ限定する; openai/codex clone、cargo test、外部Codex source/test検証、危険prompt、filter回避、旧一時checkout/process再利用を行わず、current runへの入力を0件に保つ。
- 2026-07-21T07:42:50Z — 最新の人間指示とleader契約は、positive実表示不足をproduction activationのfail-closed境界へ限定する; test-only closed-schema fixtureでstate machineをTDD検証するが、production supported fingerprint allowlistはexact raw bytes・version・columns provenance取得まで空とし、current run入力0件を維持する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-21T07:42:50Z — 旧planの「positive fixtureを実表示captureできなければ実装停止」を、人間裁定により「production activationだけdisabled、実装・検証・review・Build & Test handoffは継続」へ改訂した; test-only fixtureはproduction entrypoint、CLI、environment、runtime filesystemから機械的に到達不能にする。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-21T07:15:30Z — fixture gate待ちではfake Herdrの既存lifecycle baselineだけを実行した; `bun test tests/integration/t-team-up-codex-resume.test.ts`は24件PASSしたが、positive fixtureまたはproduction Enterの正当化には使わず、開始時点のfresh/resume/kill/rollback非退行証拠に限定する。
- 2026-07-21T07:42:50Z — productionとtestで同じfixture loaderを共有せず、pure matcherだけを共通interfaceとする; test adapterはclosed-schema fixtureを明示注入できる一方、production decisionは空allowlistを内部所有して注入seamを公開しないため、少量の重複よりactivation境界の機械的非到達を優先する。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-21T07:42:50Z — 実表示のsanitized exact raw bytes・version・columns provenance取得だけがproduction activationの未解決条件として残る; 実装、fake Herdr検証、formal review、Build & Test handoffを妨げるopen questionはない。
