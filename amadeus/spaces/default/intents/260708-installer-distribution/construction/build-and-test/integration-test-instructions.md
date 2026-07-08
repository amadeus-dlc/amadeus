# Integration Test Instructions — installer-distribution

> ステージ: build-and-test (3.6) / 戦略: Standard(主要境界+ユニット間相互作用)
> 出典: 各 Unit の `../*/code-generation/code-summary.md`、infrastructure-design の各 cicd-pipeline.md(フィクスチャ契約)

## 実行方法

- `bun test tests/integration/setup-*.test.ts`(--ci プロファイルに包含)
- E2E 層: `bash tests/run-tests.sh --release`(e2e ティア追加。実ネットワークは `AMADEUS_SETUP_E2E_NETWORK=1` 設定時のみ、未設定は skip)

## 境界インベントリ

- resolve→fetch→manifest(U1 基盤直列): `setup-resolve-fetch-manifest.test.ts`
- install 全経路(resolve→plan→apply→verify→manifest 書込+BR-I16 到達順序の実失敗検証): `setup-install-flow.test.ts`
- upgrade 全経路(6経路+成功): `setup-upgrade-flow.test.ts`
- pack 契約(FR-018、実 npm pack 3回・完全一致+files ドリフト): `setup-pack-contract.test.ts` / `setup-files-drift.test.ts`
- E2E(実ビルドバイナリの子プロセス起動・codeload 形状フィクスチャ・NFR-001 計測): `tests/e2e/setup-install.test.ts` / `setup-upgrade.test.ts`、CI スモーク: `tests/smoke/setup-cli-smoke.test.ts`

## フィクスチャ規約

tar.gz フィクスチャは必ず単一トップレベルラッパー(codeload 形状)— フラット生成は禁止(false green 防止契約、`tests/lib/setup-codeload-fixture.ts`)
