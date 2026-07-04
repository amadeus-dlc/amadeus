# Code Generation Plan: U001-failure-evidence-foundation

## 上流文脈

この code-generation-plan は、`business-logic-model`、`business-rules`、`domain-entities`、`performance-design`、`security-design`、`deployment-architecture`、`unit-of-work`、`requirements` を入力として作成する。

`business-logic-model` は、command execution、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の処理順序を定義している。

`business-rules` は、stdout JSON 非干渉、active workflow がある場合だけの audit append、OpenTelemetry no-op default、malformed drops no-crash を定義している。

`domain-entities` は、`CommandExecution`、`ErrorEvidence`、`AuditWriteResult`、`HookDropEntry`、`HookDropSummary`、`DiagnosticFinding`、`TelemetryFacade`、`TelemetryScope`、`DoctorOutputModel`、`EvidenceRef` を定義している。

`performance-design` は、Telemetry facade、Error Audit、Hook Drop Doctor、Doctor Composition の処理予算を定義している。

`security-design` は、secret、token、full stack trace を標準表示や telemetry attribute に混ぜない境界を定義している。

`deployment-architecture` は、U001 を `.agents/aidlc/tools` 内の Bun/TypeScript CLI として扱い、collector、dashboard、cloud infrastructure を必須にしない判断を定義している。

`unit-of-work` は、U001 を Issue #431、#432、OpenTelemetry core 計装の大きめの縦断 slice として定義している。

`requirements` は、R001、R002、R003、R007、R008、R009 を U001 の検証対象として定義している。

## 実装方針

U001 は既存 `.agents/aidlc/tools` の CLI 内 module として実装する。

新しい deployable service、database、queue、collector、dashboard は作らない。

OpenTelemetry は core 計装の facade と no-op default を先に実装する。

実行時依存は可能な限り追加しない。

もし OpenTelemetry package が必要な場合は、最小 package を `package.json` へ追加し、no-op default のまま stdout JSON と network no-send を保つ。

`skills/` と `.coderabbit.yml` または `.coderabbit.yaml` は変更しない。

`.agents/aidlc/tools` は parity 対象を含むため、既存 entrypoint の直接変更は最小化し、shared helper と adapter を先に作る。

## 変更候補ファイル

| File | Purpose |
|---|---|
| `.agents/aidlc/tools/aidlc-telemetry.ts` | Telemetry facade、no-op default、test exporter seam、command scope を追加する。 |
| `.agents/aidlc/tools/aidlc-failure-evidence.ts` | Error evidence field construction、Hook Drop Doctor summary、Doctor output model helper をまとめる。 |
| `.agents/aidlc/tools/aidlc-lib.ts` | 既存 `emitError` と `recordHookDrop` の呼び出し面に helper を接続する。 |
| `.agents/aidlc/tools/aidlc-utility.ts` | `doctor` に hook drop summary、telemetry status、standard/verbose 分離を接続する。 |
| `.agents/aidlc/tools/aidlc-orchestrate.ts` | `next` / `report` の command lifecycle と error path へ telemetry scope を接続する。 |
| `dev-scripts/evals/failure-evidence-foundation/check.ts` | U001 の deterministic fixture を追加する。 |
| `package.json` | U001 eval script を `test:it:all` に接続する。 |

実装中に既存の責務配置が異なると分かった場合は、同じ責務を保ったままより近い既存 helper へ寄せる。

## Plan Steps

### Step 1: 既存実行経路の呼び出し面を固定する

- [ ] `aidlc-lib.ts` の `emitError`、`recordHookDrop`、audit path を確認し、Error Audit と Hook Drop Doctor の入口を確定する。
- [ ] `aidlc-utility.ts` の `doctor` 表示順と既存 health check を確認し、standard output と verbose detail の追加位置を決める。
- [ ] `aidlc-orchestrate.ts` の `next` / `report` と top-level catch を確認し、stdout JSON contract を壊さない telemetry 接続点を決める。

Traceability: R001、R002、R003、R008、US001、US002、US003。

### Step 2: Shared Contracts と Telemetry Core facade を追加する

- [ ] `aidlc-telemetry.ts` を追加し、`TelemetryFacade`、`TelemetryScope`、`TelemetryCommandContext`、test exporter seam を定義する。
- [ ] default no-op は exporter、network connection、background flush worker を作らない実装にする。
- [ ] command name、stage、Intent ref だけを low-cardinality attribute として扱う。
- [ ] error span と doctor metrics を no-op default でも同じ call shape で呼べるようにする。

Traceability: R003、R007、NFR002、NFR003、US003。

### Step 3: Error Audit helper を追加する

- [ ] `aidlc-failure-evidence.ts` に `ErrorEvidence` と `AuditWriteResult` の pure helper を追加する。
- [ ] `ERROR_LOGGED` の field construction を tool name、command context、human-readable error detail、stage、Intent ref に閉じる。
- [ ] secret、token、full stack trace を標準表示用 detail に混ぜない sanitization を追加する。
- [ ] active workflow がない場合は no-op result を返す。
- [ ] audit append failure は再帰記録せず failed result として返す。

Traceability: R001、R008、NFR001、US001、US008。

### Step 4: `emitError` と top-level catch に Error Audit と telemetry を接続する

- [ ] `aidlc-lib.ts` の `emitError` で Step 3 helper を使う。
- [ ] `aidlc-orchestrate.ts` の error directive と top-level catch path で command scope と error record を閉じる。
- [ ] stdout JSON command では diagnostics を stdout に出さない。
- [ ] 既存 JSON error envelope の shape を維持する。

