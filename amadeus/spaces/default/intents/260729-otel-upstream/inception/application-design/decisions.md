# Architecture Decisions — OTel Upstream 統合

上流入力（consumes 全数）: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`（参照済み）

このステージで確定した ADR は6件（Q3-A）。Phase 1 ADR 事項（Logs API 採否・Bun Context Manager・Journal health 検証 protocol・API singleton bundle 構成）は walking skeleton 実測後に追記する。各 ADR の詳細な背景は #1672 を正本とし、ここでは決定・帰結・却下案を記録する。

## ADR-1: 上流 Interface を OTel API ファミリーに一本化する

- **Context**: 現行は `appendAuditEntry()` が上流で、OTel は下流 Projection（#1628）。発行漏れ・語彙乖離・Context 分断が構造的に残る
- **Decision**: TypeScript ロジックの唯一の上流を OTel API ファミリー（Trace／Event・Logs／Metrics）とし、監査 JSONL は Provider 配下の AuditLogExporter から生成する
- **Consequences**: 約1600 call site の移行が必要（FR-MIG-2）。呼出し側の二重呼びが消え、語彙は Event Registry に一元化される。`@opentelemetry/api` ファミリーへの依存は単一 bundle へ取り込み、利用者側の Bun-only 前提を変えない — 追加理由は本 ADR と Phase 1 ADR で文書化する（FR-DST-1）
- **Alternatives Rejected**: dual upstream（Audit API と OTel API の並列呼び）— 発行漏れ・語彙乖離を解消できない（#1672 背景）。OTel を下流 Projection に留める案 — 現行の限界そのもの
- **Reversibility**: 移行期間は互換 Adapter で戻せる。完了後は locked in（撤回は git revert 単位）

## ADR-2: Provider を Tracer／Logger／Meter の3系統に分離する

- **Context**: Signal ごとに耐久性契約が異なる（canonical Event は同期必須、Span／Metric／diagnostic Log は fail-open）
- **Decision**: Amadeus Tracer Provider・Logger Provider・Meter Provider を独立実装とし、canonical Event は Logger Provider 経由でのみ AuditLogExporter へ流す
- **Consequences**: 耐久性契約を Provider 単位で明確化できる。diagnostic Log と canonical Event の混入を構造で防ぐ（FR-EXP-4）
- **Alternatives Rejected**: 単一 Provider に全 Signal を持たせる案 — 失敗契約の境界（fail-open vs 例外＋latch）が曖昧になる
- **Reversibility**: Provider 間の統合は容易ではないが、公開 Interface（OTel API）が安定しているため利用側への影響は限定的

## ADR-3: canonical Event の失敗契約は「同期例外＋fatal health latch」の二重防御

- **Context**: OTel API の慣習は no-op friendly（原則 throw しない）だが、canonical audit は状態機械の commit log であり書き込み失敗を握りつぶせない。例外のみでは中間層に catch されうる
- **Decision**: AuditLogExporter の失敗を同期例外で返すと同時に process-local fatal latch を set し、全 canonical mutation entrypoint が処理前に latch を確認して拒否する。latch は process 内で解除せず、新 process は Journal health 検証後にのみ mutation を許可する
- **Consequences**: OTel 慣習との意図的差分となり、本 ADR で明文化が必須。全 entrypoint の latch 確認配線が必要（FR-EVT-4）
- **Alternatives Rejected**: 例外のみ — 中間層の catch で状態遷移が進みうる。Result 付き独自 helper — 上流を OTel API のみにする目的と矛盾（#1672 失敗契約節で不採用確定）
- **Reversibility**: entrypoint 配線後の契約変更は高コスト。Phase 1 のテスト先行順序の1番目で固定する

## ADR-4: 新規コンポーネントを `packages/framework/core/otel/` に集約する

- **Context**: 現行の正本は `tools/amadeus-*.ts`（1ツール1ファイル）＋巨大な `amadeus-lib.ts`（約8000行）
- **Decision**: Provider・Exporters・Registry・Context・latch・redaction・relay を `otel/` サブディレクトリに集約し、tools/ からは CLI 境界のみ呼ぶ。lib.ts には追加しない（Q1-A）
- **Consequences**: 関心事の分離が明確になり、lib.ts の肥大化を止められる。harness manifest への新規マッピング追加が必要（FR-DST-2）
- **Alternatives Rejected**: tools/ 平置き（1ツール1ファイル慣行）— CLI ツールとライブラリの混在が続き、12 コンポーネントの追加で tools/ が過密になる
- **Reversibility**: 移動は機械的だが manifest・import 更新が伴う。着手前の確定が望ましい（本 ADR）

## ADR-5: amadeus-audit.ts は分割・置換し、Journal Module を `amadeus-journal.ts` 拡張で作る

- **Context**: `amadeus-audit.ts`（1094行）が writer・reader・merge・CLI 互換を併存している
- **Decision**: reader／merge／codec を `amadeus-journal.ts` 拡張の Journal Module へ集約し、writer は migration-adapter 経由で段階縮小、call site ゼロ後に旧 writer を削除する（Q2-A、#1672 Module 処置表どおり）
- **Consequences**: v1/v2 reader・mixed shard merge（FR-JRN-2）の置き場が確定。移行期間は新旧並存を削除ゲートで管理（FR-MIG-4）
- **Alternatives Rejected**: `amadeus-audit.ts` 維持・内部差替えのみ — 責務の混在が残り、reader 差替え（FR-JRN-4）の着手点が曖昧
- **Reversibility**: 分割は段階的で各段階で戻せる。旧 writer 削除後は locked in

## ADR-6: Projector を OTLP Relay へ縮退する

- **Context**: 現行 Projector は Journal から Span を再構築し、時刻包含で親子を推測している
- **Decision**: Span 再構築・時刻包含・ID 生成・timing event 合成を削除し、Local Signal Store の転送（cursor・idempotency・retry・batch・retention）のみを行う Relay とする。audit JSONL は Relay の入力にしない
- **Consequences**: 推測の排除で因果が実行時確定に限定される（FR-TRC-6）。移行期間は新旧 Signal の shadow 比較で等価性を検証してから縮退する（VER-5）
- **Alternatives Rejected**: Projector 併存（Journal からの Span 生成を残す）— 推測経路が残り FR-RLY-2 に反する
- **Reversibility**: shadow 比較で同等以上を確認するまでは現行 Projector を維持するため、それまでは戻せる
## ADR-7（Phase 1）: Logs API 採用・version pin・Context Manager・bundle 構成・health probe（U1 実測で確定）

- **Context**: Phase 1 ADR 事項4点（requirements.md Open Questions、raid-log I-1）— Logs API 採否と version pin、Bun Context Manager、API singleton bundle 構成、Journal health 検証 protocol
- **Decision**:
  - **Logs API 採用（Q2-A）**: `@opentelemetry/api-logs@0.221.0` を採用。Bun 1.3.13 で `logger.emit({ eventName, attributes, context })` が canonical 契約（eventName・typed attributes・Context 付与）を表現できることを spike で実証。最小 EventRecord Interface への切替は不要
  - **version pin**: `@opentelemetry/api@1.9.1`、`@opentelemetry/api-logs@0.221.0`、`@opentelemetry/context-async-hooks@2.10.0` を exact pin（devDependencies = bundle 入力、bun.lock 更新。`--frozen-lockfile` CI 規則と整合）。追加理由: FR-EXP-1 が OTel API ファミリーを唯一の上流 Interface とするため（FR-DST-1）
  - **Context Manager（A-1）**: `AsyncHooksContextManager` は Bun 1.3.13 で await 境界を越えられない（spike で棄却）。同一パッケージの `AsyncLocalStorageContextManager` が await・Promise.all 分離・timer・例外境界をすべて通過したため採用。Amadeus 独自 Adapter は不要（BR-12 の fallback は不発）
  - **bundle 構成（A-3）**: `bun build <otel entry> --target bun` が 81 module・約122KB の単一 self-contained file を生成し、node_modules のない cwd で起動・canonical 書込まで通ることを `t-otel-bundle` で固定。bundle 内で Provider 登録と API singleton が一意に解決される。dist への bundle 配線（packager 組込み）は VER-6 の distribution tests と併せて後続で行い、U1 では raw TS の manifest マッピング＋bundle 成立の実証に留める
  - **Journal health probe（FR-EVT-5）**: 非破壊の read-parse probe（`createJournalReadProbe`: shard を journal codec で parse するだけ、lock・書込・scratch append なし）を採用。shard 不在は healthy
- **Measured inputs（NFR-1 数値予算の実測、`t-otel-measurement` 2026-07-29 実測値）**:
  - sync append cold: 現行 2.50ms / 新経路 3.09ms。warm p50: 現行 1.63ms / 新経路 1.49ms。warm p95: 現行 3.97ms / 新経路 3.06ms — 同一 append 機構の再利用により回帰なし（実測上は同等）
  - 起動オーバーヘッド: bare bun 起動 45.5ms / Provider 登録あり 72.4ms（delta 約26.8ms、5回平均）
  - 数値予算の正式値は Phase 1 完了時の hard gate 評価でこの実測を基に確定する（NFR-1 の ADR 確定手続きどおり）
- **Consequences**: 代表接続（`amadeus-log.ts` の2 event・`amadeus-session-end.ts` の projector Span）が OTel 上流経由で動作し、hard gate の5検証項目（Provider・Logs API・Bun Context・同期 I/O・bundle）すべてに実証 evidence が揃う
- **Alternatives Rejected**: 最小 EventRecord 独自 Interface（Logs API が成立したため不要）、AsyncHooksContextManager（Bun で Context を喪失）、vendoring（Q3 で却下済み）
- **Reversibility**: 代表接続のみの範囲に限定（AH-4）。撤回は `amadeus-log.ts`・`amadeus-session-end.ts` の差替え revert と manifest 行の除去で完結する
