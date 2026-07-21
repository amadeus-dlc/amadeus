# Performance Design — workspace-inspection

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。on-demand local filesystem inspectionをdepth-1有界走査と単一snapshotへ閉じる。

## Root-first scan

`inspectWorkspace(root, io)`はrootを一度列挙し、既存language/framework/build/source/manifest signalと`inspectSubmodules`のparse可能signalを同じinvocationで評価する。root signalまたはsafe submoduleがあればBrownfieldを確定し、depth-1 fallbackを呼ばない。

root無信号時だけ`detectDepthOneProjects`を呼び、直下entryをcanonical sortする。hidden、excluded、known source、docs/examples/testdata/scripts、symlink、non-directoryを除外し、各candidateへrootと同じsignal evaluatorを一回適用する。depth>1 container discoveryは行わない。ただし`.gitmodules`にunsafe entryまたはparse不能が一つでもあれば、root/safe submodule/nested signalより先に`inconclusive`を確定し、fallbackやclassification commitへ進まない。

## Attribution・aggregation

hit 1件だけ`nestedRoot`を設定し、2件以上はsorted `nestedCandidates`を保持して自動選択しない。language countsは全hitを合算し、known source dirを二重集計しない。frameworkはfirst-seen order、build systemは最初のknown値、primary/secondary languageは既存thresholdを維持する。

## Shared snapshot projection

birth、detect、doctor、auditは一つのimmutable `WorkspaceScanResult`をpure projectionし、consumer別rescanを行わない。未初期化submodule表示はsorted先頭5件と残数へ限定する。

## Verification・resource境界

empty/top-level/single/multiple/depth2/excluded/symlink/permission、submodule 0/1/6+/unsafe/malformedに加え、safe+unsafe、root-signal+unsafeの混在をfixture化し、いずれも`inconclusive`かつbirth mutation 0を固定する。network、database、cache、daemon、watcher、submodule commandを追加しない。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U06-01〜05、`security-requirements.md`のfilesystem boundary、`scalability-requirements.md`の1/5/4/6/4 matrix、`reliability-requirements.md`のclassification correctness、`tech-stack-decisions.md`のBun/I/O port、`business-logic-model.md`のWorkspace/Submodule pipelineへ対応する。

## Review — Iteration 1

- Verdict: NOT-READY
- Reviewer: amadeus-architecture-reviewer-agent
- Date: 2026-07-21T03:01:32Z
- Iteration: 1

### Scope decision

既定のclosed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。`memory.md`、`plan.md`、reasoning、record root、sibling Unit、consumes元ファイルは対象外である。

### Sensor results

orchestrator実測では、適用されたrequired-sections、upstream-coverage、answer-evidenceを含む検査は11/11 PASSである。Markdown-only成果物のためlinterとtype-checkは非該当である。本reviewでは、その実測結果と指定された成果物の内容を照合した。

### Findings

- Critical: なし
- Major: 1件 — Q&Aはunsafeな`.gitmodules` pathを`inconclusive`として全mutation前に拒否すると確定している。一方、Performance DesignとReliability Designはroot signalまたはparse可能なsafe submoduleがあればBrownfieldを確定するとしており、unsafe entryがroot signalまたはsafe entryと併存する場合に`inconclusive`が優先されることを明記していない。Security Designもparse可能entry 0の扱いは定義するが、safe entryとunsafe entryの混在時の分類を確定していない。この優先順位を全classification経路で明示し、混在fixtureでbirth mutation 0を固定する必要がある。
- Minor: なし

root-first scan、depth-1境界、4 consumerの単一snapshot、表示5件、6 harness/4 self-install投影は整合している。しかし、unsafe submodule入力のfail-closed precedenceが未確定のため、現時点では実装へ進める状態ではない。

## Review — Iteration 2

- Verdict: READY
- Reviewer: amadeus-architecture-reviewer-agent
- Date: 2026-07-21T03:02:44Z
- Iteration: 2

### Scope decision

Iteration 1と同じclosed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。`memory.md`、`plan.md`、reasoning、record root、sibling Unit、consumes元ファイルは対象外である。

### Sensor results

修正後にorchestrator hooksが再発火し、required-sections、upstream-coverage、answer-evidenceを含む適用検査は11/11 PASSである。Markdown-only成果物のためlinterとtype-checkは非該当である。本reviewでは、その実測結果と修正後成果物の内容を照合した。

### Iteration 1 finding再評価

Major findingは解消済みである。unsafeまたはparse不能な`.gitmodules`は、root signal、safe submodule、nested hitより先に`inconclusive`を確定する。safe+unsafeおよびroot-signal+unsafeの混在もbirth mutation 0となることがPerformance、Security、Reliability、Logical Componentsとfixture設計に一貫して明記された。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

root-first scan、depth-1境界、fail-closed classification、4 consumerの単一snapshot、表示5件、6 harness/4 self-install投影が整合し、新たな境界追加もないため、実装へ進める状態である。
