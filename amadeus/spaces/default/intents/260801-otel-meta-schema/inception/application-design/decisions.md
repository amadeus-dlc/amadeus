# Decisions(ADR)— otel-meta-schema

上流入力(consumes 全数): requirements.md、architecture.md(codekb 260801 現在節)、component-inventory.md(同)— 各 ADR の Context は requirements.md の該当 FR と、architecture.md 現在節の実測(resource 1行 literal・addEvent の redaction バイパス・プロセス境界)、component-inventory.md 現在節の registry 構成実測(78 canonical・pin 6箇所)から引用。

## ADR-1: resource は bootstrap 層の単一組み立て+プロバイダ登録時配布

- **Context**: FR-RES-1。resource 概念は span の1行 literal のみ(codekb 実測)。3シグナルへ同一 bag を届ける必要
- **Decision**: `otel/resource.ts` の `buildResource(projectDir)` を唯一の組み立て点とし、`ensureOtelBootstrap` / `ensureTracerBootstrap` / meter arm が register 時に各プロバイダへ渡す。プロバイダは record 組み立て時にそれを埋める
- **Consequences**: resource は登録時点のスナップショットではなく、初回参照時に構築されメモ化され、supplier 供給(ADR-2)のたびに memo 無効化される遅延評価 getter(`currentResource`)として読む — 登録後供給を取りこぼさない。テストは reset シーム経由
- **Alternatives Rejected**: (a) 各プロバイダが個別に組み立て — 1定義原則違反・3実装の分裂。(b) export 境界で毎回組み立て — hot path コスト+シグナル間不一致の窓
- **Security/Compliance**: resource も export 境界 redaction を通す(FR-RES-4)

## ADR-2: ハーネス依存値は「1回設定 setter+未供給省略」の supplier registry

- **Context**: FR-RES-3 / FR-MET-3。model/session/role/harness.version は core から取得不能(codekb 実測: hook stdin にのみ現れるか、どこにも無い)
- **Decision**: `otel/resource-suppliers.ts` に `supplyResourceAttribute(key, value)`(許可キー集合は #1868 §1 の閉集合、1回設定・二重設定は throw、bootstrap 前後いずれも可)と token 供給 `supplyTokenUsage(...)` を置く。hooks(SessionStart = session.id / model、SessionEnd = token usage)が呼ぶ
- **Consequences**: 未供給キーは resource から省略(fail-open)。supplier は per-process 状態のため reset シーム必須
- **Alternatives Rejected**: (a) env 変数渡し — 子プロセスへの漏れ・上書き検出不能・redaction 迂回。(b) config.json 経由 — model/session は動的値で layered config の静的性質と不整合
- **Security/Compliance**: 許可キー閉集合で任意キー注入を拒否(fail-closed 側)。値は redaction 対象

## ADR-3: subagent.started は canonical(78→79)+lifetime は読取合成

- **Context**: FR-SUB-1〜3。#1868 §5 はログ表で canonical を宣言。canonical 追加は 6箇所の cardinality pin 連動(codekb 実測)。lifetime スパンはプロセス境界を跨ぐ
- **Decision**: `amadeus.subagent.started` を canonical で registry へ追加し、pin 6箇所を同一変更で 79 へ更新(落ちる実証: 1箇所残しで赤)。lifetime は実スパンを持たず、started/completed ペアからの読取合成(`subagent-lifetime.ts`)
- **Consequences**: 監査に started が永続(未完了検知が監査面で可能)。trace ビューでの lifetime 表示は読取ヘルパ消費者(将来ダッシュボード)の責務
- **Alternatives Rejected**: (a) telemetry 分類 — pin 6箇所を回避できるが監査価値(未完了検知)を失い #1868 §5 に反する。(b) 親プロセスで実スパン保持 — PreToolUse と SubagentStop は別プロセス実行でありスパンオブジェクトを跨げない(RE 実測)
- **Security/Compliance**: Purpose は1行要約+redaction 対象

## ADR-4: stacktrace redaction は recordException 内の専用パスフィルタ

- **Context**: FR-EXC-2〜3。span event 属性は現状 redaction を通らない(RE 実測)。stack はホームパス等を含む
- **Decision**: `redaction.ts` に `redactStacktrace(stack, repoRoot)` を新設(repo 配下 → 相対化、外 → `<home>`/`<external>`、credential scrub 併用)し、`recordException` が exception.stacktrace へ適用してから addEvent。exception.type/message は既存 redactAttributes を通す
- **Consequences**: addEvent 一般への redaction 強制はしない(scope 外の挙動変更を避ける — 既存 addEvent 消費者は registry required 検証で属性が統制済み)
- **Alternatives Rejected**: (a) addEvent 全体に redaction — 挙動変更が #1868 の射程を超える(必要なら別 Issue)。(b) export 境界のみ — write-time 層を欠き二層 Mandate に反する
- **Security/Compliance**: 二層 redaction Mandate 準拠(write-time = recordException、export 境界 = 既存)

## ADR-5: metrics arm は bootstrap 配線+計器定数モジュール

- **Context**: FR-MET-1〜2。registerMeterProvider は production 未呼出(codekb 実測)
- **Decision**: `ensureOtelBootstrap` に meter arm を追加(observability opt-in 準拠)。計器名・属性キーは `metrics-instruments.ts` の定数(1定義)からのみ参照
- **Consequences**: 計器追加は定数モジュール改訂を経る(#1868 §6 の registry 統制と同型)
- **Alternatives Rejected**: (a) 各計測点でリテラル命名 — 分裂・typo が cardinality 汚染に直結。(b) 専用 bootstrap 関数の新設 — 呼び忘れ面が増える(既存 ensureOtelBootstrap の「全 entry point 共通」性質を再利用する方が呼び漏れゼロ)
- **Security/Compliance**: metrics 属性の低 cardinality 閉集合をテストで固定(intent id / agent id 禁止)
