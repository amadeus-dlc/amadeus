# Performance Requirements — reference-plugin-and-guides

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。必要最小fixtureを既存seamへ通す検証であり、service latency/throughput SLOは追加しない。

## 有界fixture要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U11-01 | canonical `plugins/test-pro/`は既決schema/seam/fragmentを実証する必要最小artifactだけを持つ。 | 第二plugin implementation、対象外fixture 0。 |
| PERF-U11-02 | authoring→validation→6面projection→temp compose→compile/sensor→doctor→drop→再検証を一つのE2Eで実行する。 | lifecycle分断0。 |
| PERF-U11-03 | 6 package面と4 self-install面は同じsourceから別matrixで全数検証する。 | 6/4混同、self-install昇格0。 |
| PERF-U11-04 | success/failure後にtracked treeの一時物を0にする。 | tracked cleanup差分0。 |

新parallelism、cache、retry、fixture sharding、時間閾値を追加しない。具体slug、表示文言、fixture pathを性能契約にしない。

## Verification gate

単一lifecycle E2E、6/4 matrix、tracked-tree byte comparisonと、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施/stale結果をgreenへ読み替えない。push前local lcov patch追加行未カバー0、spawn seam、既決waiver証拠条件を満たす。

## トレーサビリティ

PERF-U11-01〜04は`business-rules.md`のBR-U11-01〜12、`business-logic-model.md`のFixture/E2E、`requirements.md`のNFR-1〜8、`technology-stack.md`に対応する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T23:51:14Z`
- Verdict: **READY**
- Scope decision: **候補なし**

### Findings

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| MAJOR | 0 |
| MINOR | 0 |

### Confirmed checks

- BR-U11-01〜12とFR-6 items 21–22に従い、`plugins/test-pro/`だけをauthoring正本とし、U01 schema、U09 projection、U10 compose/doctor/record-owned dropをそのまま再利用する。新runtime API、第二parser、第二plugin implementationはない。
- fixtureは既決schema/seam/fragmentを実証する必要最小artifact集合に限定され、具体slug、表示文言、fixture filesystem pathを公開contractや互換性軸にしていない。
- 単一E2Eはauthoring source→validation→6面projection→temp host compose→compile/sensor→doctor→record-owned drop→再compile/doctorを閉じた順序で実行し、分断fixtureをclosure evidenceへ読み替えない。
- compose/doctor/dropでは宣言成果物とplugin状態だけを生成・検出・除去し、lifecycle前後のunrelated host bytesを不変にする。same-name、malformed、unknown seamはU10のloud rejectとhost/record/audit不変を観測する。
- success/failure双方でtemp rootとtracked source treeを分離し、tracked一時物0をbyte comparisonで証明する。新fixture ownership、cleanup/failure policy、no-clobber/drop/atomicity意味論は追加していない。
- packageはclaude/codex/cursor/kiro/kiro-ide/opencodeの6面、self-installはclaude/codex/cursor/opencodeのclosed 4面を別matrixで全数検証し、kiro系を昇格させない。
- guide必須面はAmadeus path/namespace、supported lifecycle、no-clobber、failure不変、record-owned drop、local/temp検証、6/4差である。marketplace、lockfile、agents/scopes/memory/knowledge、`when`評価をdeferredとして明示し、実装済みと表現しない。
- U11はitems 21–22のtest/docs evidenceだけを所有し、projection、compose/drop、ledger closureのownerを変更しない。全体集約はU12だけが担う。
- NFR-5の単一E2E・matrix・tracked-tree比較と同一最終SHAのfull CI、NFR-6のpatch追加行未カバー0・spawn seam・既決waiver条件が明記され、未実施・stale結果をgreenへ読み替えない。
- 新compatibility、runtime API、dependency、service、database、network、UI、retention、SLO、audit eventの判断は混入していない。

### Sensor results

- Applicable sensor results: **11/11 PASS**。
- `required-sections`、`upstream-coverage`、`answer-evidence`: **PASS**。
- `linter`、`type-check`: Markdown成果物のため非該当。

### Summary

5成果物は承認済みreference plugin・E2E・guide契約を測定可能なNFRへ機械導出しており、追加のarchitecture judgmentなしで実装できる。
