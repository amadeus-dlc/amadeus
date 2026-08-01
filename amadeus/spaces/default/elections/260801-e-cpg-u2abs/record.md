# Election Record — E-CPG-U2ABS

- question: U2 issuance-guard: SwarmDecline arm に載せた BoltDagAbsence フィールドが未消費(no-dag→ok のためガードメッセージ経路が存在せず、U3 FD domain-entities.md:88 も非消費を明言)。construction.md Forbidden(どのコードも消費しないフィールド禁止)・U2 FD 宣言(consumer (ii) = U2 の degrade 経路文言)・BR-U2-5(degradeUnitResolutionError 無改変)が三つ巴で矛盾する。実装(worktree bolt-issuance-guard、807c65ff8)は field を carry したが読者ゼロ。どう解消するか。実測面: readBoltDagAbsence 呼び出しは BR-U2-12(読み取りは readBoltDagBatches と firstUncoveredBatch のみ)とも不整合。

裁定: decline arm から absence フィールドと readBoltDagAbsence 呼び出しを除去。FD へ申告付き是正(consumer (ii) は U3 FD の将来条項どおり必要時に生む)。Forbidden 準拠・BR-U2-12 整合(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-1, GoA2): choice 1 は U2 層の Forbidden 抵触を消すが、除去後は readBoltDagAbsence(orchestrate.ts:1568)と graph.bolt_dag_absence(runtime.ts:857 が書く)の production consumer がゼロになり U1 FD dag-integrity/business-rules.md:38 の consumer (i)(ii) が両方未成立で残るため、FD への申告付き是正では U2 の除去申告に加えてこの残余を U1 側の follow-up として明記し、無音で消さないことを条件とする。
- 留保(subagent-2, GoA2): FD への申告注記には『U1 の readBoltDagAbsence は本件除去後も U1 自身の成果物(AC-3c)として存続し、消費者は U3 FD domain-entities.md:88 の将来条項どおり必要時に生まれる』ことと『BR-U2-4 行1の BoltDagAbsence.reason 参照は no-dag→ok が無条件である事実に合わせて文言是正する』ことを明記し、orphan seam との誤読と BR 記述の残留矛盾を残さないこと。
票タイムライン: subagent-1 2026-08-02T00:40:00Z(受理 2026-08-01T15:29:18Z) → subagent-2 2026-08-01T15:29:05Z(受理 2026-08-01T15:29:48Z) → 開票 2026-08-01T15:30:30Z → 配信 2026-08-01T15:30:42Z → 配信 2026-08-01T15:30:42Z → 開票 2026-08-01T15:30:42Z
GoA[E-CPG-U2ABS]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
