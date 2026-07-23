# Doctor in-process seam — Business Logic Model

## 入力と設計目的

本設計は `requirements.md` の FR-1〜FR-6、NFR-1〜NFR-4を実装可能な
境界へ具体化する。対象 unit は `doctor-inprocess-seam` の1つであり、
既存 `packages/framework/core/tools/amadeus-utility.ts` の doctor 診断ロジックを（FR-1）
別機能へ分解せず、process-global な入口だけを薄くする。

確定した設計判断は次の3点である。

- `handleDoctor` を同期 core とし、`DoctorRunResult` を返す
- `DoctorRunResult` は `{ exitCode: 0 | 1; output: string }` とする
- production resolver が小さな `DoctorContext` snapshot を構築する

## 責務境界

| 境界 | 責務 | 禁止事項 |
|---|---|---|
| `runUtilityMain` の doctor arm | project directory の解決、context 構築、core 呼び出し、stdout 出力、process exit | doctor check の再実装 |
| `resolveDoctorContext` | process-global な値を1回だけ読み、immutable snapshot を構築 | 診断結果の判定、audit/cleanup |
| `handleDoctor` | context に基づき既存 check を順に実行し、正当な doctor 副作用を実施して結果を返す | stdout/stderr 書き込み、process exit、env/cwd の再読 |
| 既存 check/helper | FS、subprocess、audit、lock cleanup を含む現在の診断処理 | 新しい包括的 I/O abstraction の導入 |

処理の依存方向は以下で固定する。

```text
runUtilityMain
  -> resolveDoctorContext(projectDir)
  -> handleDoctor(context)
       -> existing checks/helpers
       -> audit append / stale-lock cleanup
  <- DoctorRunResult
  -> process.stdout.write(result.output)
  -> process.exit(result.exitCode)
```

## データ契約

概念上の型は次の形とする。具体的な import 型名は既存モジュールの export に合わせ、
Code Generation でコンパイル可能な最小形へ調整する。

```typescript
interface DoctorContext {
  readonly projectDir: string;
  readonly harnessDir: string;
  readonly rulesSubdir: string;
  readonly worktreeBaseDir: string;
  readonly platform: NodeJS.Platform;
  readonly homeDir: string | undefined;
  readonly codexHomeDir: string;
  readonly defaultScope: string;
  readonly migrationDoctor: boolean;
  readonly heartbeatSwapTarget: string | undefined;
  readonly healthDirSwapTarget: string | undefined;
  readonly nowMs: number;
  readonly graph: DeepReadonly<GraphStage[]>;
  readonly rules: DeepReadonly<RuleFile[]>;
  readonly agents: DeepReadonly<AgentMetadata[]>;
  readonly scopeMapping: DeepReadonly<Record<string, ScopeDefinition>>;
  readonly artifactNames: readonly string[];
}

interface DoctorRunResult {
  readonly exitCode: 0 | 1;
  readonly output: string;
}
```

`DoctorContext` はテスト専用 mode や fake を識別するフラグを持たない。
`heartbeatSwapTarget` と `healthDirSwapTarget` は既存 TOCTOU 安全性テストの
任意 seam 値であり、production では常に `undefined` となる。production と test は
同じ `handleDoctor(context)` を呼び、渡す値だけが異なる。

型と loader の対応は次で固定する。

| context field | canonical type | resolver source |
|---|---|---|
| `graph` | `GraphStage[]` (`amadeus-graph.ts`) | `loadGraph(): GraphStage[]` を1回 |
| stage schema view | `readonly StageEntry[]` (`amadeus-lib.ts`) | `graph` を `GraphStage extends StageEntry` の構造的 view として使用。`loadStageGraph()` は core/resolver から呼ばない |
| `rules` | `RuleFile[]` (`amadeus-graph.ts`) | `loadRules(): RuleFile[]` を1回 |
| `agents` | `AgentMetadata[]` (`amadeus-lib.ts`) | `loadAgents(): AgentMetadata[]` を1回 |
| `scopeMapping` | `Record<string, ScopeDefinition>` (`amadeus-lib.ts`) | `loadScopeMapping()` を1回 |
| `artifactNames` | `readonly string[]` | `graph` の required/optional produces の union を resolver 内で導出 |

