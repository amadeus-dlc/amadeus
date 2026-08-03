# Performance Requirements — interaction-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Interaction Budgets

`requirements.md` FR-04／04A、`business-logic-model.md` のreserveInteraction、`business-rules.md` BR-IB-01〜26、`technology-stack.md` の短命CLIを適用する。

| Kind | Context | Default | Hard cap |
|---|---|---:|---:|
| primary question | Minimal | 2 | 4 |
| primary question | Standard | 5 | 8 |
| primary question | Comprehensive | 8 | 12 |
| material follow-up | 全Depth・1ラウンド | 1 | 1 |
| review iteration | 全Depth | 2 | 2 |

### 数値根拠と導出

測定断面は `technology-stack.md` 記載のobserved `6d84d06cb6e0a22626c8227709778215a91bc70f`。primaryの現行値は同断面の `stage-protocol.md` Depth guidance（Minimal 2–4、Standard 5–8、Comprehensive 8–12+）で、下端をdefault、有限な上端をhard capとし、`+`だけを除去したため丸めはない。review 2は同断面の`reviewer_max_iterations`既定値2をdefault／hard capへ昇格した。follow-upは現行unboundedを [#1999](https://github.com/amadeus-dlc/amadeus/issues/1999) の「最大1ラウンド」裁定へ置換するためdefault=hard cap=1とし、複数のmaterial ambiguityは1つのbatch interactionへ集約する。これらは回数の現行値／承認済み裁定から導出し、#1602 baselineはduration比較に使用する。

## Latency と Work Bounds

- reserve／resolve-or-createは1 canonical lock transaction。同一semantic key replayのevent／counter増分0。
- questionは各semantic itemを表示直前にreserveする。follow-upはstage instanceあたり1つのbatch interactionとしてreserveし、複数のmaterial ambiguityをその1 batchへ集約する。
- cap+1要求はrenderer／reviewerを呼ぶ前に拒否し、追加model invocation 0件とする。
- review iterationはREADY／NOT-READY／failedを問わずdispatch開始で1回消費し、3回目を開始しない。
- reviewのBudgetSubjectはstage instanceに固定し、artifactSetIdはiteration identity／evidenceだけに使う。artifact修正でcounterをresetしない。
- control／treatmentはUnit 1と同じ3 warmup＋20 runsでduration、3 counter、termination reasonを比較する。
- rendering latency自体へ根拠のないms閾値を置かず、model/provider差よりinteraction総数のhard boundをblocking指標とする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T06:05:00Z
- **Iteration:** 1
- **Scope decision:** none

interaction budgetの原子的reserve、crash時のfail-closed方針、境界テストは概ね実装可能だが、数値根拠、review counterのスコープ、answer fingerprintのprivacy契約にblockingな不整合がある。

### Findings

- Major | performance-requirements.md「Interaction Budgets」／tech-stack-decisions.md「技術選定」／requirements.md FR-08.3・Constraints 5 | primary 2/4・5/8・8/12、follow-up 1/3、review 2というdefault/hard capを固定しているが、必須根拠である#1602 baseline結果または現行既定値の測定値・observed SHA・導出規則が示されていない。3 warmup＋20 runsは測定手順にすぎず数値選定を正当化しないため、Constraint 5とFR-08.3を満たさない。Action: 各default/hard capについてbaseline/current-value evidence、測定断面、導出・丸め・安全余裕を表でtraceし、根拠が未取得なら数値確定を保留する。
- Major | scalability-requirements.md「Cardinality Bounds」「Growth Rules」／performance-requirements.md「Interaction Budgets」／business-logic-model.md「Review Reserve Flow」／requirements.md FR-04.1 | reliability上のreview budget scopeが不一致である。要件はstage instance単位、Growth Rulesは同一stage revisionでArtifactSet変更時もreset禁止とする一方、Cardinality Boundsは「stage revision／artifact setごとに最大2」と読め、ArtifactSet更新のたびに2回を再付与できる。review identityへartifactSetIdを含めることもcounter scopeとの混同を助長し、停止性を破る。Action: counterのBudgetSubjectをstage instance（必要なら明示されたrevision）へ一意に固定し、artifactSetIdはiteration identity/evidenceに限定する。ArtifactSet変更を跨ぐcap-1/cap/cap+1テストをblockingに追加する。
- Major | security-requirements.md「Content Safety と Authorization」「Threat Verification」／business-logic-model.md「Delivery と Crash Recovery」 | answer fingerprintを単に「不可逆digest」とするだけでは、低エントロピー回答や既知候補をoffline推測・横断相関でき、prompt／回答を保存しないprivacy目標を満たす実装が一意に決まらない。sentinel 0-hit検査もdigestからの推測可能性を検出しない。Action: keyed HMAC等の具体方式、domain separation、key owner・永続化・rotation、resume時の安定性、比較範囲を規定し、同一回答のidempotency、異回答conflict、raw sentinel非出現、別scope間の非相関を決定的に検証する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T06:08:50Z
- **Iteration:** 2
- **Scope decision:** none

review counter scopeはstage instanceへ統一され、HMAC方式も具体化された。しかし、budget数値の根拠は許可された上流成果物と矛盾し、HMAC keyのmachine-local永続化にも決定性・復旧性の未解決点が残る。

### Findings

- Major | performance-requirements.md「数値根拠と導出」／tech-stack-decisions.md「技術選定」／requirements.md FR-08.3・Constraints 5 | observed SHAはコード断面を示すだけで#1602 baseline結果ではなく、許可されたtechnology-stack.mdにも主張されたDepth guidance 2–4／5–8／8–12+は記載されていない。さらにrequirements.mdは#1602 baseline前の具体的budget固定を明示的に禁止しているため、「baselineはduration比較だけに使用する」という解釈は上流要件と矛盾する。follow-up 1ラウンドの承認済み根拠も許可された要件内では解決しない。Action: #1602 baseline receiptと現行値の一次証拠を明示的なconsumeへ追加して各数値を再導出するか、baseline完了まで具体値を未確定として扱う。
- Major | security-requirements.md「Content Safety と Authorization」「HMAC key lifecycle」／reliability-requirements.md「Interaction Correctness SLO」／requirements.md NFR-01・NFR-02・FR-08.5 | HMAC keyをgitignoredな`.amadeus-sessions`だけに置くため、通常のmachine-local runtime清掃、別worktree／clone、machine lossでcanonical audit上の既存fingerprintを検証不能にし、同じdurable stateでもkey有無によりidempotent successとunavailableへ分岐する。fresh session resumeのblast radiusと復旧契約が閉じていない。また`canonical answer bytes`のencoding、Unicode、改行正規化が未定義で、harness差により同じ回答をconflictにできる。Action: key保管のretention owner、cleanup除外、portable recoveryまたは明示的な非移行制約、key availabilityを含む決定的state/capability契約を定義し、canonical byte encodingを固定してkey loss・別process・別worktree・Unicode/改行差のテストをblockingにする。
