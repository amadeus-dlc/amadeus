# Developer Code Scan Results — no-silent-drop

## スキャン境界と鮮度

- リポジトリ: `amadeus`
- observed revision: `d72f60b5a81fc6e45f99431d61b6561e91b2fc37`
- incremental base: `861688c31fd08cc0068318d71b0d5c5a87153b57`（observed まで54 commits）
- 本番 census 対象: `packages/framework/core/`、`packages/framework/harness/`、`scripts/` の手書き TypeScript/JavaScript 正本（338ファイル、約4.7 MiB）
- 除外: `dist/`、ルートの生成済みハーネス投影、`tests/` と fixture。`tests/` はゲート実装・検証方式の調査対象にだけ含めた。
- [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の merge commit `deb7b91f3b09eb9c67bfcf7879a72efd63fc6873` は observed revision の祖先である。よって [Issue #1963](https://github.com/amadeus-dlc/amadeus/issues/1963) は再実装対象ではなく回帰検証対象である。

### Packages Found

- `packages/framework/core/` — 配布対象 — TypeScript — CLI、hook、state/audit、Mirror、OTel のハーネス中立実装
- `packages/framework/harness/` — 配布対象 — TypeScript/Markdown/JSON — Codex、Claude、Cursor、Kimi、Kiro、OpenCode 固有の adapter・manifest・emit
- `scripts/` — 開発基盤 — TypeScript — package、promotion、distribution、metrics
- `tests/` — 開発専用 — Bun test/TypeScript — guard、ratchet、fixture、integration/performance（本番 census 外）

### Build System

- **Type**: Bun-only TypeScript monorepo。CI は Bun `1.3.13` を固定する（`.github/workflows/ci.yml:103-109`）。
- **Config Files**: `package.json`、`bun.lock`、`tsconfig.json`、`tsconfig.tests.json`、`biome.json`
- **Build Dependencies**: TypeScript `^6.0.3`、Biome `2.5.5`、Bun types `^1.3.13`（`package.json:33-42`）。observed revision の `package.json` / `bun.lock` に `@ast-grep/cli` は存在しない。
- **標準検証**: `bun run typecheck`、`bun run lint`、`bun run test:ci`、`bun run dist:check`、`bun run promote:self:check`（`package.json:9-24`）。

### APIs Discovered

- 外部 HTTP API はない。短命 CLI と内部 TypeScript API が主境界である。
- `setCheckbox(content, slug, state): string` と `setStageSuffix(...): string` は正規表現不一致時に入力をそのまま返す（`packages/framework/core/tools/amadeus-lib.ts:5399-5429`）。成功・不成立を型で区別しないことが [Issue #1874](https://github.com/amadeus-dlc/amadeus/issues/1874) の設計起点である。
- Mirror の `applyTransition(...): StateResult` は `ok | failed` を返す（`packages/framework/core/tools/amadeus-mirror-executor.ts:53-55,77-129`）。
- compose resync は `StateResyncStatus` に `section-unrecognized` を持つ（`packages/framework/core/tools/amadeus-lib.ts:5575-5588`）。

### Frameworks & Libraries

- Bun test — unit/integration/e2e 実行
- TypeScript compiler API — 既存 AST corpus の call-expression 分類に利用（`tests/lib/guard-corpus-ast.ts:7-50`）
- Biome — lint/format
- ast-grep —未導入。調査では `@ast-grep/cli@0.45.0` を一時実行し、`ast-grep 0.45.0` と AST pattern の成立を確認した。実装時は exact version を devDependency と lockfile に固定する必要がある。

### Test Coverage

- **Test Directories**: `tests/unit/`、`tests/integration/`、`tests/e2e/`、`tests/perf/`、`tests/helpers/`
- **Test Frameworks**: `bun:test`
- **Coverage Config**: coverage registry、project baseline、patch allowlist が存在する。
- 既存 guard の pure core / CLI 分離例は `tests/unit/t367-callsite-guard.test.ts` と `tests/integration/t367-callsite-guard-cli.test.ts`。fixture は注入 seam と一時ディレクトリを使い、コミット済み baseline を書き換えない（後者 `:28-36,62-106`）。

### Code Quality Indicators

- **Linting**: `.github/workflows/ci.yml:111-143` の lint job は Biome → callsite guard → deletion gate → complexity gate の順で blocking 実行する。no-silent-drop の自然な接続点は同 job の callsite guard 近傍である。
- **既存 ratchet**: `tests/callsite-guard.ts:13-25,165-205` は file/symbol count の shrink-only 判定、`:246-265,295-356` は baseline parse と型付き風診断を提供する。
- **厳格な baseline parse**: `tests/complexity-gate.ts:172-224,295-350` は schema、重複 key、tool failure、missing/malformed baseline を fail-closed にするため、no-silent-drop のより適切な雛形である。
- **CI/CD**: checkout は `actions/checkout@v4` の既定 shallow checkout（`.github/workflows/ci.yml:100-101`）。PR base の baseline と比較する場合は base SHA を取得できる checkout/入力が別途必要である。
- **配布**: `scripts/package.ts:87-97` は manifest から harness を発見し、`:921-945` の `--check` が core/harness 正本と生成物の drift を拒否する。`scripts/promote-self.ts:53-60` が dist を自己ホスト投影へ同期する。

## 対象欠陥と依存境界

### #1878 — `persistBlocked` の戻り値破棄

- `persistBlocked` は `applyTransition(...)` を式文として呼び、`StateResult` を検査せず常に元の `safety-blocked` warning を返す（`packages/framework/core/tools/amadeus-mirror-executor.ts:171-201`）。state 書込失敗時にも「記録済み」に見える現存欠陥である。
- 同ファイルには正しい対照がある。`persistGatewayFailure` は `failed` を `stateFailure` へ変換する（`:230-250`）、`complete` の補償記録も失敗時に「記録不能」を返す（`:531-560`）。最小修正はこの既存契約へ揃えることで、新抽象は不要である。
- `persistBlocked` は authorization、create reconciliation、ownership verification、linked mutation 等から呼ばれる（`:354-368,807-815,848-855,879-888,903-918,1210-1218`）。戻り値契約変更の影響はこれら全経路に及ぶ。
- `tests/unit/t279-amadeus-mirror-executor.test.ts` に state-write failure の注入基盤はあるが、現行ケースは marker search や completion 等を対象にし、`persistBlocked` 自身の書込失敗を固定していない（`:486-512,1007-1084`）。

### #1874 — checkbox/suffix の無言 no-op

- 安全な callsite は既に存在する。gate/revise/skip/approve は `validateSlugInState`（行不在で error）を先行させる（`amadeus-state.ts:2597-2610,2645,3276,4177,4210`）。worktree merge も main の map に存在する行だけ更新する（`:5216-5228`）。recompose は `firstFlipRejection` が行不在を loud に拒否する（`amadeus-utility.ts:5280-5308`）。
- 未保証境界は、任意 `slug=state` を受けて成功 JSON を返す checkbox verb（`amadeus-state.ts:1381-1424`）、明示 next slug を行存在検査せず更新できる advance（`:2052-2077,2141-2145`）、redo/target を無条件更新する jump（`amadeus-jump.ts:454-483`）、`updated:true` を返す set-status（`amadeus-utility.ts:5581-5623`）である。
- `setCheckbox` を一律 throw 化すると、存在確認済み・条件付き no-op の既存 callsite まで契約変更する。推奨境界は、(1) helper を `changed | missing` の Result にする、または (2) strict variant を追加せず各未保証 callsite で前後検証する、の比較を Functional Design で行うこと。後方互換 shim は不要である。

### #1963 / #1970 — 回帰点

- resync は置換後の Stage Progress セクションを再 parse し、挿入 slug が不足すれば書込前に `section-unrecognized` を返す（`amadeus-lib.ts:5633-5651`）。
- plugin は失敗 intent を `resyncFailed` に集約し（`amadeus-plugin.ts:805-817`）、stderr と exit 1 に変換する（`:1103-1121`）。
- `tests/integration/t407-resync-noop-detection.test.ts:97-168` はヘッダ欠落、末尾 section、別 section の decoy、happy pathを、`:170-212` は単発・all-harnesses の exit 1 を固定する。本 intent ではこのテストを維持し、同実装を重複させない。

## 3形態の検出候補と実証

1. **empty / log-only catch**: ast-grep で `catch_clause` を抽出し、空 block は bound/unbound の2 pattern、log-only は block の全 statement が許可 logger call で、`throw`/failure return がない場合だけ違反とする。単なる「throw がない catch」は cleanup/fallback を大量誤検出するため採用しない。
2. **戻り値破棄**: `expression_statement` の `call_expression` を ast-grep で抽出し、module+symbol の must-use catalog と TypeScript の return type（boolean、Result/discriminated union）で絞る。`const result = emit...` は対象外、`applyTransition(...);` は対象となる。名前 regex だけでは `void` emitter を誤検出する。
3. **偽成功**: `jsonSuccess`、`updated:true`、`kind/status` の成功 token を候補抽出し、契約ごとの durable-effect witness が同じ実行境界にない場合だけ違反とする。任意の意味的 no-op は静的 AST だけでは証明できないため、#1963 型は t407 の postcondition 回帰テストを併用する。

調査プローブでは、ast-grep `0.45.0` が bound/unbound の空 catch を positive として、非空 catch を negative として区別し、裸の `emitAudit(...);` を式文として検出しつつ代入式を除外した。`return { updated: true }` も成功 token として検出した。cached tool で approved roots 全体の汎用 call-expression scan は実測 `0.15s` で、15秒制約に十分な余裕がある。ただし log-only の全 variant、最終3-rule census、CI cold-start は未確認である。

## Ratchet / fail-closed 実装候補

- Dev-only の driver、rule、baseline、fixture は `tests/` 配下に置き、本番走査 root は承認済み3領域だけに固定する。
- baseline は count だけでなく `rule-id + repo-relative path + 正規化AST fingerprint` と理由を持たせ、新規違反の同数置換を防ぐ。`intentional-drop: <非空理由>` は直後の1 finding node のみに結合し、未使用・複数 finding 消費・空理由を拒否する。
- 現在の checkout 上で baseline を作り直すだけでは coordinated growth を検知できない。CI は PR base の baseline/exemption と head を比較し、entry 集合と件数の増加を `BASELINE_GROWTH` / `EXEMPTION_GROWTH` で拒否する。既存 callsite guard の `--update` 単独方式は本要件には不足する。
- ast-grep に `program` を1ファイル1件返す coverage sentinel rule を同梱し、driver が事前列挙した source inventory と一致させる。これにより0件を正常と誤認せず、`SCAN_EMPTY` と `SCAN_PARTIAL` を区別できる。
- 必須診断: `TOOL_UNAVAILABLE`、`RULE_INVALID`、`BASELINE_MISSING`、`BASELINE_MALFORMED`、`SCAN_EMPTY`、`SCAN_PARTIAL`、`NEW_VIOLATION`、`BASELINE_GROWTH`、`EXEMPTION_INVALID`、`EXEMPTION_GROWTH`、`UNEXPECTED`。すべて非0終了と修復情報を伴わせる。

### Technical Debt Signals

- approved roots には理由コメント付きの catch swallow が多数あり、単純 catch rule の初期 false positive は高い可能性がある。全件分類と5%以下の測定は U2 で未実施であり、現時点で達成済みとはしない。
- `tests/callsite-guard.ts` は file/symbol count 方式のため、同数置換を識別しない。また base branch との baseline growth 比較もない。判定・診断構造は再利用できるが識別方式は強化が必要である。
- fake-success は一般的な意味解析ではなく契約 catalog に依存する。catalog 未登録 API の検出漏れを防ぐには、must-use/success API 追加時の fixture・catalog 同時更新をテストで固定する必要がある。

## 実行した検証と未実行項目

- `git merge-base --is-ancestor` で base と PR #1970 merge commit の包含を確認、差分54 commitsを確認。
- `bunx @ast-grep/cli@0.45.0` の version と stdin positive/negative probe を実行。
- approved roots の汎用 call-expression scan: exit 0、`real 0.15s`（warm/cached、CI cold-startではない）。
- `bun test --timeout 120000 tests/unit/t279-amadeus-mirror-executor.test.ts tests/integration/t407-resync-noop-detection.test.ts`: **41 pass / 0 fail**、1.82s。
- 未実行: 全 test suite、typecheck、Biome、package/promote drift guard、完成版 no-silent-drop fixture、初期 census/偽陽性率、baseline/exemption failure injection、CI cold-start 15秒測定。実装がまだ存在しないためである。
