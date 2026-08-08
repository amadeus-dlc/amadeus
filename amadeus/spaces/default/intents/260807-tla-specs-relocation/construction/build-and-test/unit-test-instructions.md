# Unit Test Instructions — Intent 260807-tla-specs-relocation

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

Test Strategy: Comprehensive。単体レベルの検証対象と実績。下表の対象は `code-generation-plan.md` の Step 10/Step 11(既存テスト更新と新規 t481+)を、実績値は `code-summary.md` の「Test coverage summary」を出典とする。

## 対象と根拠(要件トレーサビリティ)

| 要件 | テスト | 内容 |
|---|---|---|
| FR-5 / BR-13c | `tests/unit/t482-legacy-model-map-paths.test.ts`(新規) | 旧 `specs/tla/...` パス値の model/cfg/auxiliary を validator が `MODEL_MAP_INVALID` で reject。非 default space の正準パス受理(正対照)。混合 space map の reject・map 所在 space との不一致 reject(レビュー指摘の追加契約) |
| FR-5 | `tests/unit/t-formal-verif-model-map-v2.test.ts`(更新) | 正準パス規約の pin を新パスへ。legacy auxiliary-path の否定ケース |
| FR-2/FR-7 | `tests/unit/t-formal-verif-canonical-core.test.ts` / `t-formal-verif-tla-model-loader.test.ts` / `t-formal-verif-model-completeness-sensor.test.ts` / `t-formal-verif-ci-model-check-domain.test.ts` / `t-formal-verif-run-model-check.test.ts` ほか unit 16 ファイル(更新) | 新正準パス・resolver 経由の解決・mount 述語 |
| 回帰 | t113 / t203 / t210 / t401 / t404 / t415 / t446 / t448 / t457 / t459(更新) | fixture・期待値の新パス化 |

## 実行

```
bun test tests/unit/ --timeout 60000
```

## 実績(2026-08-07、ローカル)

- 変更対象 unit スイート: **286 pass / 0 fail / 673 expect**(wave 2 計測)
- レビュー修正後の再計測: t482 + 隣接 unit 群を含む sweep で **green**(builder 実測: touched+隣接 24 スイート 310 pass / 0 fail を含む)
- CI `Tests` ジョブ(unit 含む全スイート): pass
