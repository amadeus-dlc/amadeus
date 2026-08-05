# Amadeus コード構造

## TLA+ authoring 関連の配置（260804-tla-authoring、現在、observed `7172aea8d`）

| 配置 | 実測した役割 | 所見 |
| --- | --- | --- |
| `packages/framework/core/` | 32 stage、14 persona、105 tool、13 hook、8 sensorの正本 | authoring ownerを持つstageは0件 |
| `plugins/formal-model-check/` | opt-in stage 1件、tool 27ファイル、TLC実行系 | stageは登録済みモデルの実行専用 |
| `specs/tla/` | 2モデル、CFG、補助module、falsification/vacuity variants、model-map v2 | 新規未知題材の登録は未自動化 |
| `docs/reference/22-formal-model-supply.md` | 新規モデル供給の手順 | 文書でありstage graphのactor/trigger/完了条件ではない |
| `scripts/package.ts` / `scripts/plugin-projection.ts` | canonical複製、8 package face、5 self-install face | manifestのimport closureを検査しない |
| `tests/` | unit 354 / integration 443 / e2e 97 / smoke 16 / perf 10 TS files | canonical directとcomposed runtimeの差を覆うE2Eがない |

`plugins/formal-model-check/plugin.json:11-36` のclosed tools一覧には、実行時importされる次の2件がない。

- `tools/tla-model-receipt.ts`: `run-model-check-source.ts:13-16`、`fs-tlc-toolchain.ts`、`tlc-toolchain.ts`が依存。PR #2176で追加。
- `tools/tla-module-deps.ts`: `tla-model-loader-internal.ts:14-18`が依存。canonical copyは`packages/framework/core/tools/`にあり、`scripts/package.ts:773-782`でplugin sourceへ生成されるがmanifest未登録。

したがって「source treeに存在すること」と「composed harnessへ所有・配布されること」は別契約である。既存projection testはmanifest自体を正として18 passとなるため、未列挙のimport先を検出しない。

## 観測メタデータ

- 観測日: 2026-08-04
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- 実測規模: framework/setup/scriptsのTypeScript 334ファイル、テスト916ファイル（unit 354、integration 438、e2e 96）。数値はlive filesystemの`find`結果。

## トップレベル構成

| パス | 分類 | 責務 |
|---|---|---|
| `packages/framework/core/` | domain/service/config | ハーネス中立のtools、stages、knowledge、rules、sensors、OTel、skills |
| `packages/framework/harness/` | adapter/config | 8ハーネス固有のmanifest、hook、agent、skill、settings |
| `packages/setup/` | application/domain/adapter | Release Asset取得、plan、transactional install/upgrade、Kimi hook merge |
| `scripts/` | build/tooling | manifest検証、dist生成、self promotion、distribution/source-only検査 |
| `tests/` | test/harness | smoke、unit、integration、e2e、perf、formal verification、live drivers |
| `docs/` | documentation | guide、reference、harness engineering runbook |
| `amadeus/spaces/` | persisted data | Intent、memory、codekb、audit、election、成果物 |

## Framework core の分類

- Controller/Handler: `packages/framework/core/tools/amadeus-orchestrate.ts`、`amadeus-utility.ts`、`amadeus-state.ts` 等のCLI dispatch。
- Domain/Model: `amadeus-election-model.ts`、mirror reducer/gateway、graph/schema、audit/event registry。
- Service/Use case: workflow completion、swarm、reviewer runtime、mirror runner、plugin、sensor invocation。
- Adapter: `packages/framework/harness/<name>/hooks/` と各manifest。
- Configuration/data: `packages/framework/core/amadeus-common/stages/`、`scopes/`、`sensors/`、`memory/`。

## Live E2E の配置

共通kernelは `tests/harness/live-e2e/` に閉じている。portは `adapter.ts`、policyは `policy.ts`、orchestrationは `lifecycle.ts`、型付き結果は `contract.ts`、resourceは `resources.ts`、registry/matrixは `registry.ts` と `projector.ts`、deterministic contract test支援は `testing/` にある。

Phase 2で再利用するlegacy driverは別階層にある。

- Kimi: `tests/harness/kimi-print-drive.ts`、`tests/e2e/t-print-kimi-{status,doctor}.serial.test.ts`。
- Kiro ACP: `tests/harness/kiro-acp-drive.ts`、`tests/e2e/t-acp-kiro-*.serial.test.ts`。
- Kiro TUI: `tests/harness/tui-drive.ts`、`tests/harness/tui-client.ts`、`tests/e2e/t-tui-kiro-*.serial.test.ts`。
- 対象外Kiro IDE: `tests/harness/kiro-ide-driver.ts`、`tests/e2e/t-ide-kiro-checkpoint.serial.test.ts`。

## 配布とインストールの配置

`packages/framework/harness/kimi/manifest.ts` は `.kimi-code`、Kimi hook snippet、adapter/libを宣言する。`packages/framework/harness/kiro/manifest.ts` は `.kiro`、steering rename、agent JSON、hook runtime、`settings/cli.json` を宣言する。`scripts/package.ts` はmanifestを自動発見し、`dist/kimi` と `dist/kiro` を生成する。

`packages/setup/src/domain/harness.ts` は8ハーネスを閉じた集合として扱い、`engine-layout.ts` はKimiを`.kimi-code`、Kiro/Kiro IDEを`.kiro`へ写像する。Kimiだけは `packages/setup/src/modules/kimi-hooks.ts` を介してuser-level configへmanaged blockをmergeする。`scripts/promote-self.ts` はKimiをself-installするが、Kiro/Kiro IDEは配布対象であってproject-local self promotion対象ではない。

## 変更時の主な依存方向

正本変更は `core/harness manifest → package.ts → dist` の一方向である。setup変更は `packages/setup/src/domain → modules → cli` の方向を守る。live E2Eでは `adapter implementation → live-e2e ports/policy/lifecycle` とし、共通kernelが個別driverをimportする逆依存は避ける。
