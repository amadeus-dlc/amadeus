# Performance Design — harness-hook-correctness

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。invocation-local処理へ限定し、新SLO、cache、pool、queueを追加しない。

## Runtime spawn path

`spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult`を既存adapterの実在child-spawn siteへ置く。argv[0]はadapter自身を起動した絶対`process.execPath`、argv[1..]は受領`args`を順序不変で渡す。stdin、stdout、stderr、cwd、exit code、signalの既存契約は変えず、PATH lookup、runtime discovery、shell command文字列生成を行わない。

adapterごとの重複処理はこの正準seamへ薄く接続するが、spawn siteがないharnessへwrapperを追加しない。同期/非同期方式やbuffer policyは既存呼出元の契約を維持し、本Unitで新たに選ばない。

## Payload・settings path

- `parseKiroIdeHookContext(payload: unknown): HookContextResult`は一つの`USER_PROMPT` payloadを一度だけparseし、stdin再読取や二重JSON parseをしない。
- `renderClaudeHookCommand(projectDirVariable: "$CLAUDE_PROJECT_DIR", hook: HookSpec): string`はauthored settingsを一度parseした列挙結果のうち承認済み11 hook commandだけを決定順でrenderする。
- statuslineとpermission globはrender対象外とし、before/after bytesを比較する。
- 6 harness projectionは既存manifest-driven package generatorから一回導出し、generated treeの再走査による第二正本を作らない。

## Resource境界と検証

resource pool、persistent worker、daemon、cache、queue、network connectionは存在しない。PATH除去spawn、Kiro payload positive/negative、11 command空白path、6面projection driftをunit/integration fixtureで測り、手動時間観察や未根拠budgetを合格条件にしない。

同一最終SHAでtargeted tests、typecheck、lint、dist、promote-self、full CIを通し、push前local lcov patch追加行未カバー0と既決waiver条件を満たす。

## トレーサビリティ

本設計は`performance-requirements.md`の有界処理、`security-requirements.md`の入力境界、`scalability-requirements.md`の全数matrix、`reliability-requirements.md`のfailure経路、`tech-stack-decisions.md`のBun/TS維持、`business-logic-model.md`のFlow A〜Cを実装可能な配置へ写像する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-21T00:04:25Z`
- Verdict: **READY**
- Scope decision: **候補なし**

### Findings

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| MAJOR | 0 |
| MINOR | 0 |

### Confirmed checks

- public seamは`spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult`、`parseKiroIdeHookContext(payload: unknown): HookContextResult`、`renderClaudeHookCommand(projectDirVariable: "$CLAUDE_PROJECT_DIR", hook: HookSpec): string`の正準3関数だけで、signature/API追加はない。
- Runtime Spawn Seamはadapterを起動した絶対`process.execPath`をargv[0]に使い、args順序、stdin/stdout/stderr、cwd、exit code、signalの既存spawn契約を保存する。PATH fallback、shell文字列、別runtime discoveryを追加しない。
- Kiro IDEはfailed/unknown/malformed payloadを成功artifactへ昇格せず、既知success wordingからpathを抽出できない場合は理由付きvisible dropへ閉じる。host固有payloadをcore型へ昇格せず、path/identity/drop classifierは内部helperである。
- success writeは同一canonical payloadをaudit-firstでsensorへ渡し、audit失敗をsensor成功で隠さない。state syncはaudit tailの最新未完了stageだけをforward-onlyに反映し、payload-free runtime/state targetはaudit-tail self-gateを使う。advisory/debug failureは既存fail-openを維持する。
- Claude変更対象はauthored settingsの承認済み11 hook commandだけで、project directory/script pathをdouble quoteする。statuslineとpermission globは変更せずbefore/after bytes不変を検証し、settings traversalは内部helperへ閉じる。
- package projectionは既存manifest/generatorによる6 harness、self-installはclosed list 4面だけである。sourceを正本とし、projection driftを非0にし、projection scopeやdormant wrapperを増やさない。
- logical componentはauthored adapters、3 public seams、内部classifier、既存audit/state targets、package/self-install projector、verification fixturesへ閉じる。failure domainとblast radiusはadapter/event/command/projection gate単位で、shared cache/queue/network/database/AWS infrastructureを持たない。
- test配置はpure classifier/seamをunit、filesystem・child spawn・package projectionをintegration、必要最小の配布journeyをe2eとする。PATH除去、stdin未close、payload positive/negative、identity、空白path、11 command、6/4 matrix、対象外bytesを対照fixture化できる。
- NFR-5のtargeted tests、typecheck、lint、dist、promote-self、full CIを同一最終SHAで通し、NFR-6のlocal lcov patch追加行未カバー0・in-process seam・既決waiver条件を満たす設計である。
- 新ownership、failure分類、retry、recovery、SLO、cache、queue、AWS infrastructure、network、database、metrics、retention、audit event、projection scopeは混入していない。

### Sensor results

- Applicable sensor results: **11/11 PASS**。
- `required-sections`、`upstream-coverage`、`answer-evidence`: **PASS**。
- `linter`、`type-check`: Markdown成果物のため非該当。

### Summary

5設計成果物はE-OC1承認済みのhook correctness NFRを既存C6 adapter/package/test境界へ実装可能な形で配置している。
