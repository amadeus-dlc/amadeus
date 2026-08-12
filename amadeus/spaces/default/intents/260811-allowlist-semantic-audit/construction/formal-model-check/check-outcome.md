上流入力: tla-authoring の適用性評価(`construction/tla-authoring/applicability-assessment.md`)

# Formal Model Check — 実行結果

**結論: `NOT_APPLICABLE`。TLC は起動しない。**

## 根拠

ステージ契約の Stage body (1) は、直前の適用性評価の結果で分岐する:

> An `impl-only`, `non-target`, or `not-applicable` outcome records `NOT_APPLICABLE`
> and does not invoke TLC.

直前の `tla-authoring` は requirements.md の FR-1〜FR-7 / NFR-1〜NFR-4 を全数列挙し、
**選定された subject 0 件**として terminal `not-applicable` を記録している。したがって
本ステージは `NOT_APPLICABLE` を記録して TLC を起動しない。矛盾する outcome は存在しない
(halt 条件に該当しない)。

これは `cid:build-and-test:two-layer-verification-posture` とも整合する — 形式検証の発動条件は
「並行プロトコルの spec 変更」に限定され、すべての変更へ一律義務化しない。本 intent は
`amadeus/spaces/default/specs/tla/` 配下の spec を一切変更していない。

## 実測

```
git diff --name-only 854692fd7a11b124236b0427fe3d59e2fe6bf785 HEAD -- amadeus/spaces/default/specs/
```

出力は空(spec の変更 0 件)。model-map.json への登録・改訂も行っていない。

## 実行しなかったもの

- `run-model-check.ts` の起動(TLC 探索)
- model-map.json への登録・照合

契約が「applicability の terminal outcome を記録して TLC を起動しない」と定める経路であり、
検査の省略ではなく分岐の帰結である。