Traceability: R001、R003、R007、R008、US001、US003。

### Step 5: Hook Drop Doctor helper を追加する

- [ ] `aidlc-failure-evidence.ts` に `.aidlc-hooks-health/*.drops` reader を追加する。
- [ ] hook name、drop count、latest timestamp、latest reason の `HookDropSummary` を作る。
- [ ] missing directory は empty summary にする。
- [ ] malformed line は `DiagnosticFinding` warning に変換し、残りの file を処理する。
- [ ] full history は verbose detail へ分離し、standard output には載せない。

Traceability: R002、R007、NFR004、US002。

### Step 6: `doctor` 表示へ hook drop summary と telemetry status を接続する

- [ ] `aidlc-utility.ts` の `doctor` に Hook Drop Doctor の standard section を追加する。
- [ ] verbose option が既存にある場合は full history をそこへ接続し、なければ将来拡張用の構造だけに閉じる。
- [ ] malformed drops warning は doctor を失敗させず、人間が確認できる表示にする。
- [ ] doctor metrics と warning count を Telemetry Core facade へ渡す。

Traceability: R002、R003、R007、US002、US003、US009。

### Step 7: Telemetry を command lifecycle に接続する

- [ ] `aidlc-orchestrate.ts` の `next` と `report` に command scope を追加する。
- [ ] directive/report span を stage、result、Intent ref で相関できるようにする。
- [ ] `doctor` path に doctor metrics を追加する。
- [ ] exporter 未設定時の no-send を維持する。

Traceability: R003、R007、NFR002、US003。

### Step 8: U001 deterministic eval を追加する

- [ ] `dev-scripts/evals/failure-evidence-foundation/check.ts` を追加する。
- [ ] active workflow ありの error directive で `ERROR_LOGGED` が audit に残る fixture を作る。
- [ ] top-level catch 相当の helper fixture で `ERROR_LOGGED` が残ることを確認する。
- [ ] stdout JSON parse assertion を error path と telemetry path に入れる。
- [ ] `.drops` normal fixture、missing directory fixture、malformed fixture を確認する。
- [ ] OpenTelemetry no-op default no-send と test exporter seam を確認する。

Traceability: R001、R002、R003、R007、R008、US001、US002、US003、US008。

### Step 9: package script と標準検証へ接続する

- [ ] `package.json` に `test:it:failure-evidence-foundation` を追加する。
- [ ] `test:it:all` に U001 eval を接続する。
- [ ] `npm run typecheck`、`npm run lint:check`、`npm run test:it:failure-evidence-foundation`、`npm run test:all` の実行手順を code-summary に残す。

Traceability: R007、R009、US006、US007、US009。

### Step 10: 禁止変更と parity 境界を確認する

- [ ] `skills/` が変更されていないことを `git status --short skills .agents/skills` で確認する。
- [ ] `.coderabbit.yml` または `.coderabbit.yaml` を変更していないことを確認する。
- [ ] `dev-scripts/data/parity-map.json` の `engineFileExceptions` を変更しない。
- [ ] `npm run parity:check` の結果または失敗理由を code-summary に記録する。

Traceability: R006、R007、R009、US006、US007、US009。

### Step 11: Code Summary を作成する

- [ ] `code-summary.md` に作成・変更ファイル、実装判断、検証結果、計画からの逸脱を記録する。
- [ ] R001、R002、R003、R007、R008、R009 の検証証拠を対応付ける。
- [ ] collector、dashboard、cloud infrastructure、direct `skills/` edits を範囲外として明記する。

Traceability: R007、R009、US006、US007、US009。

## Test Strategy

Active test strategy は Comprehensive である。

U001 では UI と E2E 画面が存在しないため、Comprehensive の適用先は unit fixture、integration fixture、CLI-level deterministic eval とする。

| Test type | Planned file or command | Coverage |
|---|---|---|
| Unit fixture | `dev-scripts/evals/failure-evidence-foundation/check.ts` internal helper cases | ErrorEvidence、HookDropSummary、Telemetry no-op |
| Integration fixture | `dev-scripts/evals/failure-evidence-foundation/check.ts` sandbox command execution | `next` / `report` JSON stdout、audit shard、doctor output |
| Contract check | `npm run typecheck`、`npm run lint:check` | TypeScript strict と lint |
| Full verification | `npm run test:all` | existing eval suite と追加 U001 eval |
| Validator | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260704-workflow-failure-observa` | Intent artifact 構造 |
| Parity | `npm run parity:check` | parity boundary |

## Risks and Controls

| Risk | Control |
|---|---|
| stdout JSON に診断文が混ざる。 | JSON parse assertion を error path と telemetry path に入れる。 |
| OpenTelemetry が exporter 未設定で外部送信を試みる。 | no-op default no-send fixture を追加する。 |
| audit append failure が再帰する。 | `AuditWriteResult.failed` と再帰 guard を fixture で確認する。 |
| `.drops` malformed input で doctor が落ちる。 | malformed drops fixture で no-crash を確認する。 |
| parity 対象ファイルの変更で標準検証が落ちる。 | adapter/helper first で変更面を小さくし、parity result を code-summary に記録する。 |

## Plan Approval

この計画は実装前の承認対象である。

承認後に Step 1 から順にコード変更へ進む。
