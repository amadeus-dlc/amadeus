# Doctor in-process seam — Domain Entities

## モデル方針

本 unit は永続 database や状態ful aggregate を追加しない。`requirements.md` が求める
のは doctor 実行境界の refactor であるため、domain model は実行入力・診断結果を表す
小さな value object と、既存 check 結果の内部 record に限定する。

identity や lifecycle を持つ新規 entity を導入せず、次の4概念だけを明示する。

- `DoctorContext`: doctor run の不変入力 snapshot
- `DoctorRunResult`: doctor run の外部観測結果
- `DoctorCheckResult`: 既存の個別 check 結果を表す内部 record
- `DoctorPostOutputError`: output 完成後の fatal を順序どおり CLI へ運ぶ内部 error

## DoctorContext

### 責務

process-global な解決結果を doctor run の開始時点で固定し、core の実行を
session cwd、env、module cache の再読から切り離す。

### 属性

| 属性 | 型 | 必須 | 意味 |
|---|---|---|---|
| `projectDir` | `string` | yes | 診断対象 workspace の絶対 path |
| `harnessDir` | `string` | yes | 解決済み harness directory |
| `rulesSubdir` | `string` | yes | 解決済み rule subdirectory |
| `worktreeBaseDir` | `string` | yes | main checkout を基準にした worktree 管理 root |
| `platform` | `NodeJS.Platform` | yes | 実行開始時の platform |
| `homeDir` | `string \| undefined` | yes | Bun fallback 探索に使う HOME snapshot |
| `codexHomeDir` | `string` | yes | `CODEX_HOME` または HOME から解決した Codex 設定 root |
| `defaultScope` | `string` | yes | trim 済み `AMADEUS_DEFAULT_SCOPE`、未設定は空文字 |
| `migrationDoctor` | `boolean` | yes | `AMADEUS_MIGRATION_DOCTOR === "1"` の snapshot |
| `heartbeatSwapTarget` | `string \| undefined` | yes | test 環境だけで解決する既存 heartbeat TOCTOU 検証 seam の対象 path |
| `healthDirSwapTarget` | `string \| undefined` | yes | test 環境だけで解決する既存 health directory TOCTOU 検証 seam の対象 path |
| `nowMs` | `number` | yes | compose marker と standing grant の鮮度判定に共用する実行開始時刻 |
| `graph` | `DeepReadonly<GraphStage[]>` | yes | `loadGraph()` の defensive deep-frozen clone |
| `rules` | `DeepReadonly<RuleFile[]>` | yes | `loadRules()` の defensive deep-frozen clone |
| `agents` | `DeepReadonly<AgentMetadata[]>` | yes | `loadAgents()` の defensive deep-frozen clone |
| `scopeMapping` | `DeepReadonly<Record<string, ScopeDefinition>>` | yes | `loadScopeMapping()` の defensive deep-frozen clone |
| `artifactNames` | `readonly string[]` | yes | graph produces から導出した sorted/frozen union |

### 不変条件

- path field は resolver で一度だけ解決する
- `structuredClone` で loader cache との alias を切る
- nested array/plain object を再帰 freeze し、要素の変更も禁止する
- `process.env` object 自体を保持しない
- cache reset 関数や mutable loader を field に持たない
- output writer、exit callback、test mode を持たない
- `heartbeatSwapTarget` と `healthDirSwapTarget` は test mode そのものではなく、
  resolver が `NODE_ENV === "test"` のときだけ確定する既存の任意 seam 値とする
- `nowMs` は clock callback/port ではなく、1 run 内の鮮度判定を固定する単一の数値とする

### 生成

production は `resolveDoctorContext(projectDir)` だけが生成を担当する。テストは
fixture builder で同じ shape を生成するが、production resolver を monkeypatch
しない。context は run 終了後に保存・再利用しない。

`GraphStage` は `StageEntry` を extends するため、schema 検証箇所は
`context.graph` を `readonly StageEntry[]` view として使用する。別の
`loadStageGraph()` 呼び出しや型変換 object は作らない。

## DoctorRunResult

### 責務

