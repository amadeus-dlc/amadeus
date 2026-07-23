# Code Generation Plan — U1-mirror-tool

## 計画の前提

- 対象 Unit は `U1-mirror-tool`。ユーザーストーリー工程はスコープ上 SKIP のため、トレーサビリティの正本を `U1`、`FR-1`、`FR-2`、`BR-U1-1`〜`BR-U1-6` とする。
- Brownfield の外科的変更とし、既存 `create` / `sync` / `close` の CLI 契約、出力、exit code、`GhRunner` シーム、close の landing check を変えない。
- 実装正本は `packages/framework/core/tools/amadeus-mirror.ts` のみとし、`scripts/amadeus-mirror.ts` は同一変更で廃止する。別名コピーや互換 shim は作らない。
- Test Strategy は **Comprehensive**。既存 t232 を基礎に unit / integration / E2E 相当を揃え、主要コンポーネントごとに既存ケースを含め 10〜15 ケースを目安とする。新規テスト番号は増やさず、U1 の既存正本である t232 に集約する。
- DB、repository、HTTP API、UI、IaC は本 Unit に存在しないため対象外。設定変更も原則不要であり、既存の Bun test runner、TypeScript、Biome、package scripts を正本として使う。

## 変更ファイル候補

| 区分 | ファイル | 予定変更 |
|---|---|---|
| 正本ツール | `packages/framework/core/tools/amadeus-mirror.ts` | `scripts/` から移設し、core 相対 import / project root 解決を整合。`status`、`StatusFinding`、`StatusOutcome`、読取専用比較、usage 注記を追加 |
| 廃止対象 | `scripts/amadeus-mirror.ts` | 正本移設と同時に削除 |
| unit | `tests/unit/t232-amadeus-mirror.test.ts` | import を core 正本へ変更。status の純関数、3 finding、複合 finding、exit 0/1/2、usage を検証 |
| integration | `tests/integration/t232-amadeus-mirror.integration.test.ts` | import を core 正本へ変更。実 FS + fake `GhRunner` で status、gh 前提、record 前提、書込ゼロ、既存3 verb 不変を検証 |
| E2E 相当 | `tests/integration/t232-amadeus-mirror.integration.test.ts` | core 正本および生成済み各 harness の CLI 実行面を subprocess で検証するケースを追加する候補。OS 非依存 fake 実行を優先 |
| テスト／品質設定 | `package.json`、`tests/run-tests.ts`、`tsconfig.json`、`tsconfig.tests.json`、`biome.json` | 原則変更なし。既存 `test:ci` / `coverage:ci` / typecheck / lint 設定で U1 が収集されることを確認し、実測で不足が判明した場合だけ最小変更 |
| 配布生成物 | `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/tools/amadeus-mirror.ts` および自己導入面 | 手編集禁止。core 正本から `bun run dist` / `bun run promote:self` で生成し、check で一致を検証 |

## 実装計画

- [x] **Step 1: 移設前ベースラインと変更面を固定する**  
  `scripts/amadeus-mirror.ts`、t232 unit / integration、全 harness manifest の `coreDirs { src: "tools", dst: "tools" }`、package scripts を棚卸しする。移設前の t232 全ケース数・標準出力・標準エラー・exit code を保存し、`create` / `sync` / `close` の回帰オラクルとする。  
  **検証:** `bun test tests/unit/t232-amadeus-mirror.test.ts tests/integration/t232-amadeus-mirror.integration.test.ts` が green。  
  **Trace:** U1、FR-1、BR-U1-1、PD-U1-2。

- [x] **Step 2: mirror ツールを core tools へ移設し scripts 版を廃止する**  
  `scripts/amadeus-mirror.ts` を `packages/framework/core/tools/amadeus-mirror.ts` へ履歴を保つ移設として扱い、`amadeus-lib` import と `PROJECT_DIR` 解決だけを core 配置に合わせる。t232 の import を core 正本へ更新する。移設時点では機能変更を混ぜず、旧 `scripts/amadeus-mirror.ts`、shim、二重実装を残さない。  
  **検証:** t232 の既存アサーションが変更なしで green、`git grep -l 'scripts/amadeus-mirror' -- tests packages scripts` で意図した参照更新のみ、`test ! -e scripts/amadeus-mirror.ts`。  
  **Trace:** U1、FR-1、N-1、BR-U1-1。

- [x] **Step 3: 移設の配布面と platform 差を先に固定する**  
  core `tools/` が claude / codex / cursor / kiro / kiro-ide / opencode の6面へ同じ正本から投影されることを確認する。POSIX path と Windows path の差をロジックへ持ち込まず、URL 由来のモジュール位置、path separator、`gh` 起動を Bun の引数配列 spawn で扱えることをテストする。既存の `#!/bin/sh` gh stub は Windows で成立しないため、platform 分岐で shell script を増やすのではなく、純関数と注入 `GhRunner` を全 OS 共通の主検証面とし、real-process smoke は実行可能 substrate に限定して明示 skip するか Bun 実行可能 stub に置換する。  
  **検証:** 6面に `amadeus-mirror.ts` が実在し byte-equivalent、`path.posix` / `path.win32` 相当の path semantics と shell 非経由の args 配列をテスト、platform 条件が本番の status 判定へ混入しない。  
  **Trace:** U1、FR-1、BR-U1-1、SD-U1-1、SD-U1-2。

