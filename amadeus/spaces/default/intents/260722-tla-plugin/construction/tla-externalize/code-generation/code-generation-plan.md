# Code Generation Plan — U1 tla-externalize

対象: Unit U1、FR-3.1、FR-3.2、FR-6、NFR-3。Test StrategyはComprehensive。

## 実装手順

- [x] **Step 1: 外部TLA資産を作成する** — `scripts/formal-verif/tla-arm.ts`の埋め込みmodel/cfgを、escape解決後のbytesを維持したまま`specs/tla/FormalElection.tla`と`specs/tla/FormalElection.cfg`へ移す。対応: U1完了条件、FR-3.1、BR-U1-1、BR-U1-2。
- [x] **Step 2: 安全なasset loaderとmodel-map parserを実装する** — production wrapperの`scripts/formal-verif/tla-model-loader.ts`、internal/test-only pipelineの`tla-model-loader-internal.ts`、canonical parserの`tla-model-map.ts`を追加し、`import.meta.url`基準のrepository root、固定asset path、realpath包含、regular-file、symlink拒否、canonical map schema、判別可能な`ModelLoadError`を実装する。pipelineの戻り値だけをResultとする。対応: FR-3.1、NFR-3、NFR Design。
- [x] **Step 3: model-mapを初期化する** — `specs/tla/model-map.json`へmodel/cfg identityと実在する`packages/framework/core/tools/amadeus-election*.ts`のcanonical path・SHA-256を記録し、path昇順の単一ソースにする。対応: FR-3.2、U5入力契約。
- [x] **Step 4: tla-armを外部loaderへ接続する** — adapterがpipeline Resultを内部で網羅分岐し、成功時は`VerifiedTlaSource`だけを既存generator/receiptへ渡し、失敗時はerrorだけをHARNESS_ERRORへ写像する。`MODEL_SOURCE`/`CFG_SOURCE`を削除し、既存公開関数シグネチャを維持する。対応: FR-3.1、FR-3.4、BR-U1-2、BR-U1-3。
- [x] **Step 5: unit testを追加する** — `tests/unit/t-formal-verif-tla-model.test.ts`または専用loader testへ、正常load、各missing/empty/unreadable/map-invalid code、path traversal、symlink、identity、Result分岐の10–15ケースを追加する。対応: Comprehensive、FR-6.4、NFR-3。
- [x] **Step 6: integration/E2E testを追加する** — 実filesystemで外部bytesと移行前identityの同値、model-map hash、既存`generateFrozenTlaModel`/receipt互換、D4代表mutation検出、fallback不存在を検証する。既存formal-verif E2Eも実行する。対応: FR-3.2、FR-6.2/6.4。
- [x] **Step 7: 性能受入と品質検証を行う** — 実装直前commitを`BASELINE_SHA`として別一時worktree/buildで10回比較し、median≤110%、max≤120%、各load<250msを記録する。現行treeに旧実装を残さない。`bun run typecheck`、`bun run lint`、関連unit/integration/E2Eを実行する。対応: Performance Design、FR-6。
- [x] **Step 8: 記録を完成させる** — 実装済みcheckboxを更新し、変更file、test結果、性能結果、逸脱を`code-summary.md`へ記録する。対応: Code Generation stage。

## Review Iteration 1 是正

- [x] **FR-6.2:** canonical mirrorを正規生成経路で同期し、`dist:check`、`promote:self:check`、`tests/run-tests.sh --ci`をgreenにした。
- [x] **FR-6.3:** U1明示diffとlocal LCOVを交差し、measured 341行、uncovered 0、allowlisted 0を確認した。
- [x] **Owner境界:** implementation entryを`packages/framework/core/tools/amadeus-election*.ts`へ設計・schema・実装で統一した。
- [x] **性能再現性:** commit禁止下のimplementation tree identity、diff SHA-256、path/bytes manifest、raw 10標本を保存した。
- [x] **共有schema:** U1の実装どおり`{schemaVersion, model, cfg, entries}`をcanonical型とし、U5が再定義せずimportする契約へ修正した。
- [x] **Production API:** runtime exportを引数なし`loadVerifiedTlaSource()`だけにし、module URL/filesystem注入をinternal/test-only moduleへ隔離した。

## 非対象

- run-model-check CLI、plugin graph walk、CI workflow、completeness sensor本体は後続Unitで実装する。
- database、API、UI、deployment artifact、新規runtime dependency、test configuration追加は不要。既存`bun:test`設定を利用する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T23:40:29Z
- **Iteration:** 1
- **Scope decision:** approved — BR-U1-3 — scripts/formal-verif/tla-model-loader.ts — reason: BR-U1-3 の fail-closed 読込境界と Result 戻り値の保守性を実装コードで検証するため — owner: amadeus/spaces/default/intents/260722-tla-plugin/construction/tla-externalize/functional-design/business-rules.md#- BR-U1-3(fail-closed 読込): `scripts/formal-verif/tla-model-loader.ts` はモデル/cfg の不在・空・読取不能を Result エラーとして返し、呼び出し元で loud fail。無言の既定値・スキップを持たない

loader 本体の fail-closed 実装は明快だが、上流設計との境界不一致、必須品質ゲート、coverage、再現可能な性能証跡、下流 U5 が消費する schema に未解決事項がある。

### Findings

- FR-6.2 の dist:check、promote:self:check、tests/run-tests.sh --ci を含む全ゲートが green ではない。
- FR-6.3 の新規行 local lcov 未カバー 0 の証拠がない。
- 設計の implementation entry 所有パスと実装の packages/framework/core/tools が不一致。
- 性能比較に implementation の不変識別子と raw samples がなく再現不能。
- 設計上の ModelMap schema と実装の schema が不一致。
- production module が任意 moduleUrl と TlaFileSystem を受ける test seam を export している。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T00:10:11Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の6件はすべて閉包された。信頼境界、production API、canonical schema、品質ゲート、coverage、性能再現性が相互に整合し、conductor 独立検証も green を確認した。

### Findings

- Minor: raw performance artifacts は summary から参照されるが宣言済み produces は plan と summary のみ。後続レビューの authoritative scope を強化するなら raw samples を summary に包含するか optional produce として宣言する。