`validScopes()` と `artifactsRegistry()` は core から呼ばない。valid scope は
`Object.keys(context.scopeMapping)`、artifact registry は `context.artifactNames`
から導出し、loader cache の二重参照を避ける。

## Production context 解決フロー

`resolveDoctorContext(projectDir)` は doctor 実行開始時に次の順で値を確定する。

1. `projectDir` を受け取り、以降の path 解決の基準にする
2. `harnessDir()` と `rulesSubdir()` を各1回呼び、選択結果を保存する
3. `worktreeBaseDir(projectDir)` を1回呼び、main checkout 基準 directory を保存する
4. `process.platform`、`HOME`、`CODEX_HOME`、`AMADEUS_DEFAULT_SCOPE`、
   `AMADEUS_MIGRATION_DOCTOR` を読み、値として保存する
5. `NODE_ENV === "test"` のときだけ既存 TOCTOU 検証用の
   `AMADEUS_DOCTOR_TEST_SWAP_HEARTBEAT_TARGET` と
   `AMADEUS_DOCTOR_TEST_SWAP_HEALTH_DIR_TARGET` を任意値として保存する。
   production では両方を `undefined` に固定する
6. `Date.now()` を1回だけ読み `nowMs` として保存する
7. `loadGraph()`、`loadRules()`、`loadAgents()`、`loadScopeMapping()` を各1回呼ぶ
8. artifact name union を graph snapshot から導出する
9. loader 戻り値を `structuredClone` で防御的コピーする
10. clone の全 array、plain object、nested value を `deepFreezeDoctorSnapshot` で再帰 freeze する
11. outer `DoctorContext` 自体も `Object.freeze` して core へ渡す

`deepFreezeDoctorSnapshot` は snapshot 構築専用の小さな helper とし、cycle を持たない
JSON-compatible な graph/rule/agent/scope metadata だけを受け取る。`Set` や callback
は context に保存しない。これにより loader cache への alias を切り、readonly の
compile-time 制約だけでなく実行時にも BR-4 を保証する。

loader の module cache は resolver の外側に残してよい。テストは cache を reset して
global loader を再実行するのではなく、deep-frozen fixture context を直接渡す。

## 推移的な global 依存の封じ込め

`handleDoctor` の call tree について、次を core から排除する対象として固定する。

| 現行参照 | 置換先 |
|---|---|
| `process.platform` | `context.platform` |
| `process.env.HOME` | `context.homeDir` |
| `process.env.CODEX_HOME` | `context.codexHomeDir` |
| `process.env.AMADEUS_DEFAULT_SCOPE` | `context.defaultScope` |
| `process.env.AMADEUS_MIGRATION_DOCTOR` | `context.migrationDoctor` |
| `process.env.NODE_ENV` と既存 swap target env | `context.heartbeatSwapTarget` / `context.healthDirSwapTarget` |
| `Date.now()`（compose marker / standing grant） | `context.nowMs` |
| `harnessDir()` | `context.harnessDir` |
| `rulesSubdir()` | `context.rulesSubdir` |
| `worktreeBaseDir(projectDir)` | `context.worktreeBaseDir` |
| `loadGraph()` / `loadStageGraph()` | `context.graph` とその `StageEntry` view |
| `loadRules()` | `context.rules` |
| `loadAgents()` | `context.agents` |
| `loadScopeMapping()` / `validScopes()` | `context.scopeMapping` |
| `artifactsRegistry()` | `context.artifactNames` |

