# Requirements — otel-meta-schema(#1868 実装)

上流入力(consumes 全数): intent-statement.md、scope-document.md、intent-backlog.md、codekb(architecture.md / code-structure.md / component-inventory.md / api-documentation.md / technology-stack.md / dependencies.md / code-quality-assessment.md / business-overview.md — 各 260801 現在節、observed `9c8df859e`)— FR の患部 file:line と実装前提は codekb 現在節から、語彙と配置は #1868 v1 から導出した。NFR-1(fail-open)と redaction 要件(FR-RES-4 / FR-EXC-3 / FR-SUB-2 の Purpose)の適用境界は business-overview.md 260801 現在節の「プライバシー境界」(個人情報系の意図的除外・二層 redaction の適用宣言)に依拠する。

**正本**: 属性語彙・配置・設計原則は Issue #1868 v1 完成宣言。本書はそれをテスト可能形へ固定する(語彙の再設計はしない — ギャップ発見時は #1868 改訂を経る)。

## FR-RES: Resource(#1868 §1)

- **FR-RES-1**: resource は bootstrap 層の単一組み立て関数(1定義)で構成し、traces / logs / metrics の3シグナル全レコードへ同一 bag が載る。現状の span 限定 literal(tracer-provider.ts:137、observed 9c8df859e)を置換する。テスト: 3シグナルの store 出力すべてに同一 resource が現れる in-process 検証
- **FR-RES-2**: 中立層で解決する属性 = service.name / service.version(amadeus-version.ts 由来)/ telemetry.sdk.language / deployment.environment.name(env 判定: `GITHUB_ACTIONS` or `CI` → `ci`、それ以外 `local`)/ host.name(os.hostname)/ amadeus.clone_id(auditCloneId)/ amadeus.operating_mode(AMADEUS_OPERATING_MODE、未設定は `solo`)/ vcs.ref.head.name / vcs.ref.head.revision(git 実測、取得失敗は省略)。テスト: 各属性の解決値が resource bag に現れる in-process 検証+CI env スタブで deployment.environment.name=ci、git 不能ディレクトリで vcs.* 省略
- **FR-RES-3**: ハーネス依存属性の注入 seam — amadeus.harness は既習 `detectHarnessType()`(amadeus-harness.ts:109-119 の `detectHarnessType()`。:15-24 の `HARNESS_DIR_TO_TYPE` はその写像表)で中立層解決可。amadeus.harness.version / gen_ai.request.model / session.id / amadeus.agent.role は **setter API(1回設定・上書き禁止・bootstrap 前後いずれも可)** を新設し、hooks(SessionStart 等)から供給する。未供給は省略(fail-open)。テスト: 供給時に3シグナルへ反映・未供給で省略・二重設定拒否
- **FR-RES-4**: resource は export 境界 redaction の対象(既存二層に合流)。テスト: credential 形値の注入で masked

## FR-SPAN: Span attributes(#1868 §2)

- **FR-SPAN-1**: span record 組み立て時に amadeus.intent.id / amadeus.space を直載り(activeIntent 解決、logger-provider.ts:97 と同一の解決規約)。解決不能時は省略。テスト: active intent 有りで直載り・cursor 不在で省略
- **FR-SPAN-2**: amadeus.stage / amadeus.phase は state の `Current Stage` 読み(既習 getField 様式)で解決可能な場合のみ付与。hot path での state 再読を避けるため per-process memo+テストリセットシームを設ける。テスト: state 実在時に stage/phase 付与・不在時省略・memo リセットで再解決
- **FR-SPAN-3**: 既存の Command / ExitCode(subprocess-span.ts:80-87)と write-time redaction 様式は無改変維持。テスト: 既存 t-otel-core-plumbing / t384 系の green 維持(characterization)

## FR-EXC: Exception イベント(#1868 §4)

- **FR-EXC-1**: registry の exception def(event-registry.ts:827-835)へ optional `exception.type` / `exception.stacktrace` を追加(safe-key は redaction.ts:65-71 の機械導出で自動追従)
- **FR-EXC-2**: recordException(tracer-provider.ts:145-157)が err.name / err.stack を渡す。**span event 属性は現状 redaction を通らない**(RE 実測)ため、recordException 内で redaction を通してから addEvent する
- **FR-EXC-3**: stacktrace の path redaction — リポジトリルート配下は相対化、repo 外(ホーム等)は `<home>`/`<external>` へマスク、credential scrub 併用。テスト: 絶対パス入り stack の注入で相対化・マスクを assert(落ちる実証込み)
- **FR-EXC-4**: telemetry 分類(auditEvent: null)は不変 — FR-EVT-7 drift guard の実行時検査を維持