core の同期実行結果を、process 制御を伴わず CLI wrapper とテストへ渡す。

### 属性

| 属性 | 型 | 意味 |
|---|---|---|
| `exitCode` | `0 \| 1` | 全 check 成功なら0、1件以上失敗なら1 |
| `output` | `string` | 既存順序・文面・最終改行を保持した完全な stdout |

### 不変条件

- `exitCode` は `0` または `1` 以外を取らない
- `output` は header と `N passed, M failed` 集計を含む
- 通常診断失敗でも result は返る
- catch 対象外の致命的例外では result を生成しない
- result は audit や cleanup の完了後にのみ返す

### lifecycle

1. `handleDoctor` が check 結果を集計する
2. output と exit code を導出する
3. immutable result を返す
4. wrapper が output と exit code を消費する
5. result は永続化しない

## DoctorCheckResult

### 責務

既存 `results: Array<{ pass: boolean; label: string; fix?: string }>` の意味論を
名前付き内部型として表す。公開 API 化や別 module 化は要求しない。

### 属性

| 属性 | 型 | 意味 |
|---|---|---|
| `pass` | `boolean` | check が成功したか |
| `label` | `string` | 利用者へ表示する診断説明 |
| `fix` | `string \| undefined` | 失敗時の修復提案 |

### 不変条件

- `label` は空文字にしない
- `fix` は失敗時だけ出力する
- insertion order が最終 output order になる
- `DoctorCheckResult` 自体は audit や process I/O を行わない

## DoctorPostOutputError

### 責務

現行 CLI で full stdout の後に実行される `HEALTH_CHECKED` audit が失敗した場合、
stdout と original failure の順序を維持して wrapper へ渡す。

### 属性

| 属性 | 型 | 意味 |
|---|---|---|
| `output` | `string` | audit 失敗前に完成していた full doctor stdout |
| `cause` | `unknown` | `appendAuditEvent` が投げた original error |

### 不変条件

- 通常診断失敗には使用しない
- output 完成前の fatal には使用しない
- wrapper は `output` を1回だけ書き、`cause` をそのまま再throwする
- wrapper は error 自体の独自 stderr を出さず、明示 `process.exit` を呼ばない
- 永続化、audit 記録、外部 export をしない

## 関係

```text
resolveDoctorContext(projectDir)
  creates 1 DoctorContext

handleDoctor(DoctorContext)
  creates N DoctorCheckResult
  derives 1 DoctorRunResult
  may throw 1 DoctorPostOutputError after output completion

runUtilityMain
  consumes 1 DoctorRunResult
  or unwraps DoctorPostOutputError
```

`DoctorContext` と `DoctorRunResult` の間に identity-based relation はない。
どちらも1回の doctor invocation に閉じた value object である。

## 所有権と変更境界

| 概念 | owner | 変更理由 |
|---|---|---|
| `DoctorContext` | context resolver / doctor core 境界 | process-global 依存の追加・削除 |
| `DoctorRunResult` | doctor core / CLI wrapper 境界 | CLI が観測する結果契約の変更 |
| `DoctorCheckResult` | doctor core 内部 | 個別診断の表示構造変更 |
| `DoctorPostOutputError` | doctor core / CLI wrapper 内部 | fatal 時の output 順序契約 |

新しい check を追加しても、既存 context field を必要としない限り
`DoctorContext` を変更しない。個別 check の内部情報を表示したいだけなら
`DoctorRunResult` に field を増やさず、`output` へ既存形式で反映する。

## 非該当モデル

- frontend component: CLI refactor のため存在しない
- database entity / repository: 永続 model を追加しない
- domain event: 既存 audit event の意味論を維持し、新規 event は追加しない
- comprehensive I/O port: Minimal scope と Q3-A により導入しない

## 要件トレーサビリティ

| モデル | 要件 |
|---|---|
| `DoctorContext` | FR-1、FR-4、NFR-3、NFR-4 |
| `DoctorRunResult` | FR-2、FR-3、NFR-1、NFR-2 |
| `DoctorCheckResult` | FR-5、FR-6 |
| `DoctorPostOutputError` | FR-3、FR-5、NFR-1 |
