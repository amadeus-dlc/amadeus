# Code Generation Plan — U3-mirror-config

## 計画の前提

- 対象 Unit は `U3-mirror-config`、対応要件は `FR-4`。ユーザーストーリー工程はスコープ上 SKIP のため、各 Step を `U3`、`FR-4`、`BR-U3-1`〜`BR-U3-5` と U3 の機能／NFR 設計へ直接 trace する。
- 正本は新規 `packages/framework/core/tools/amadeus-mirror-config.ts` とし、既存 `amadeus-settings.ts` は変更・移行しない。`unknownKeyError` / `typeMismatchError` の既習文言・全件収集方針は再利用するが、既存 settings の「全 mode off は invalid」を U3 へ持ち込まない。
- 最新 NFR 設計の責務境界に従い、公開 `resolve(projectDir, space, intentDir, reader?)` は解決済み `space` / `intentDir` を受け取る。active cursor の探索は呼出側の責務とし、U3 の性能上限は設定JSON 3面の各1 read、合計3 read以下とする。
- Test Strategy は **Comprehensive**。pure parse / merge の unit、実FSと reader adapter の integration、core→6 harness 配布を E2E 相当として揃える。主要部品ごとに既存類似テストを含む10〜15ケースを目安とする。
- DB、HTTP API、UI、IaC、外部サービス、書込APIは本 Unit に存在しないため対象外。追加依存・新しいtest runner・新しい設定形式は導入しない。

## 変更ファイル候補

| 区分 | ファイル | 予定変更 |
|---|---|---|
| 正本 | `packages/framework/core/tools/amadeus-mirror-config.ts` | schema定数、型、path導出、pure `parse` / `mergeLayers`、`ConfigReader` port、`readLayer`、read-only `resolve` |
| 既存参照 | `packages/framework/core/tools/amadeus-settings.ts` | 原則変更なし。既存 `unknownKeyError` / `typeMismatchError` をimportして文言正本を再利用 |
| Unit test | `tests/unit/t257-amadeus-mirror-config.test.ts` | pure parse / merge、3層8組合せ、invalid全件列挙、default off、root型拒否 |
| Integration test | `tests/integration/t257-amadeus-mirror-config.integration.test.ts` | 実FS 3面、path写像、ENOENT、dangling symlink、directory、reader回数、read-only |
| テスト設定 | `package.json`、`tests/run-tests.ts`、`tsconfig.json`、`tsconfig.tests.json`、`biome.json` | 原則変更なし。既存 Bun / TypeScript / Biome / lcov で新規テストと正本が収集されることを確認し、不足時だけ最小変更 |
| 配布生成物 | `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/tools/amadeus-mirror-config.ts` および自己導入面 | core正本から生成。手編集禁止 |

> テスト番号 `t257` は実装開始時に最新の `tests/` を再走査し、共有作業で既に使用済みなら次の未使用番号へ両層まとめて変更する。

## 実装計画

- [x] **Step 1: 実装前 baseline と契約面を固定する**  
  `amadeus-settings.ts`、t223 unit / integration、package manifest の `coreDirs tools`、test runner、現時点の未使用テスト番号を再確認する。U3 を既存 settings へ混在させず、3つのgit共有JSONだけを読む独立moduleであることを変更面として固定する。  
  **検証:** U3追加前の `bun test tests/unit/t223-settings-skeleton.test.ts tests/integration/t223-settings-load.test.ts` が green、依存manifest差分なし。  
  **Trace:** U3、FR-4、BR-U3-4、BR-U3-5、TS-U3-1、TS-U3-2。

- [x] **Step 2: schema定数・domain型・path写像を定義する**  
  `MIRROR_CONFIG_KNOWN_KEYS = ["auto-mirror"]`、default `{ autoMirror: false }`、`ConfigLayer`、`MirrorConfig`、`ConfigParseResult`、`ResolveOutcome`、`ConfigReader` を正本moduleへ定義する。pathは global=`amadeus/config.json`、space=`amadeus/spaces/<space>/config.json`、intent=`amadeus/spaces/<space>/intents/<intentDir>/config.json` の固定3面とし、マシンローカル層・provenance記録・書込APIを作らない。  
  **検証:** path unit test、合法キー/default定数test、公開型のtypecheck。  
  **Trace:** U3、FR-4、BR-U3-3〜BR-U3-5、Domain Entities、SD-U3-1、SCD-U3-1/2。