この表は direct call だけでなく、doctor のために保持する local helper が同じ値を
必要とする場合にも適用する。該当 helper は値を引数で受け取り、上表の loader/env/cwd
を再読しない。

`settingsDoctorCheck(projectDir)` と `memoryDirFor(projectDir, DEFAULT_SPACE)` は
project directory の実ファイルだけを読むため維持する。`detectLeakedLocks` 内部の
lock timeout/temp-dir env、Bun executable 探索、FS、subprocess、audit writer は
既存 subsystem の動作入力であり、Q3-A の snapshot 対象外とする。clock 自体を
context port には包まないが、doctor が直接行う compose marker と standing grant の
鮮度判定には resolver が1回だけ取得した `nowMs` を共用する。NFR-4 の決定性対象は
上表の doctor routing/catalog と直接鮮度判定の依存に限定する。

## Core 実行フロー

`handleDoctor(context)` は現在の check 順を維持して同期実行する。

1. `results` と出力 buffer を初期化する
2. runtime・hook・harness・設定の check を実行する
3. heartbeat、audit lock、state、intent、worktree の check を実行する
4. compiled graph、stage schema、scope、rule/sensor pairing の check を実行する
5. 各 check の `{ pass, label, fix? }` を現在と同じ順で集計する
6. 既存 audit がある場合だけ `GUARDRAIL_LOADED` を従来位置で追記する
7. stale audit lock の cleanup を現在どおり doctor の正当な副作用として実行する
8. header、各結果、区切り、`N passed, M failed` を現在と同じ文字列へ整形する
9. `failed === 0 ? 0 : 1` で exit code を決定する
10. 既存 audit がある場合だけ `HEALTH_CHECKED` を従来位置相当で追記する
11. stdout を変更せず `{ exitCode, output }` を返す

各 check 内で現在 catch されて診断失敗へ変換される例外は、同じ label と fix を持つ
失敗結果へ変換し続ける。現在 catch されない audit write 等の致命的例外は、
新たに握りつぶさず CLI 境界まで伝播させる。

## CLI wrapper フロー

`runUtilityMain` の `case "doctor"` は以下の順序だけを担当する。

1. `resolveProjectDir` 済みの `projectDir` から `resolveDoctorContext` を呼ぶ
2. `handleDoctor(context)` を1回呼ぶ
3. `process.stdout.write(result.output)` を1回呼ぶ
4. `process.exit(result.exitCode)` を1回呼ぶ

診断上の通常失敗は例外ではなく exit code `1` である。catch 対象外の致命的例外は、
既存の stdout 順序を保つため次の契約で扱う。

- `GUARDRAIL_LOADED` を含む output 完成前の致命的例外: core は original error を
  そのまま投げ、wrapper は stdout を書かず再throwする
- output 完成後の `HEALTH_CHECKED` 失敗: core は
  `DoctorPostOutputError(output, cause)` を投げる
- wrapper は `DoctorPostOutputError` の場合だけ `output` を1回 stdout へ書き、
  `cause` を再throwする。`process.exit` は呼ばない
- Bun は original cause を stderr に表示し、process status は `1` になる
- wrapper 自身は stderr 文面を追加しない。stack 全文は安定契約とせず、
  original error message の包含と status `1` を受入条件とする

これにより、現行の「full stdout の後に HEALTH audit が失敗する」経路も維持する。
`DoctorPostOutputError` は期待される診断失敗を表す型ではなく、CLI 出力順を保存する
ための内部 transport error である。

## テストフロー

### In-process

- production resolver を通さず、fixture の `DoctorContext` を直接構築する
- `handleDoctor(context)` の戻り値だけで exit code と完全な出力を検証する
- core 実行前後で `process.env`、`process.platform`、`Date.now` を変更しても、
  解決済み context の結果が変わらないことを検証する