- [x] **Step 4: status の型と引数／usage 契約を test-first で追加する**  
  `ArgsOutcome` の verb 集合へ `status` を追加し、正式名 `StatusFindingKind` / `StatusFinding` / 非空 findings を返す `StatusOutcome` を追加する。usage は core 正本パスと `<create|sync|close|status>` を示し、「create/close は conductor から実行する運用合意であり機械強制ではない」ことと team rules 参照を明記する。「拒否される」等、強制を装う文言は使わない。まず未実装で落ちる parse / usage / exit mapping テストを実行して red を保存してから実装する。  
  **検証:** `status` と `--intent` を受理し、未知 verb / flag / 値欠落は Usage 行付き exit 2。`create` / `sync` / `close` の parse 結果は不変。  
  **Trace:** U1、FR-2、BR-U1-1、BR-U1-3、BR-U1-6。

- [x] **Step 5: status 比較の純関数を test-first で実装する**  
  Snapshot と Issue view 結果を入力に、`mirror-missing` → `stale-status-line` → `issue-drifted` の決定順で `StatusOutcome` を作る純関数を追加する。期待本文は既存 `renderBody`（必要なら意味を変えない `renderExpectedBody` への rename / alias）を create / sync / status の唯一の正本として再利用し、独立オラクルを作らない。Issue 不在が gh 実文から確定した場合だけ `mirror-missing`、ネットワーク等の判別不能な view 失敗は precondition とする。mirror 不在時は stale / drifted を判定不能として追加しない。  
  **検証:** 3 finding 各単独、stale+drifted 複合列挙、clean、mirror 不在、Issue 404、不確定 view error、同一 snapshot の決定性を unit test で固定する。各 finding テストは未実装状態の red と実装後 green を記録する。  
  **Trace:** U1、FR-2、BR-U1-2、BR-U1-3、BR-U1-4、SD-U1-3。

- [x] **Step 6: status の gh read gateway と main 配線を実装する**  
  `ensureGhReady` → `buildSnapshot` → `gh issue view --json body` → 純関数比較の同期直列フローを、既存 `GhRunner` / `spawnGh` だけで実装する。新しい shell / spawn 面、並列化、cache、timeout は追加しない。`main` は status 分岐だけを追加し、既存3 verb の初期化・handler 経路を変更しない。結果表示は finding の kind と自前生成 detail のみとし、Issue body 生値を出力しない。  
  **検証:** clean=0、diverged=1、gh 不在・未認証・record 不在・判別不能 view error=2。usage=2 とは Usage 行対 precondition 理由文で識別できる。status 経路の gh call は `auth status` と `issue view` のみ。  
  **Trace:** U1、FR-2、BR-U1-2、BR-U1-3、BR-U1-5、PD-U1-1、PD-U1-2、SD-U1-1、SD-U1-2、SD-U1-3。

- [x] **Step 7: integration テストで実 FS、gh 前提、書込ゼロを固定する**  
  t232 integration の実 record fixture と fake `GhRunner` で main を直接駆動する。clean / 3 finding / 複合 finding、gh executable 相当不在、未認証、record 不在、Issue 不在と network error の区別、明示 `--intent` を検証する。status 前後で `amadeus-state.md`、`intents.json` の bytes と gh call 一覧を比較し、`writeMirrorIssueField`、`issue edit/create/close` が呼ばれないことを証明する。  
  **検証:** status integration が 0/1/2 を返し、全 status ケースで record bytes 不変・gh read-only。目的分岐を踏んだことを assertion と lcov DA の両方で確認する。  
  **Trace:** U1、FR-2、BR-U1-2、BR-U1-3、BR-U1-4、BR-U1-5。

- [x] **Step 8: Comprehensive の E2E 相当と既存 verb 回帰を完成させる**  
  subprocess から core 正本の CLI を起動し usage/status の stdout・stderr・exit 0/1/2 を固定する。生成後は代表 harness だけでなく6 harness の投影ファイルを列挙し、各投影が core と同じ CLI entry を持つことを確認する。既存 t232 の create / sync / close は全ケースを維持し、出力・fail=1・usage=2・landing check・`GhRunner` call sequence の baseline 差分がないことを確認する。  
  **検証:** unit / integration / E2E 相当の全層 green。platform 非依存ケースは darwin / linux / win32 semantics を host 非依存に駆動し、real gh は資格情報へ依存させない。  
  **Trace:** U1、FR-1、FR-2、BR-U1-1、BR-U1-3、BR-U1-5、N-1。

