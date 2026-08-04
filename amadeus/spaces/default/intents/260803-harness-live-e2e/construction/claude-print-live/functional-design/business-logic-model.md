# Business Logic Model — claude-print-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U03はClaude Code headless printをC1〜C4/C7〜C9へ接続するC5/C6 sliceである。

## Execution Workflow

1. C2が`AMADEUS_CLAUDE_PRINT_LIVE === "1"`とGHA hard denyを評価する。denyはprobe/process 0回のskip。
2. C5 preflightが`claude` binary、version `>=2.1.220`、required help flags、`dist/claude`、`CredentialSourcePort.canLease`、project-only setting capabilityを順に検査する。上位versionもrequired flagsの実測が通る場合だけ許可する。
3. C4がregistrarを作成後、fresh project/home、git、対象distを用意する。
4. C5が`<scratch-project>/.claude/settings.json`へ`{"hooks":{}}`だけを生成し、`CredentialBinding`をchild allow-listへ注入する。base env keysは`PATH`,`HOME`(scratch),`TMPDIR`(scratch),`LANG`,`LC_ALL`,`NO_COLOR`。authはnative keychain（env追加なし）または`ANTHROPIC_API_KEY` leaseだけを初期対応とし、それ以外はcapability unsupported。user/local settings、hooks、source auth/config pathは渡さない。
5. C5は`claude -p --setting-sources project --tools "" --no-session-persistence --output-format json --json-schema <schema> --max-budget-usd 0.25 <prompt>`をscratch cwdでspawnする。`--bare`は使わない。
6. C6はliteral prompt `Return the status object required by the JSON schema. Do not use tools.` とschema `{"type":"object","properties":{"amadeus_live_e2e":{"const":"ok"}},"required":["amadeus_live_e2e"],"additionalProperties":false}`を使う。exit 0、JSON envelopeの`is_error=false`、`num_turns>=1`、`structured_output.amadeus_live_e2e="ok"`を検査し、自然言語完全一致は使わない。
7. C4がtimeout時abort/reapし、全経路でcleanup/leak scan、receipt、atomic ledger appendを実行する。
8. explicit matrix update/checkがClaude print rowと実green SHA/versionを投影する。

journey deadlineは90秒、abort後のterminate/reap budgetは各10秒、外側Bun test timeoutは120秒とし、同値衝突を避ける。

## Claude Family Seam

`ClaudeFamilyContext`はproject settings builder、allowed child keys、result normalizer、version evidenceを共有する。print/SDK/TUIの起動・終了方式は各adapterに残し、U03はU04/U05のcommandやdriverをimportしない。

## Result Mapping

| Observation | Result |
|---|---|
| CI / opt-in deny | canonical skip、external call 0 |
| binary/version/dist/auth不足 | canonical preflight skip |
| spawn error / non-zero | `FAIL:EXECUTION_FAILED` |
| journey deadline | `TIMEOUT:JOURNEY_TIMEOUT`、abort/reap |
| schema/state/audit anchor不成立 | `FAIL:ASSERTION_FAILED` |
| cleanup/leak/ledger failure | green禁止、typed failure |
| all anchors + durable receipt | `PASS:SUCCESS` |

## Verification

- U02 contract kitでGHA、strict opt-in、env/settings isolation、timeout/cleanupを検証する。
- fake executableがargv、cwd、env key、project settings sourceを記録する。
- live testは実CLI・実modelでgreenが必須で、CLI/auth unavailableをfollow-up Issueで代替しない。
- registry、ledger、matrix、runbook triggerをClaude print adapter IDへ接続する。

U02 suite bindingは`claude-print-contract`。baselineは上記capability/commandでgreen、mutantは`CI_GUARD_BYPASSED→POLICY_CI_ZERO_CALLS`、`OPT_IN_AUTO_ENABLED→POLICY_STRICT_OPT_IN`、`AMBIENT_ENV_SPREAD→ENV_ALLOWLIST_EXACT`、`USER_SETTINGS_ENABLED→SETTINGS_PROJECT_ONLY`をそれぞれredにする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:39:25Z
- **Iteration:** 1
- **Scope decision:** none

依存循環はないが、C5 capability/config/credentialの具体契約、C6 journeyの決定的な実値、FR-10 violation-injection suite接続が未定義であり、開発者が安全かつ再現可能に実装できない。

### Findings

- BLOCKER | ClaudePrintCapabilityはminimum/measured version、allowed env keys、project setting source、anchor kindsを持つとされるだけで、値、検出規則、対応version判定、許可環境変数、sensitive key/source auth path、credential lease/injection方式、生成するsettingsのpath・内容が定義されていない。FR-3、FR-4および秘密非流出契約を安全に実装できない。
- BLOCKER | U03が所有するClaudePrintJourneyはliteral prompt、timeout値、期待schema、対象file path、期待state/audit eventを定義していない。commandもoutput formatを指定しないままstructured result schemaを要求しており、決定的assertionと必須live greenを再現できない。
- BLOCKER | U03はFR-10の担当Unitだが、U02 contract kitへ接続するsuite contract、baseline case、CI/opt-in/env違反のmutant case、期待するstable assertionが未定義であり、新規guardが実際に赤くなる証拠を実装・判定できない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:43:53Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の3 BLOCKERはすべて解消された。C5 capability/config/credential契約、C6の決定的journey仕様、FR-10のbaseline green・mutant red接続が具体化され、依存境界と安全契約も維持されている。

### Findings

- None
