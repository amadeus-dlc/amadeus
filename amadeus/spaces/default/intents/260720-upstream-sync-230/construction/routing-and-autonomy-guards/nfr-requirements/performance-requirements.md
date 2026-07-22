# Performance Requirements — routing-and-autonomy-guards

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存Bun CLI process内のpure classificationと単一marker statを対象とし、network latencyやthroughput SLOは追加しない。

## 有界実行要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U04-01 | help分類は共有decision tableをtoken列へ適用し、record scanを行わない。 | engine parser、terminal classifier、direct utilityの結果が同一。 |
| PERF-U04-02 | marker freshnessは単一pathのstat、注入された`nowMs`、単一定義の24時間TTLから計算する。 | directory walk、polling、retry loop 0件。 |
| PERF-U04-03 | autonomous ConstructionのStop hookはmarker I/O前にcontinue-enforcementを確定する。 | marker stat/unlink 0件、janitor N/A、marker bytes不変。 |
| PERF-U04-04 | recompose autonomy guardはstate snapshot直後、plan/graph/checkbox/audit mutation前に評価する。 | denied fixtureの全対象bytesがbefore/after一致。 |

24時間はcompose markerの既決freshness thresholdであり、service response-time SLOではない。wall clock実測値をperformance合格条件にせず、fake clock/stat/unlinkで分岐を決定的に検証する。

## Resource・verification境界

daemon、network call、database、cache、queue、background janitorを追加しない。non-autonomous stale時だけ既存Stop hook invocation内でbest-effort unlinkを行い、unlink結果をblock判断へ逆流させない。

targeted test、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施・stale結果をgreenへ読み替えない。push前local lcovでpatch追加行の未カバー0を確認し、spawn blind spotは実測後に計測済みmoduleへのin-process seamで覆う。waiverは既決条件の明示証拠を満たす残余行だけに限定する。

## トレーサビリティ

PERF-U04-01〜04は`business-rules.md`のBR-U04-01〜25、`business-logic-model.md`のHelp/Marker/Recompose workflow、`requirements.md`のFR-1、NFR-1〜8、`technology-stack.md`のBun/TypeScript/test stackに対応する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T15:31:49Z`
- Verdict: **READY**
- Scope decision: **none**

### Findings

- **BLOCKER: 0 / MAJOR: 0 / MINOR: 0**

### Architecture checks

- E-USSU04FD1=A、E-USSU04FD2=AとBR-U04-01〜25をNFRへ機械導出しており、単一marker path、単一24時間TTL、`age <= 24h` fresh、`age > 24h` stale、future mtime age 0のclosed boundaryが一致する。
- non-autonomousだけがstale判定後にbest-effort janitorを実行し、unlink成功/失敗からcarve-out decisionを分離する。autonomous Constructionはmarker I/O前にcontinue-enforcementを確定し、marker未読・janitor N/A・bytes保持となる。
- doctorは同一freshness seamをread-onlyで投影し、probe failure時も他checkを継続する。marker path、bytes、mtimeを変更する設計はない。
- autonomous recomposeはstate snapshot直後かつplan、graph、checkbox、auditの全mutation前に拒否され、before/after bytes不変を対照fixtureで検証する。gated/unsetの既存strict validationは緩和されない。
- NFR-5のtargeted testsと5つの最終gate、NFR-6のpatch追加行未カバー0、計測済みmoduleへのin-process seam、既決waiver条件が明記されている。
- availability、latency、throughput、RTO/RPOなどの未承認SLO、追加failure policy、追加public APIは導入されていない。公開seamは`classifyHelpIntent`、`inspectComposeMarker`、`assertRecomposeAllowed`に限定される。

### Sensor results

- **11/11 PASS**: `required-sections` 5/5、`upstream-coverage` 5/5、`answer-evidence` 1/1。
- `linter` / `type-check`: 対象となるTypeScript/JavaScriptコード成果物なし。