- [x] **Step 3: pure parse の落ちるテストを先に作る**  
  I/Oを使わず、文字列と `ConfigLayer` だけを渡すparse testを追加する。合法 `{}` / true / false、構文破損、未知キー、`auto-mirror` のstring / number / null、複数違反全件列挙を、未実装または欠陥注入時に赤になるassertionとして固定する。  
  **検証:** 未実装状態の対象test失敗を記録し、各assertionが実行時のparse消費行を直接駆動する。  
  **Trace:** U3、FR-4、BR-U3-1、BR-U3-5、SD-U3-1/2。

- [x] **Step 4: pure parse をfail-closedで実装する**  
  組込 `JSON.parse` だけを使い、合法rootを「非null・非配列のobject」に限定する。空配列、非空配列、null、string、number、boolean rootをすべてinvalidとする。object rootでは未知キーと型不整合を同一面内で走査し、最初の1件で止めず全件を順序決定的に返す。falseは正常値として保持し、全off拒否規則を追加しない。  
  **検証:** parse unit全件green。入力違反時にthrowせず `{ kind: "invalid", source, errors }` を返し、合法 `{ "auto-mirror": false }` をparsedとして受理。  
  **Trace:** U3、FR-4、BR-U3-1、BR-U3-5、Domain Entities、SD-U3-1/2、TS-U3-1。

- [x] **Step 5: pure mergeLayers の8組合せテストを先に作る**  
  global / space / intent のpresent・absent全8組合せを表形式で生成する。各ケースは最優先のpresent層だけをtrue、他のpresent層をfalseにし、default(false)や下位層との同値で優先順位欠陥が隠れないfixtureとする。全不在、global-only、space-only、intent-only、各2層、全3層を網羅する。invalid 1面、複数invalid層、1面内複数errorの全件列挙も落ちるテストとして追加する。  
  **検証:** 優先順を逆転・invalidを無視したmutant相当で対象testが赤になることを確認。  
  **Trace:** U3、FR-4、BR-U3-2/3、Domain Entities、RD-U3-2/3、SCD-U3-1。

- [x] **Step 6: pure mergeLayers と原子的ResolveOutcomeを実装する**  
  3つの `ConfigParseResult` を必ず全面評価し、invalidが1面でもあれば層名付きerrorsを全件返す。invalidがない場合だけ global→space→intent の後勝ちでpartialをmergeし、欠落キーを単一defaultから補う。provenanceやテスト専用fieldは返さない。  
  **検証:** 8組合せ、invalid混在、複数invalid、全不在default offがgreen。  
  **Trace:** U3、FR-4、BR-U3-2/3/5、Domain Entities、RD-U3-2/3。

- [x] **Step 7: ConfigReader adapter とreadLayerの障害分類を実装・単体検証する**  
  default readerは `readFileSync(path, "utf-8")` の薄いadapterとし、テストではreaderを注入する。不在はENOENTおよびdangling symlinkが返す同等のnot-found errorだけをabsentへ分類する。EISDIR / directory誤指定、ENOTDIR、EACCES、その他I/O失敗は層名・path付きinvalidとし、OS差でsilent absentへ丸めない。cache、retry、directory scan、再帰探索を入れない。  
  **検証:** fake readerで各pathが1回だけ読まれ、ENOENT=absent、その他error=invalid。追加依存0。  
  **Trace:** U3、FR-4、BR-U3-2/4、PD-U3-1/2、RD-U3-1、RL-U3-3。

- [x] **Step 8: read-only resolve を実装する**  
  解決済み `space` / `intentDir` から固定3pathを導出し、global / space / intentを各1回readLayerへ渡した後、pure mergeへ委譲する。全層を評価してから結果を返し、1面invalidでも部分値を利用側へ漏らさない。ファイル生成・修正・cursor読取・外部I/Oを行わない。  
  **検証:** fake readerで合計3 read、各path1回、順序global→space→intent、2回resolve時は再度3 readでcacheなし。  
  **Trace:** U3、FR-4、BR-U3-2〜BR-U3-4、Business Logic Model、PD-U3-1/2、RD-U3-2。

- [x] **Step 9: 実FS integrationをComprehensiveに完成させる**  
  一時projectに3面fixtureを作り、全不在default off、各単独面、全3面のintent優先、space優先、invalidをglobal / space / intent各面へ置いた場合の全体invalidを検証する。ENOENT、dangling symlink、設定pathがdirectory、親pathがfileとなるENOTDIRを注入し、前二者だけabsent、後二者はloud invalidとする。解決前後の全fixture bytesとdirectory listingを比較してread-onlyを証明する。  
  **検証:** integration全件green。platform依存のEISDIR文言そのものではなく、outcome分類をassertする。  
  **Trace:** U3、FR-4、BR-U3-2〜BR-U3-4、RD-U3-1/2、RL-U3-1〜RL-U3-3。