- stdout、`process.exit` は monkeypatch しない
- graph/cwd/harness の正常系と失敗系を context 差分で駆動する
- frozen context の nested graph 変更が `TypeError` になることを検証する
- core が resolver/loader/env/cwd を再読しないことを fixture と call-count seam で検証する
- audit と stale lock cleanup は一時 project directory の実ファイルで検証する

### Spawn contract

- t37、t83、t210 相当の既存テストを維持する
- CLI argv、実 cwd/main-checkout anchor、配布 tree、stdout、終了コードを検証する
- output 完成前の fatal は stdout なし・stderr に原因・status 1 を検証する
- `DoctorPostOutputError` は full stdout・stderr に原因・status 1・明示 exit なしを検証する
- spawn coverage は core の line coverage 根拠に使わず、外部契約の根拠に限定する

## 実装順序

1. `DoctorContext`、`DoctorRunResult`、内部 `DoctorPostOutputError` を追加する
2. `resolveDoctorContext(projectDir)` を追加する
3. loader 型対応と `deepFreezeDoctorSnapshot` を実装する
4. `handleDoctor` の入力を context、戻り値を `DoctorRunResult` に変更する
5. 推移的 global 依存表の全参照を context または helper 引数へ置換する
6. 末尾の `process.stdout.write` と `process.exit` を return/transport error へ置換する
7. `runUtilityMain` の doctor arm に output/exit と transport error 処理を移す
8. 既存 in-process テストを戻り値契約へ移し、新規・変更行を直接 hit させる
9. spawn 契約テストと fatal-path テスト、full quality checks で外部互換性を確認する

## 要件トレーサビリティ

| 要件 | 設計箇所 |
|---|---|
| FR-1 | 責務境界、Core 実行フロー |
| FR-2 | データ契約、Core 実行フロー |
| FR-3 | CLI wrapper フロー |
| FR-4 | Production context 解決フロー |
| FR-5 | Core 実行フロー、例外方針 |
| FR-6 | テストフロー |
| NFR-1〜NFR-4 | 責務境界、context snapshot、二層テスト |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:12:04Z
- **Iteration:** 1
- **Scope decision:** none

境界の方向性と要件トレーサビリティは妥当ですが、process-global依存の封じ込め、snapshot不変性、型契約、致命的例外時のCLI互換性が実装可能な粒度まで確定していません。

### Findings

- FR-4／BR-3の境界が推移的に定義されておらず、handleDoctor自身の直接参照だけを置換しても、保持する既存check/helper内部がprocess.env、cwd、graph/cache loaderを再読すればin-process制御性とNFR-4の決定性を満たせません。対象依存を呼出し階層全体で列挙し、context値へ置換する範囲を確定してください。
- DoctorContextをimmutable snapshotとしていますが、readonly配列とshallow freezeではgraph／stageEntries配列および要素の変更を防げません。防御的コピー・deep freeze・不変loader契約のいずれでBR-4を保証するか明記してください。
- GraphStage、StageEntry、loadGraph、loadStageGraphは解決可能な型・呼出し契約が示されず「Code Generationで調整」と先送りされています。各loaderの戻り値とDoctorContext fieldの対応を確定しない限り、開発者が型変換や二重ロードの要否を推測する必要があります。
- FR-3／NFR-1がstderrと終了状態の互換性を要求する一方、catch対象外例外は「Bunの失敗として伝播」としか定義されておらず、部分stdout、stderr、終了コード、process.exit非実行時の既存契約と受入テストが未確定です。致命的例外経路の観測契約を明記してください。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:19:01Z
- **Iteration:** 2
- **Scope decision:** none

第1回レビューの4件はすべて解消されています。推移的なglobal依存の置換範囲、snapshotの防御的コピーと再帰freeze、loaderとcontext型の対応、致命的例外時のstdout・stderr・終了状態が実装可能な契約として確定しました。要件、業務ロジック、ルール、ドメインモデル間の責務・例外・副作用・テスト契約にも阻害的な矛盾はありません。

### Findings

- None