- [x] **Step 9: テスト設定と lcov を検証する**  
  既存 `tests/run-tests.ts` の Bun `--coverage --coverage-reporter=lcov`、`package.json` の `coverage:ci`、TypeScript / Biome 対象が移設後 core file と t232 を含むことを確認する。設定追加は不足が実測された場合だけ行う。coverage を生成し、status の新規実行行・分岐に未カバーがないこと、特に precondition と各 finding の目的分岐へ DA hit があることを確認する。spawn-only green で代替せず in-process seam を lcov carrier とする。  
  **検証:** `bun tests/run-tests.ts --ci --coverage --coverage-dir coverage`、`coverage/lcov.info` の `SF:packages/framework/core/tools/amadeus-mirror.ts` と該当 DA / BRDA、未カバー新規行 0。  
  **Trace:** U1、FR-1、FR-2、N-2、BR-U1-1〜BR-U1-5。

- [x] **Step 10: 配布生成と scripts 版ゼロを E2E 検証する**  
  core 正本から配布物と自己導入面を再生成し、生成結果を手編集しない。全6 harness の投影、core と dist の byte equality、旧 scripts 版および scripts 向け参照のゼロ件を機械確認する。  
  **検証:** `bun run dist`、`bun run promote:self`、`bun run dist:check`、`bun run promote:self:check`、`find dist -name 'amadeus-mirror*'` の6 harness 面、`git grep -l amadeus-mirror scripts/` が0件。  
  **Trace:** U1、FR-1、N-3、BR-U1-1。

- [x] **Step 11: 全品質ゲートと差分監査を実行する**  
  U1 の変更だけで typecheck、lint、t232、全 CI test を通す。差分を監査し、既存3 verb の status 分岐以外の経路に追加がないこと、status に書込 API がないこと、認証情報非接触、Issue body 生出力なし、対象外の設定・API・DB・IaC 変更なしを確認する。  
  **検証:** `bun run typecheck`、`bun run lint:check`、t232 unit / integration、`bun tests/run-tests.sh --ci`（または正本 `bun tests/run-tests.ts --ci`）、`bun run dist:check`、`bun run promote:self:check` がすべて green。  
  **Trace:** U1、FR-1、FR-2、N-1〜N-4、BR-U1-1〜BR-U1-6。

## テストケース配分

| 層 | 主対象 | 必須ケース |
|---|---|---|
| Unit | parse / render / status outcome / exit mapping | status parse、未知入力 usage、clean、3 finding 各単独、複合 finding、mirror-missing 時の後続判定抑止、Issue 不在対判別不能 error、0/1/2、決定性 |
| Integration | 実 FS record + fake GhRunner + main | gh ready/unready、record 不在、明示 intent、Issue view JSON、3 finding、read-only bytes、read-only gh call、既存 create/sync/close 回帰 |
| E2E 相当 | CLI subprocess + core→6 harness 配布 | usage/precondition stderr 差、exit 0/1/2、core entry 実行、6面投影、scripts 版0、dist/self-install 再生成一致 |

## 完了条件

- `packages/framework/core/tools/amadeus-mirror.ts` が唯一の実装正本で、`scripts/amadeus-mirror.ts` とその参照が残っていない。
- `create` / `sync` / `close` の既存挙動が t232 baseline と一致する。
- `status` が3 finding を対象存在範囲で独立列挙し、clean / diverged / precondition を exit 0 / 1 / 2 に写像する。
- status は gh / record の書込ゼロで、gh 不在・未認証・record 不在を loud に報告する。
- Comprehensive の unit / integration / E2E 相当、落ちる実証、platform 差、lcov 新規行未カバー0が成立する。
- `dist:check`、`promote:self:check`、typecheck、lint、t232、CI test がすべて green である。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:46:10Z
- **Iteration:** 1
- **Scope decision:** approved — U1-CG-SPOT-001 — packages/framework/core/tools/amadeus-mirror.ts — reason: Verify the canonical implementation boundary, status isolation, read-only behavior, spawn reuse, output sanitization, and maintainability. — owner: amadeus/spaces/default/intents/260719-mirror-productization/construction/U1-mirror-tool/functional-design/business-logic-model.md#Integration spot-check owner: U1-CG-SPOT-001 — `packages/framework/core/tools/amadeus-mirror.ts`

限定spot-checkでstatus隔離、read-only、spawn再利用、出力サニタイズ、保守性を確認し、CLI境界検証の追跡も閉じた。

### Findings

- RESOLVED CG-U1-I1-001: 実装構造・セキュリティ・既存経路非変更を確認。
- RESOLVED CG-U1-I1-002: CLI境界検証とStep 8適応差分をcode-summaryへ明記。
- RESOLVED CG-U1-I1-003: 先頭コメントへstatusとverb別exit契約を反映。
