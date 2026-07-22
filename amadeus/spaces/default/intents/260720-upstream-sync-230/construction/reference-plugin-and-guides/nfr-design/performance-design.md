# Performance Design — reference-plugin-and-guides

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Minimal fixture設計

canonical `plugins/test-pro/`は、既決schema、4 seam、declared fragmentを実証する必要最小artifactだけを持つ。第二plugin implementation、fixture fleet、具体slug・表示文言・filesystem pathの互換性契約を作らない。authoring sourceを唯一の正本とし、generated treeを手編集しない。

## Single lifecycle E2E

一つのtemp repository/hostで、authoring source配置、U01 validation、U09の6面projection、U10のinspect/plan/temp compose、compile/sensor、doctor、record-owned drop、再compile/doctorを順に実行する。分断fixtureの成功をlifecycle closureへ読み替えない。

package 6面とself-install 4面は同じsourceから別matrixで全数検査する。success/failureの双方でtemp rootとtracked source treeを分離し、tracked一時物を0にする。新parallelism、cache、retry、fixture sharding、時間閾値、service SLOは追加しない。

## Verification

- 必要最小fixtureが追加runtime APIなしでU01 schemaを通過する。
- 単一E2Eで宣言成果物だけがcompose/doctor/dropされ、unrelated host bytesが不変である。
- 6 package面とclosed 4 self-install面を独立検証し、kiro系をself-installへ昇格させない。
- lifecycle前後とfailure後のtracked tree byte comparisonで一時物0を証明する。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U11-01〜04、`security-requirements.md`のsource/host integrity、`scalability-requirements.md`の6/4 matrix、`reliability-requirements.md`のlifecycle closure、`tech-stack-decisions.md`の既存plugin pipeline、`business-logic-model.md`のFixture/E2Eを具体化する。

## Review — Iteration 1

- Reviewer identity: amadeus-architecture-reviewer-agent
- Reviewed at (UTC): 2026-07-21T04:00:39Z
- Verdict: NOT-READY
- Iteration: 1
- Critical / Major / Minor: 0 / 1 / 0

### Scope decision

closed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。consumes元、`memory.md`、`plan.md`、reasoning、record root、sibling Unit成果物は対象外である。

### Findings

- Critical: なし
- Major: 1件 — E-OC1はguideへAmadeus path/namespace、supported lifecycle、no-clobber、failure不変、record-owned drop、local/temp検証、6 package/4 self-install差を記載すると確定している。しかしSecurity Designのguide節とLogical ComponentsのGuide Author責務は、path/namespace、supported/deferred、failure、6対4までしか明示せず、no-clobber、record-owned drop、local/temp検証をguideへ記載する要件が欠落している。これらをGuide Authorの必須出力とguide verificationへ明記しなければ、実装挙動が存在しても利用者向けguideが既決境界を満たさない可能性がある。
- Minor: なし

test-pro一件、単一E2E、6 package/4 self-install別matrix、宣言成果物限定、tracked一時物0、deferred一覧は相互整合している。guide必須面の一部が成果物化されていないため、現時点では実装へ進める状態ではない。

### Sensor evaluation

- required-sections: PASS（5成果物すべてにH2見出しが2件以上ある）
- upstream-coverage: PASS（5成果物すべてが`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を参照する）
- answer-evidence: PASS（Q&Aに既決裁定と`[Answer]`がある）
- linter: 非該当（Markdown-only）
- type-check: 非該当（Markdown-only）

### Recorded review裁定

E-USSU17NDR1はIteration 2 READYを受理（推奨）し、旧Major解消・未解決findingなしとするchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T04:05:50Z`）。

## §13 disposition

E-USSU17NDS13はmemory entries、candidates、parked open questionsが0/0/0であることを確認し、0件で可（推奨）・新規横断学習なしとするchoice 1を3票、choice 2を0票、GoA 1を3票で裁定した（開票 `2026-07-21T04:05:50Z`）。prescriptive rule、verification sensorともにpersistしない。

## Review — Iteration 2

- Reviewer identity: amadeus-architecture-reviewer-agent
- Reviewed at (UTC): 2026-07-21T04:02:04Z
- Verdict: READY
- Iteration: 2
- Critical / Major / Minor: 0 / 0 / 0

### Scope decision

Iteration 1と同じclosed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。consumes元、`memory.md`、`plan.md`、reasoning、record root、sibling Unit成果物は対象外である。

### Finding disposition

Iteration 1 Major findingは解消済みである。Security DesignとLogical Componentsは、Amadeus path/namespace、supported lifecycle、no-clobber、failure時三面不変、record-owned drop、local/temp verification、6 package対4 self-install、deferred一覧をGuide Authorの必須出力およびverification checklistとして明示した。no-clobberとrecord-owned dropはU10契約、local/temp手順はTracked-tree Guardの一時物0証拠へ接続され、guideから欠落する余地が閉じられた。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

test-pro一件、単一E2E、6 package/4 self-install別matrix、宣言成果物限定、tracked一時物0、guide必須面、deferred境界が5成果物間で整合し、新規scope越境もないため、実装へ進める状態である。

### Sensor evaluation

- required-sections: PASS（5成果物すべてにH2見出しが2件以上ある）
- upstream-coverage: PASS（5成果物すべてが`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を参照する）
- answer-evidence: PASS（Q&Aに既決裁定と`[Answer]`がある）
- linter: 非該当（Markdown-only）
- type-check: 非該当（Markdown-only）