- [x] **Step 10: Comprehensive のE2E相当と配布面を検証する**  
  core正本から6 harnessへ生成し、各 `tools/amadeus-mirror-config.ts` の存在とcoreとのbyte一致を確認する。U3はstandalone CLIを持たないため、E2E相当は実FS resolve integrationと配布後module import/typecheckを組み合わせ、U4が利用する公開契約を固定する。既存 `amadeus-settings.ts`、settings.json、package dependenciesが不変であることも差分監査する。  
  **検証:** `bun run dist` / `bun run promote:self` 後、`bun run dist:check` / `bun run promote:self:check` green、6面投影確認。  
  **Trace:** U3、FR-4、BR-U3-4/5、TS-U3-1/2、N-3。

- [x] **Step 11: test設定とlcovを検証する**  
  既存 `tests/run-tests.ts` のBun coverage、`package.json` の `coverage:ci`、TypeScript / Biome対象が新規moduleとt257を収集することを確認する。spawnではなくin-process parse / merge / resolve seamでlcovを運び、parse、root型拒否、全件列挙、invalid原子拒否、8組合せ、I/O分類の新規実行行に0-hitがないことを確認する。設定変更は不足が実測された場合だけ行う。  
  **検証:** `bun tests/run-tests.ts --ci --coverage --coverage-dir coverage`、`coverage/lcov.info` の `SF:packages/framework/core/tools/amadeus-mirror-config.ts` とDA/BRDA、追加行未カバー0。  
  **Trace:** U3、FR-4、BR-U3-1〜BR-U3-5、N-2。

- [x] **Step 12: 全品質ゲートと差分監査を実行する**  
  U3対象test、typecheck、lint、全CI、配布checkを実行する。`package.json` / lockfileに依存追加なし、既存settings移行なし、マシンローカル層なし、書込APIなし、cache/retryなし、default off単一定義、invalid全件列挙をgrepとdiffで再確認する。  
  **検証:** `bun run typecheck`、対象Biome、`bun run lint:check`、unit / integration、`bun tests/run-tests.ts --ci`、`bun run dist:check`、`bun run promote:self:check` がgreen。  
  **Trace:** U3、FR-4、BR-U3-1〜BR-U3-5、PD-U3-1/2、SD-U3-1/2、RD-U3-1〜RD-U3-3、N-2〜N-4。

## Comprehensiveテスト配分

| 層 | 主対象 | 必須ケース |
|---|---|---|
| Unit | schema / parse / mergeLayers | `{}`、true/false、構文破損、未知キー、型違反全種、複数違反全列挙、空/非空配列、null、string/number/boolean root、3層8組合せ、invalid混在、default off |
| Integration | path / ConfigReader / readLayer / resolve | 実FS 3面、各path1 read、cacheなし、ENOENT、dangling symlink、directory、ENOTDIR、各層invalid、全面評価、read-only bytes |
| E2E相当 | 実FS公開契約 + 配布 | core module import、6 harness投影、coreとのbyte一致、dist/self-install check、追加依存0 |

## 完了条件

- `amadeus-mirror-config.ts` が唯一の実装正本で、合法キーは `auto-mirror` booleanのみ。
- intent > space > globalの優先順位が盲点のない8組合せで固定され、全不在・欠落キーは `{ autoMirror: false }`。
- JSON構文、未知キー、型不整合、配列/null/primitive rootをfail-closedで拒否し、全errorsを層名付きで列挙する。
- ENOENT / dangling symlinkだけをabsentとし、directory / ENOTDIR / その他I/O異常をloud invalidとする。
- resolveはread-only、3 read以下、cacheなし、追加依存0。
- unit / integration / E2E相当、lcov、typecheck、lint、全CI、dist/check、promote/self/checkがgreen。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:01:12Z
- **Iteration:** 1
- **Scope decision:** approved — U3-CG-SPOT-001 — packages/framework/core/tools/amadeus-mirror-config.ts — reason: Verify the public resolve boundary, fail-closed parsing, complete invalid aggregation, I/O classification, fixed three reads, and maintainable module structure. — owner: amadeus/spaces/default/intents/260719-mirror-productization/construction/U3-mirror-config/functional-design/business-logic-model.md#Integration spot-check owner: U3-CG-SPOT-001 — `packages/framework/core/tools/amadeus-mirror-config.ts`

resolve契約を統一し、限定spot-checkでfail-closed解析、invalid集約、I/O分類、固定3 read、責務分離を確認した。

### Findings

- RESOLVED CG-U3-I1-001: resolve公開契約を必須space/intentDirへ統一。
- RESOLVED CG-U3-I1-002: 実装のfail-closed性と保守性を確認。
