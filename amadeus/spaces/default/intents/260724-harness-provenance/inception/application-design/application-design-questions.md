# Application Design Questions — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, architecture.md, component-inventory.md, team-practices.md

以下は requirements.md の FR-1〜FR-3(E-HPFR3 裁定反映済み)と architecture.md の RE 実測(既存 `deriveHarnessDir()`/`getField`/`setOrInsertField` の file:line)からの直接導出であり、新規の価値判断を含まない。cid:requirements-analysis:no-election-judgment-gate に基づき選挙不要判定を leader へ申告のうえ承認を得た。承認: leader が承認しました(2026-07-24T12:37:08Z)。leader の補足: env var 名(`AMADEUS_HARNESS_TYPE`)はユーザー可視契約になるため命名は既存規約(`AMADEUS_HARNESS_DIR` 先例)に忠実にし、docs への反映も設計に含めること — decisions.md ADR-2 で対応。

## Q1. ハーネス検出関数の配置は?

[Answer]: A — `detectHarnessType(): HarnessType`を新設し、`HarnessType`はmanualを含む7値とする。自動検出は6値、override経由でmanualを含む7値目が入る

- A. `packages/framework/core/tools/amadeus-lib.ts` へ新設(既存 `deriveHarnessDir()` `:168-183`・`KNOWN_HARNESS_DIRS` `:158` と同じファイル、core 中立層)。team-practices.md の cid:code-generation:harness-tools-placement は harness 専用ツールを対象とするが、本検出関数は全ハーネス共通の汎用機能であり `deriveHarnessDir()` と同じ層に置くのが正しい(harness 専用ではない)
- X. Other

## Q2. 検出関数の型と戻り値は?

[Answer]: A

- A. `detectHarnessType(): HarnessType` を新設。`HarnessType = "claude-code" | "codex" | "cursor" | "opencode" | "kiro" | "unknown" | "manual"`。自動検出のみではmanual以外の6値、`AMADEUS_HARNESS_TYPE` override経由ではmanualを含む7値を返しうる。team-practices.md のDecided(functional-domain-modeling-ts、scalarは判別ユニオン)に従う
- X. Other

## Q3. state.md へのフィールド書込の呼出箇所は?

[Answer]: A

- A. `handleIntentBirthStateBuild()`(`amadeus-utility.ts:3926`)の `stateContent` テンプレート(`:4092-4144`)へ `- **Harness**: ${harnessType}` 行を追加(Project Information ブロック内、`:4094-4103`)。birth 時に `detectHarnessType()` を呼び、結果を埋め込む
- X. Other

## Q4. manual 上書き経路(FR-1 AC-1d)は?

[Answer]: A

- A. `AMADEUS_HARNESS_TYPE` env override を新設し、設定時は自動検出より優先する(既存の `AMADEUS_HARNESS_DIR` と同じ env override パターン)。これにより `unknown`/補助シグナルを `manual`(または明示的なハーネス種別)へ上書きできる。CLI フラグ追加は影響範囲が広いため env override を第一手とし、CLI フラグは将来 enhancement とする
- X. Other

## Q5. `harnessDir()`が実検出`.claude`とfallback `.claude`を区別できない問題は?

[Answer]: A — 既存`harnessDir(): string`の互換性を保ち、内部resolverが`env / script-path / cwd-probe / fallback`を保持する。`detectHarnessType()`はsource=fallbackだけを`unknown`にする（ユーザー承認: 2026-07-24T17:28:19Z）

- A. Application Designへ戻り、内部provenance-aware resolverを設計する。公開`harnessDir(): string`は互換維持する
- B. AC-3cを変更し、fallbackも`claude-code`として扱う
- C. `CLAUDECODE=1`がない`.claude`を常に`unknown`とする
- X. Other
