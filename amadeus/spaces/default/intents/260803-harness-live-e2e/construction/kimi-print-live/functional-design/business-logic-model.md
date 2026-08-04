# Business Logic Model — kimi-print-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U06は既存Kimi print driverをC1〜C4/C7〜C9へ接続するC5/C6 sliceである。

## Execution Workflow

1. C2は`GITHUB_ACTIONS === "true"`を最優先し、次に`AMADEUS_KIMI_PRINT_LIVE === "1"`を評価する。deny時はphase evidence読取り、probe、lease、scratch、spawnを0回にし、正本どおり`CI_FORBIDDEN`→`OPT_IN_REQUIRED`の優先順位で返す。
2. gate許可後、C4は`PhaseClosureEvidence(phase="phase-1")`を検証する。U04/U05の各行がdurable green receiptまたは受入条件を満たすIssue evidenceで閉じ、registry・ledger・matrixが同一状態を示さなければ、`LiveOutcome`を生成せず`Result.err({kind:"contract-invalid", cause:{kind:"phase-prerequisite-unmet", phase:"phase-1"}})`でfail-closedにする。
3. C5は`AMADEUS_KIMI_MODEL`を検証する。入力はbare IDまたは正確な`kimi-code/` prefix付きIDとし、prefix除去後のIDが`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`を満たす場合だけ受理する。未指定は`k3`。不正値はprobe/lease/scratch/spawn前に`Result.err({kind:"contract-invalid", cause:{kind:"invalid-model-id"}})`とする。
4. C5 preflightは`kimi` binary、version `>=0.29.0`、help上の`-p|--prompt`と`--output-format`、`dist/kimi`、`CredentialSourcePort.canLease(["credentials","oauth"])`をread-only検査する。2026-08-03のローカル実測versionは`0.31.1`である。
5. C4が`ResourceRegistrar`を作成してからfresh project/homeを確保し、`dist/kimi`の`.kimi-code`、`amadeus`、`AGENTS.md`だけをscratch projectへ配置する。
6. C5は検証済み`KimiModelId`からstructured `KimiConfigDocument`を組み立て、scratch `KIMI_CODE_HOME/config.toml`へ非秘密のmanaged provider/model設定を生成する。raw env文字列の置換や任意TOML fragmentの連結は禁止する。
7. C5はsource Kimi homeの存在する`credentials`と`oauth`だけをopaque `CredentialLease`として取得する。各scratch symlinkは作成前にregistrarへplanned登録し、作成直後にcreatedへ遷移する。childへ渡すのはscratch `KIMI_CODE_HOME`だけで、source home、source path、token、lease locatorをargv/env/result/log/ledgerへ出さない。
8. C5はscratch cwdで`kimi -p "/skill:amadeus --status" --output-format text`を起動する。child envは`PATH`,`HOME`(scratch),`TMPDIR`(scratch),`KIMI_CODE_HOME`(scratch),`LANG`,`LC_ALL`,`NO_COLOR`だけから構成し、ambient envをspreadしない。
9. C6はexit 0、timeoutなし、combined outputのcase-insensitive substring `no active`、`amadeus/spaces/default/intents`不存在を検査する。自然言語全文一致は使わない。
10. C4は180秒のjourney deadlineでabortし、10秒のSIGTERM grace、続く10秒のSIGKILL/reap budgetを適用する。外側Bun test timeoutは240秒、retryは0回とする。
11. `finally`境界でcredential symlinkを最初に削除し、その後scratch cleanupと漏洩検査を両方試行する。debug保持でもsymlinkとconfigは残さない。最後にreceiptをatomic appendし、registry/ledgerからmatrixを再生成する。

## Exact Scratch Configuration

```toml
default_model = "kimi-code/k3"

[providers."managed:kimi-code"]
type = "kimi"
api_key = ""
base_url = "https://api.kimi.com/coding/v1"

[providers."managed:kimi-code".oauth]
storage = "file"
key = "oauth/kimi-code"

[models."kimi-code/k3"]
provider = "managed:kimi-code"
model = "k3"
max_context_size = 1048576
```

model override時は、closed grammarで検証してbrand化した`KimiModelId`から`KimiConfigDocument`の`defaultModel`、model table key、provider model fieldを設定し、serializerで全体を生成する。文字列置換は行わない。

