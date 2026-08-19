# Unit Test Instructions — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md § 検証(BR-6 のコマンド集合)、code-summary.md(各 Bolt の builder 実測 exit code — 本 instructions はその再現手順)

## 対象

docs 消費ガードの unit 層 3 本(docs-only intent のため、対象は docs を読むガードに比例選定 — `cid:build-and-test:bt-proportional-selection`):

```
bun test tests/unit/t174-docs-legacy-refs-gate.test.ts tests/unit/t132-hooks-doc-count-sync.test.ts tests/unit/t68-version-changelog-sync.test.ts
```

- t174: docs 全域(`.ja.md` 含む)の legacy 参照 allowlist ゲート
- t132: hook-scope 件数 ⇄ 実 hook 群の同期(要 dist — build-instructions 手順 4 が前提)
- t68: version バッジ ⇄ amadeus-version ⇄ CLI の同期(EN のみ対象 — JA 拡張は #2277)

## 判定

exit 0 かつ宣言 path 数と runner の「across N files」一致(Bun は不存在 path を無音除外 — `cid:build-and-test:test-path-set-completeness`)。
