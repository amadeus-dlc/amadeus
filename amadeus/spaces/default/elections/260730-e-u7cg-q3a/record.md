# Election Record — E-U7CG-Q3A

- question: U7 互換 Adapter の per-call intent/space ターゲティング。BR-2 は「旧 appendAuditEntry() のシグネチャを維持」とするが、旧シグネチャ appendAuditEntry(eventType, fields, projectDir, intent?, space?)(packages/framework/core/tools/amadeus-audit.ts:357-362)は呼出しごとに書込先 intent/space を切替可能で、cross-worktree delegate 配送(DELEGATED_APPROVAL を他 intent の shard へ書く)がこれに依存している。一方 canonical 経路の emitEvent(name, attrs)(otel/logger-provider.ts:44)は書込先を registerLoggerProvider 登録時の projectDir/intent/space に固定し(otel/audit-log-exporter.ts の AuditLogExporterOptions)、per-call 上書き経路がない。intent/space 引数を無視して既定 intent へ書くと delegate が誤 intent へ着地する(silent fallback 禁止 BR-3 に反する)。なお U8 legacy-writer-removal は「call site ゼロ」を削除ゲート条件に持つため、移行不能 site を恒久に残す選択はゲートとの整合も考慮すること。各自 amadeus-audit.ts:357-362、logger-provider.ts:44、audit-log-exporter.ts の options、cross-worktree delegate 配送の実消費箇所を実測して投票せよ。

裁定: Adapter は intent/space が渡された場合 fail-closed で throw(invariant violation)。per-call ターゲティングを要する site は当面 allowlist に残し、その扱い(canonical 経路拡張 or 別機構)は後続裁定へ送る(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-1, GoA2): allowlist 残置は暫定に限る — U8 の call-site ゼロゲートと衝突するため、per-call ターゲティング site(amadeus-state.ts:3402/3496 の delegate 配送等)の canonical 化方針の後続裁定を U8 着手前に必ず実施すること
- 留保(subagent-2, GoA2): canonical 経路の per-call intent/space 対応は最終的に不可避(delegate 配送 amadeus-state.ts:3402/:3496 は恒久要件、U8 BR-8 のゲート条件 (c) は直接 call site ゼロを要求)であるため、後続裁定は U8 着手前に必ず成立させること。また allowlist は call-site guard (VER-4) から機械可視な形で持ち、無音の恒久残存にしないこと
票タイムライン: 配信 2026-07-30T10:11:29Z → 配信 2026-07-30T10:11:29Z → subagent-1 2026-07-30T10:13:42Z(受理 2026-07-30T10:13:51Z) → subagent-2 2026-07-30T10:13:39Z(受理 2026-07-30T10:14:04Z) → 開票 2026-07-30T10:16:15Z
GoA[E-U7CG-Q3A]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