## Result Mapping

| Observation | Result |
|---|---|
| CI / opt-in deny | canonical skip、external call 0 |
| Phase 1 closure不成立 | `Result.err(contract-invalid/phase-prerequisite-unmet)`、LiveOutcomeなし、external call 0 |
| model override不正 | `Result.err(contract-invalid/invalid-model-id)`、LiveOutcomeなし、external call 0 |
| binary/version/dist/auth不足 | canonical preflight skip。ただしU06完了の代替にはならない |
| spawn error / non-zero | `FAIL:EXECUTION_FAILED` |
| journey deadline | `TIMEOUT:JOURNEY_TIMEOUT`、terminate/reap |
| output/state anchor不成立 | `FAIL:ASSERTION_FAILED` |
| cleanup/leak/ledger failure | green禁止、typed failure |
| all anchors + durable receipt | `PASS:SUCCESS` |

## Verification

- fake executableがargv、cwd、env keys、config digest、symlink lifecycleを記録する。
- source pointer/secret、ambient env、GHA、implicit opt-in、cleanup failureをそれぞれ注入してU02 contract kitをredにする。
- live testは実CLI・実modelのstatus journeyを直列実行し、CLI/auth unavailableを後続Issueへ変換しない。
- registry、ledger、matrix、runbook triggerを`kimi-print` adapter IDへ接続する。

U02 suite bindingは`kimi-print-contract`。baselineは上記契約でgreen、mutantは`CREDENTIAL_LINK_UNREGISTERED→RESOURCE_REGISTER_BEFORE_CREATE`、`SOURCE_AUTH_PATH_EXPOSED→SOURCE_POINTER_ABSENT`、`AMBIENT_ENV_SPREAD→ENV_ALLOWLIST_EXACT`、`PHASE1_CLOSURE_BYPASSED→PHASE_PREREQUISITE_REQUIRED`、`MODEL_ID_TOML_INJECTION→MODEL_ID_GRAMMAR_REQUIRED`をそれぞれredにする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:52:03Z
- **Iteration:** 1
- **Scope decision:** none

依存循環や参照切れはないが、Phase前提判定が共通gate precedenceとclosed LiveCodeに違反し、model overrideの安全な生成契約も未確定である。

### Findings

- BLOCKER | Phase前提判定が共通gate precedenceとclosed LiveCodeに違反する | business-logic-model.mdはPhase 1 closure検証をCI/opt-in gateより先に行い、不成立を`FAIL:PHASE_PREREQUISITE_UNMET`へ分類する。しかしrequirements.md FR-2とcomponent-methods.mdのclosed `LiveCode`にこのcodeはなく、FR-2はCI_FORBIDDEN→OPT_IN_REQUIREDの優先順位を要求する。Phase証跡不成立かつGITHUB_ACTIONS=trueでは未登録codeがCI_FORBIDDENより先に返る。 | C2 gateをPhase証跡検証より先に固定し、Phase前提不成立を既存`LiveRunError.contract-invalid`等へ割り当てるか、FR-2/C1の正本と全contract testを正式に同期改訂する。
- BLOCKER | AMADEUS_KIMI_MODELのTOML生成境界が安全に実装できない | business-logic-model.mdは環境変数値を「sanitized ID」として引用値とTOML table keyを含む3箇所へ置換するが、許可文字、長さ、escaping、拒否時結果を定義していない。引用符や改行を含む値の扱いによってconfig破損またはcredential-bearing childへの設定注入が可能で、FR-4の設定隔離を実装者の推測に委ねる。 | model IDのclosed grammarと最大長を定義し、文字列置換ではなくTOML serializerで生成する。invalid overrideはspawn前にfail-closedで拒否し、型付きエラーとnegative testを明記する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:53:42Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2 BLOCKERは解消された。C2 gateがPhase証跡検証より先に固定され、Phase前提不成立はclosed LiveCodeへ混入せず既存contract-invalidへ割り当てられた。model overrideもclosed grammar、長さ、fail-closed結果、structured documentとserializerによる生成、注入negative testまで定義され、上流契約と整合している。

### Findings

- None
