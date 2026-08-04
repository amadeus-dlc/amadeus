# Code Generation Plan — codex-live-walking-skeleton

対象 Unit: U01 `codex-live-walking-skeleton`
Scope: `self-feature`
Test Strategy: Comprehensive
Trace 正本: FR-1〜FR-11、NFR-1〜NFR-6、C1〜C9、BR-G/E/L/R/D/M/C

## 前提と変更面

- production kernel は既存の test harness seam に合わせて `tests/harness/live-e2e/` に置く。`dist/` は直接編集しない。
- 既存 `tests/harness/codex-exec-live.ts` は現行 E2E の import surface を維持する互換 facade とし、policy・credential・scratch・process lifecycle の正本は新 kernel へ移す。
- versioned ledger は `tests/harness/live-e2e/runs.jsonl`、derived view は `docs/harness-engineering/live-e2e.md` の generated blockとする。
- U02 所有の網羅的 property/fault corpus は作らない。U01 は production contract の baseline、代表的な error/cleanup/lock/pending recovery、fake Codex integration、明示 opt-in live 境界を実装する。

## ベースライン

- [x] 既存 Codex helper の unit/integration 2 files、8 tests が green であることを確認した。
- [x] 変更前 `bun run test:ci` を開始し、既存 `dist/kiro` drift による `t-package-write-sweep` precondition failure（DIFFERS 4、MISSING 1）を確認した。十分な baseline 証拠取得後に中断し、最終収束前に正本から package を再生成する。
- [x] blast radius を `tests/harness/live-e2e/`、Codex facade、関連 unit/integration/E2E、runbook/ledger、生成済み配布 tree の同期に限定した。

## 実装手順

### Step 1 — C1/C2/C7 の型・policy・registry

- [x] closed `LiveCode` / `LiveOutcome` / `Result` / sanitized evidence と code-status 整合検査を実装する。
- [x] `GITHUB_ACTIONS=true` 優先、strict `"1"` opt-in、preflight 優先順位、child env allow-list、secret/source-path leak 検査を実装する。
- [x] `codex-exec` capability と registry validation/lookup を実装する。
- [x] Red→Green: pure unit test で hard deny・strict opt-in・probe 0回・未知code・重複registry・env leakを固定する。

Trace: FR-1〜FR-4、FR-10、NFR-1/NFR-2/NFR-4、C1/C2/C7、BR-G/BR-E/BR-R。

### Step 2 — C3/C4 の resource registrar と lifecycle

- [x] adapter/credential/scratch/process port、`ResourceRegistrar`、partial prepare snapshot を実装する。
- [x] gate→preflight→scratch→prepare→execute→assert→cleanup/leak→receipt→ledger の一方向 runner を実装する。
- [x] explicit timeout/AbortSignal、retry 0、process terminate/reap、cleanupとleak scanの独立試行、結果 precedence を実装する。
- [x] Red→Green: fake adapter integration で prepare throw、timeout、assertion/cleanup/leak/ledger precedence のbaselineを固定する。

Trace: FR-5/FR-6/FR-10、NFR-1〜NFR-5、C3/C4、BR-L/BR-R。

### Step 3 — C8 atomic ledger

- [x] recorded receipt schema、deterministic ID、sanitization、JSONL parse/validation を実装する。
- [x] owner-stamped mkdir lock、owner一致release、dead owner/unstamped staleのCAS回収、bounded timeoutを実装する。
- [x] sibling temp、0600、file fsync、atomic rename、directory durability pending marker、idempotent recoveryを実装する。
- [x] Red→Green: nominal append、byte preservation、同一ID idempotency/conflict、malformed ledger、live owner deny、dead owner recovery、rename後fsync failure/pending recoveryを固定する。

Trace: FR-2/FR-11、NFR-1/NFR-2/NFR-5/NFR-6、C8、BR-D。

### Step 4 — C9 projector と runbook

- [x] registry+validated ledger から adapter ID 順の matrix block を純粋生成する。
- [x] explicit render/update/check command surface と generated block drift failure を実装する。
- [x] runbook に local-only command、opt-in、ledger確認、`dist/<harness>`/driver/installer trigger、credential非複製を記載する。
- [x] Red→Green: deterministic projection、manual drift、必須section/registry IDのdoc contractを固定する。

Trace: FR-11、NFR-2/NFR-4/NFR-5、C9、BR-M。

### Step 5 — Codex C5/C6 vertical slice

- [x] read-only binary/version/dist/auth preflight、host-injected credential lease、allow-listed child env、scratch git/dist/trust config を実装する。
- [x] `codex exec` の短い journey、explicit timeout、exit/schema/file anchor assertion、sanitized output metadataを実装する。
- [x] 既存 Codex helper APIを新正本へ接続し、source auth copy・ambient env spreadを廃止する。
- [x] Red→Green: fake executable/dist integration で cwd/args/env/config/anchor/cleanupを検証し、live testは hard deny/opt-inを通った後のCLIまたはcredential不在時だけ明示 self-skipする。

Trace: FR-3〜FR-7、FR-10/FR-11、NFR-1〜NFR-6、C5/C6、BR-C。

### Step 6 — 配布同期と収束

- [x] focused unit/integration/E2E/security testsを実行する。
- [x] live Codex journey境界を実行し、opt-in/credential不在でscratch/process前の明示self-skipを確認した。実green receiptがないことはcode summaryへ残す。
- [x] `bun scripts/package.ts` と `bun run promote:self` で生成物を同期し、`dist/`とself-install projectionを正本へ一致させる。
- [x] `bun run lint`、`bun run typecheck`、`bun scripts/package.ts --check`、`bun run promote:self:check` を通した。`bun run test:ci`は長時間のため途中まで新規failureなしを確認して中断し、focused集合で補完した。
- [x] code summaryへ変更ファイル、設計判断、Red→Green、検証結果、plan逸脱を記録する。
- [x] Conventional Commits の英語メッセージで、この worktree内だけにcommitする。

## テスト構成

| 層 | 対象 | 主な観点 |
|---|---|---|
| unit | contract/policy/registry/projector | closed code、hard deny、strict opt-in、env allow-list、sanitize、deterministic matrix |
| integration | lifecycle/ledger/Codex fake | partial cleanup、timeout/abort/reap、atomic append、pending recovery、args/env/cwd/anchor |
| E2E | Codex live serial | real CLI/model/credential、scratch git/dist、receipt→ledger→matrix |
| security | policy/lifecycle corpus | raw secret、source path、absolute home、prompt/stdout/stderr全文の非流出、cleanup/leak override |
| docs/config | runbook/matrix/runner | trigger contract、registry ID、generated block drift、live testの明示 opt-in/self-skip |

Test configurationは Bun 1.3.13、TypeScript strict、Biome、既存 `*.serial.test.ts` discovery、通常 `test:ci` のlive process 0回を維持する。長い実時間待機は使わず、timeout seamへ短い値を注入する。
