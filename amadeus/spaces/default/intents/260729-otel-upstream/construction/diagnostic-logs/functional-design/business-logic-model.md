# Business Logic Model — U10: diagnostic-logs

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 処理シーケンス

### diagnostic Log の emit（fail-open 経路）

1. 呼出し側（CLI tool・hook・subagent 等の短命 process）が `emitDiagnostic(name, attrs)` を呼ぶ（component-methods.md logger-provider.ts）
2. Amadeus Logger Provider が active Context から traceId／spanId を採取し、DiagnosticLogRecord を構成する（FR-MLM-2）
3. Provider は record を LocalLogExporter へ振り分ける。canonical の AuditLogExporter には一切 dispatch しない（FR-EXP-4）
4. LocalLogExporter は record を diagnostic Log Store（machine-local JSONL）へ同期保存する
5. 保存失敗時は例外を握りつぶして復帰する（fail-open、FR-EVT-6）。fatal latch は set せず、workflow を止めない。失敗の事実は可能な範囲で stderr 相当へ落とす

### Trace Context 相関

1. Span アクティブ時に emit された diagnostic Log は当該 Span の traceId／spanId を持つ
2. Span 非アクティブ時（Context なし）は IDs を欠落させてよいが、Log 自体は保存する（fail-open の範囲。欠落を canonical 経路の異常とはみなさない）
3. Relay（U11）が Log Store を読み OTLP 変換する際、trace 相関 ID をそのまま通す（本 Unit は Store への保存までを責務とする）

## 振り分け（routing）の境界

1. 分類の判断は Logger Provider 内部の単一点に集約する。`emitEvent`（canonical）と `emitDiagnostic`（telemetry）は公開 Interface から別経路で、相互に record を共有しない（services.md の通信契約どおり）
2. canonical 経路への混入は契約違反とし、テストで拒否する（FR-EXP-4）

## 判定ツリー（emit 時）

1. 呼出しが `emitEvent` か `emitDiagnostic` か — Interface 境界で確定する。動的な振り替えは存在しない
2. `emitDiagnostic` の場合: active Context の有無を判定
   - あり → traceId／spanId を record に付与（FR-MLM-2）
   - なし → IDs を欠落させたまま進行（BR-9。保存は継続）
3. LocalLogExporter の保存成否を判定
   - 成功 → 完了（reader から観測可能なのは emit 完了後。同一 process 内同期、batch timer なし）
   - 失敗 → 例外を握りつぶして復帰（fail-open、FR-EVT-6）。latch 未 set のまま呼出し側へ制御を返す

## 複数 process での emit（services.md の実行単位どおり）

1. CLI tool・hook・subagent の各短命 process はそれぞれ独立に `emitDiagnostic` を呼ぶ
2. Context は U5 の W3C 伝播で接続済みのため、子 process の diagnostic Log も同じ Trace の IDs を持つ
3. 各 process の Store 書込は shard・lock の共通機構に従い、Exporter 層は新たな共有状態を導入しない

## 検証フロー（テスト先行、#1678 のテスト先行順序に準拠）

1. red: 振り分けテスト — `emitDiagnostic` 呼出し後に diagnostic Log Store に record が現れ、audit JSONL（Journal）には何も append されないことを固定（FR-EXP-4）。U4 の hardened LocalLogExporter／AuditLogExporter を用いる
2. red: 相関テスト — `startActiveSpan` 内で emit した Log がその traceId／spanId を持つことを固定（FR-MLM-2）
3. red: fail-open テスト — Store 書込を強制失敗させても例外が呼出し側へ届かず、fatal latch が未 set のままであることを固定（FR-EVT-6）
4. red: 相関の process 横断テスト — 子 process で emit した Log が親と同じ traceId を持つことを固定（U5 の伝播に依存）
5. green: 上記テストを通す実装を行い、同一コミットで red-green とする（unit-of-work.md 共通制約）

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:42:16Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: coverage/separation/topology sound; single MINOR — LocalLogExporter.export(record) cited to component-methods.md which has no such section.

### Findings

- MINOR domain-entities.md: export(record): void cited to component-methods.md but it lives in components.md 公開 Interface column — fix the citation

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:48:03Z
- **Iteration:** 2
- **Scope decision:** none

READY: citation now resolves against components.md (and component-methods.md now also declares local-log-exporter.ts); passing criteria re-verified clean.

### Findings

- None
