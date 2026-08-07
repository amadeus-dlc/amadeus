# Integration Test Instructions — Intent 260807-tla-specs-relocation

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

Test Strategy: Comprehensive。結合レベルの検証対象と実績。対象の選定は `code-generation-plan.md` の Step 10/Step 11、実績値と鏡像 guard の扱いは `code-summary.md` の「Test coverage summary」を出典とする。

## 対象と根拠

| 要件 | テスト | 内容 |
|---|---|---|
| FR-6 / BR-13a | `tests/integration/t481-spec-root-resolver.integration.test.ts`(新規) | legacy 配置(legacy-only・新旧両存)で `LegacySpecError` fail-closed(移設手順入り)、loader 経由では `MODEL_MAP_INVALID`、activation advisory が errored space のラベルで発火、鏡像の同一挙動、space 解決(cursor 不在/不正/非 default)、wrapper 3 関数の resolver 経由解決 |
| FR-3 / BR-13b | `tests/integration/t320-activation-spec-hash.integration.test.ts`(更新) | 新パス配下の spec 変更で drift advisory が発火する(watch 基底 = 所有ルート `amadeus/spaces/<space>/specs/`、glob `tla/**`) |
| FR-2 | `tests/integration/t382-activation-real-layout-spec-root.integration.test.ts` / `t403-tla-loader-generalization.integration.test.ts` / `t402-tla-module-deps.integration.test.ts`(更新) | 実レイアウト fixture・loader 一般化・module-deps |
| FR-5 | `tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts`(更新) | MirrorLifecycleAsImplemented の意図的未登録 pin(:106)を新パスで維持 |
| 配布 | `tests/integration/t-package-generated-plugin-sources.integration.test.ts` | plugin 鏡像の byte-identity(BR-11) |
| レビュー追加契約 | t-formal-verif-tla-model-loader(symlink containment)/ t-formal-verif-model-completeness-sensor(legacy typed failure)/ t-formal-verif-node-ci-model-check-port(structured HARNESS_ERROR) | CodeRabbit 糸の修正テスト |

## 実行

```
bun test tests/integration/ --timeout 120000
```

## 実績(2026-08-07)

- wave 2 計測: integration 334 pass / 0 fail、e2e 19 pass / 0 fail(3 skip = pre-existing docker-env gates)
- レビュー修正後: touched 9 ファイル 101 pass / 0 fail + 隣接 10 ファイル 143 pass / 0 fail(builder 実測)
- CI `Tests` ジョブ: pass(10m2s)
