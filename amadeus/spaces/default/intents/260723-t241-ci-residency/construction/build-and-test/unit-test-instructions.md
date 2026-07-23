# Unit Test Instructions — 260723-t241-ci-residency

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1294-t241-residency/code-generation/)。

## 対象と実行

unit 層の変更は coverage registry pin(`tests/unit/gen-coverage-registry.test.ts:857` — EXPECTED_NONE_TO_CLI の新パス更新)のみ:

```
bun test tests/unit/gen-coverage-registry.test.ts
bun test tests/unit/t-test-size-drift.test.ts   # FR-4 size purity の回帰面
```

## 判定

exit 0 かつ fail 0。runner の `Ran N tests across M files` とファイル数一致を確認(cid:test-path-set-completeness)。
