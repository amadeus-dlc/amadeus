# Scalability Design — quality-repair-runtime

## 入力とpartition

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。新しい分散サービスを追加せず、既存のper-Intent / per-clone audit上でpartition可能にする。

quality scopeは`Intent UUID + Monitor ID + stage / Bolt instance + graph revision`である。`qualityEpochId`はscopeとepoch-start event identityから決まり、resumeごとに新epochへ移る。同時Intent、Unit、stage instanceのprojectionを共有しない。

## Independent convergence

evidence normalization、T+1 window、replan flag、review cycle、latchはquality scope内で完結する。別scopeのobligation増加、replan、human retryは互いのcounterやwindowを変更しない。

per-clone eventはcanonical identityで畳み込み、同一scopeに矛盾するsnapshot / cycle successorがある場合は物理読込順で勝者を決めず`CONFLICT`へparkする。cross-clone coordinatorやglobal retry counterを置かない。

## Capacity behavior

projection memoryはT+1 snapshotsとcurrent obligation setに比例する。required output descriptorとsource descriptorはcompiled graph revisionごとに共有し、snapshotへ重複展開しない。evidence collectorは宣言されたsourceだけをpullし、全repositoryや全sensor historyをscanしない。

多数のscopeが同時にstalledでも、同一fingerprintの通常起動は外部agentを呼ばない。resumeはevidence-changeまたはverified human retryの対象scopeだけを再開し、全scope broadcastを行わない。

## Harness growth

Claude Code、Codex、Cursor、OpenCode、Kimi Codeは同じquality fixtureとgeneric Monitor contractを使い、harness adapterへquality algorithmを複製しない。将来harnessはregistry row、native evidence adapter、共通fixture、opt-in live scenarioの追加で閉じ、M03 / M02の分岐を増やさない。

## Verification

複数Intent / Unit / clone、graph revision切替、stalled scopeの大量再起動、harness cohort追加をfixture化する。同じscope event setはclone順にかかわらず同じprojection / route / Judge countへ収束し、別scopeのdigestとcounterが不変であることを要求する。
