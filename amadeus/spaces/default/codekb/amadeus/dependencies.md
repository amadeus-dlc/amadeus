# Amadeus 依存関係

## TLA+ authoringの依存断面（260804-tla-authoring、現在、observed `7172aea8d`）

### 現行依存

```text
orchestrator
  -> plugin activation / advisory choice
  -> explicit formal-model-check handoff

formal-model-check stage
  -> model-map / source loader
  -> module dependency resolver
  -> verified receipt
  -> TLC planner / toolchain
  -> artifact publisher
```

### 未配線依存

- requirements / functional design artifacts → applicability判定。
- applicability → author / revise / `--impl-only` / non-targetの排他的分岐。
- trace + proof + independent review + human approval → atomic model registration。
- registration →既存executorの対象選択と現在要求に相関したverdict receipt。

### 配布依存の欠落

plugin sourceは `plugin.json` のclosed `tools` 宣言からbundle → composition `ownedPaths` → harness runtimeへ到達する。`run-model-check-source.ts`等が `tla-model-receipt.ts`を、loaderが`tla-module-deps.ts`をimportする一方、両ファイルはmanifest未登録である。このためcanonical dependency graphは閉じていても、composed graphは閉じない。package/projection testsはmanifest準拠を検査するだけでimport closureを検査しない。

外部依存はTLC jar、OpenJDK/Docker、GitHub release取得に限定され、#2161でdatabaseやservice追加は不要である。

## 観測メタデータ

- 観測日: 2026-08-04
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- 依存根拠: root/package manifests、import配置、harness manifests、live filesystem。

## パッケージ間依存

```text
packages/framework/core
  ├─> packages/framework/harness/*（packagerが投影時に合成）
  ├─> scripts/package.ts（正本入力）
  └─> tests/*（直接import/配布物検証）

packages/setup/src/domain
  └─> packages/setup/src/modules
       └─> packages/setup/src/cli.ts

scripts/manifest-types.ts
  └─> packages/framework/harness/*/manifest.ts
       └─> scripts/package.ts
            └─> dist/*（生成物）
```

coreは特定ハーネスをimportせず、harness manifestとpackagerが外側から合成する。setupはframework sourceを直接実行せず、Release Asset payloadを計画・適用する。

## Live E2E 内部依存

`adapter.ts` と `contract.ts` が最内側のport/modelである。`policy.ts`、`resources.ts`、`ledger.ts` がそれに依存し、`lifecycle.ts` が全てを統合する。`registry.ts` はcapability正本、`projector.ts`/`project-matrix.ts` はregistryとledgerの派生viewである。各実adapterはこの内側へ依存する。

Phase 2の正しい依存方向は次である。

```text
KimiLiveAdapter ─┐
KiroAcpAdapter ──┼─> LiveAdapter ports → policy/lifecycle → ledger/matrix
KiroTuiAdapter ──┘
```

common kernelから`kimi-print-drive.ts`や`kiro-acp-drive.ts`を直接importする設計は、個別技術を中立層へ逆流させるため避ける。adapter側が既存driver primitiveを包むか、必要なprimitiveをadapter内へ移す。

## Kimi依存

- Distribution: `packages/framework/harness/kimi/manifest.ts` → core dirs + Kimi skill/hooks → `scripts/package.ts` → `dist/kimi`。
- Install: setup harness selection → payload apply → `packages/setup/src/modules/kimi-hooks.ts` → user `KIMI_CODE_HOME/config.toml` managed block。
- Live: `t-print-kimi-*.serial.test.ts` → `kimi-print-drive.ts` → `dist/kimi` + real `kimi` + source credential directoriesへのsymlink。
- Phase 2追加依存: common credential/resource/policy/lifecycle。source credential bytesのcopy依存は導入しない。

## Kiro CLI依存

- Distribution: `packages/framework/harness/kiro/manifest.ts` → core + Kiro agents/settings/hooks → `dist/kiro`。
- ACP live: tests → `kiro-acp-drive.ts` → `kiro-cli acp` → JSON-RPC/session/tool stream → on-disk state/audit。
- TUI live: tests → `tui-client.ts` → `tui-drive.ts` → tmux private server → `kiro-cli chat` → painted pane/on-disk state。
- Authentication: legacy testsは`kiro-cli whoami`でambient loginを確認するが、その保存場所・scratchへの安全なbindingは現行adapter contractに定義されていない。

## 外部依存と境界

GitHub Release/npm/GitHub APIはsetup/release/mirrorで利用する。モデルproviderはCodex/OpenAI、Claude/Anthropic、Kimi、Kiroがそれぞれ所有し、live testだけが明示opt-inで外部課金境界を越える。通常のCIは外部modelを呼ばない。

## 依存リスク

- Kimi driverの`env: {...process.env,...}`とKiro ACP/TUIのambient継承は、common env allowlistを迂回する。
- Kimi credential symlinkはsource pathへのruntime依存を持つため、resource registrationとleak scanなしではcleanup完了を証明できない。
- Kiro ACP/TUIは同一CLI/authを共有するが終了条件と観測面が異なる。単一transportへ無理に統一するとdriver複雑性が増す。
- `dist/`は生成物なので、source変更後にbuild/source-only/distribution checksを通す必要がある。
