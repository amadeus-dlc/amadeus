# Security Test Instructions — Intent 260807-tla-specs-relocation

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

## 対象と根拠

`code-summary.md` の「Files created / modified」と「Key implementation decisions」、および `code-generation-plan.md` の Step 2/Step 6(resolver 委譲と loader 配線)から導出したセキュリティ関連の変更面は次の3点(すべて fail-closed 方向の強化):

| 面 | 検証 | 実績 |
|---|---|---|
| loader の containment 境界 | `verifyAssetPath` の `isContained` 判定を realpath 済み spec dir 基準に修正(レビュー糸)。symlink 経由の脱出は引き続き reject、symlink 化された中間コンポーネントは誤判定しない | t-formal-verif-tla-model-loader.integration に3テスト(symlink 中間=受理 / 脱出=CFG_UNREADABLE / 不在=fallback)で green |
| legacy 配置の無音読取排除 | 旧 `specs/tla/` の spec は読まず fail-closed(新旧両存も停止) | t481 で両ケースを assert |
| model-map の asset 所在整合 | map 内 asset は単一 space を共有し、かつ map 自身の所在 space と一致することを要求(他 space の未監視 asset の混入を封止) | t482 否定テスト + loader integration fixture で green |

## 実行

```
bun test tests/integration/t481-spec-root-resolver.integration.test.ts tests/unit/t482-legacy-model-map-paths.test.ts tests/integration/t-formal-verif-tla-model-loader.integration.test.ts --timeout 120000
```

実績: 全 green(2026-08-07、builder 実測 101 pass / 0 fail を含む)。

## 適用外の判定

- 認証・認可・秘匿情報の取り扱い・外部入力のバリデーション境界の変更はない
- TLC 実行契約(sandbox-exec / Docker 隔離・network deny)は不変(NFR-1)
