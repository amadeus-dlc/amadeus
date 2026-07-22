# Performance Design — plugin-projection

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 決定的batch設計

plugin projectionはruntime serviceではなく、既存Bun/TypeScript packager内の有界なbuild-time batchとして実行する。repository rootの`plugins/<name>/`だけをname順で発見し、C1の検証結果を全件確認してからprojectionを開始する。plugin、artifact、harness、manifest field、driftはそれぞれcanonical sortし、filesystem列挙順を出力へ漏らさない。

正準public seamは`discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree`の4関数に限定する。self-install投影は既存C5内部helperと`promote-self.ts`に閉じ、新たなpublic呼出し層を作らない。

## 生成経路と資源境界

6 harnessの期待treeを同一source snapshotからtemp rootへ全生成し、全validation、collision検査、serializationが成功した後だけgenerator ownership内へcommitする。成功したharness単位のpartial commitは行わない。plugin 0件では既存build path、順序、serializationをそのまま使い、空index、空directory、manifest keyを追加しない。

persistent cache、worker pool、daemon、network fetch、retry loop、parallelism policyは導入しない。絶対build時間、latency、throughputの新閾値も設けず、既決の同一最終SHA verificationを合格条件とする。

## 検証

- pluginとartifactの入力順を反転しても、6 harnessと`dist/plugins/`のbytesおよびdrift順が一致する。
- plugin directoryなしと0件の双方で、既存6 harnessのfile set、content、order、CLI resultがbyte-identicalである。
- invalid、duplicate、unsafe path、collisionの各fixtureでcommitted dist/self-installへのwriteが0件である。
- targeted projection/drift/zero-plugin testsとfull verificationを同一最終SHAでexit 0とし、stale結果をgreenへ読み替えない。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U09-01〜05、`security-requirements.md`のvalidation-before-write、`scalability-requirements.md`の6×4 closed matrix、`reliability-requirements.md`のno-partial update、`tech-stack-decisions.md`の既存Bun/TypeScript stack、`business-logic-model.md`のProjection pipelineを具体化する。

## Review — Iteration 1

- Reviewer identity: amadeus-architecture-reviewer-agent
- Reviewed at (UTC): 2026-07-21T03:18:55Z
- Verdict: READY
- Iteration: 1
- Critical / Major / Minor: 0 / 0 / 0

### Scope decision

closed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。consumes元、`memory.md`、`plan.md`、reasoning、record root、sibling Unit成果物は対象外である。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

正準4 public seam、C1 validation-before-write、6 package/4 self-installのclosed inventory、temp全生成後commit、plugin 0件のbyte互換、`MISSING`・`DIFFERS`・`ORPHAN`・`UNREFERENCED`のclosed drift分類が5成果物間で整合している。第二schema/parser、新harness、partial commit、network、dependency、service、SLOへのscope逸脱はない。

### Sensor evaluation

- required-sections: PASS（5成果物すべてにH2見出しが2件以上ある）
- upstream-coverage: PASS（5成果物すべてが`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を参照する）
- answer-evidence: PASS（Q&Aに既決裁定と`[Answer]`がある）
- linter: 非該当（Markdown-only）
- type-check: 非該当（Markdown-only）

### Recorded review裁定

E-USSU13NDR1はREADYを受理し、未解決findingなしとしてreviewを閉じるchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:23:42Z`）。

## §13 disposition

E-USSU13NDS13はmemory entries、candidates、parked open questionsが0/0/0であることを確認し、0件で可・新規横断学習なしとするchoice 1を3票、choice 2を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:23:42Z`）。prescriptive rule、verification sensorともにpersistしない。