## FR-SUB: Subagent 観測(#1868 §5)

- **FR-SUB-1**: `amadeus.subagent.started` イベント新設。**分類は telemetry ではなく canonical**(監査価値が動機 — 未完了検知)。canonical 追加は 78→79 の cardinality pin 6箇所(event-registry.ts:79 / drift test 4 / t28 の 2 / VALID_EVENT_TYPES)を同一変更で更新する(RE §9 の全数目録に従う)
- **FR-SUB-2**: 発火点 = PreToolUse hook(matcher `Task`)の新設(settings.json.example に PreToolUse セクションを追加、payload の tool_input から agent type/purpose を解決)。required: Agent Type / optional: Agent ID, Purpose(1行要約・redaction 対象)。SubagentStop 側と同じ3段ゲート(shard 不在 / workflow 完了済 / TTY)+fail-open
- **FR-SUB-3**: lifetime スパン `subagent:<type>` — started/completed の2イベントから**表示層(Relay/読取)で合成**する方式を既定とする(親プロセス側での実スパン保持はプロセス境界を跨ぐため採らない — RE 実測の設計判断を要件へ昇格)。テスト: started+completed ペアからの合成、片割れ(未完了)の検出
- **FR-SUB-4**: span attributes へ amadeus.agent.type / amadeus.agent.id(subagent 文脈で解決可能な場合)

## FR-MET: Metrics(#1868 §6)

- **FR-MET-1**: metrics arm の bootstrap 配線 — registerMeterProvider の production 呼出しを ensureOtelBootstrap へ追加(現状ゼロ、RE 実測)。observability opt-in に従う。テスト: opt-in 有効で metrics store 生成・無効で no-op
- **FR-MET-2**: 計器5つ(gen_ai.client.token.usage / amadeus.stage.duration / amadeus.gate.iterations / amadeus.operation.failures / amadeus.subagent.duration)を canonical 定数モジュール(1定義)で命名固定。属性は #1868 §6 の低 cardinality 集合のみ(intent id / agent id 禁止をテストで固定)
- **FR-MET-3**: token.usage の供給 seam — resource setter と同型の供給 API を新設し、ハーネス hook(SessionEnd 等)からの供給を受ける。claude harness を最初の実証対象とし、他ハーネスは未供給省略(fail-open)。テスト: 供給時に token.usage 計器へ記録・未供給で計器沈黙・二重供給拒否
- **FR-MET-4**: stage.duration / gate.iterations / operation.failures / subagent.duration は engine/hook の既存イベント発火点から計測(emit と同一トランザクションにしない — 計測失敗は fail-open)。テスト: 各イベント発火点の in-process 駆動で対応計器が加算・計測 throw 注入で emit 無傷

## FR-DOC: スキーマ文書(#1868 §M6)

- **FR-DOC-1**: `docs/reference/` へ telemetry スキーマ章(en)を新設し、#1868 の6面+実装の実属性を対応表で固定。docs の件数語は隣接列挙原則に従う

## NFR / 横断

- **NFR-1**: 全新規経路は fail-open(取得不能は省略・emit を止めない)。ただし registry の required-attribute 検証(fail-closed)は不変
- **NFR-2**: 中立境界 — core に harness 固有値・モデル名を焼かない(setter 注入のみ)。t258-boundary-guard(scripts/ 参照禁止)遵守
- **NFR-3**: 既存 blocking gate 全適用+TDD 既定。canonical 追加時の 78-pin 同時更新は「落ちる実証」対象
- **NFR-4**: dist 二重 module graph — core 変更ごとに package.ts+promote:self を同一変更で回す(RE §9)

## 未決事項(設計ステージへ委譲)

- resource setter API の具体形(モジュール配置・リセットシーム名)
- stage memo の無効化タイミング(ステージ遷移との整合)
- lifetime スパン合成の実装位置(Relay か読取ヘルパか)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-01T01:45:39Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major(amadeus-harness.ts 行番号引用の混同)と Minor(テスト句欠落7FR)を是正確認。#1868 6面と FR 群の全数対応・引用実測一致・合否基準明記・未決事項の設計委譲を確認し READY。

### Findings

- None
