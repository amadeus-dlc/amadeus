# Integration Test Instructions — 260821-fmc-retirement

上流入力: `code-generation-plan.md`、`code-summary.md`。

## 実行

```bash
bash tests/run-tests.sh --ci     # 全層(integration 含む)
bun test tests/integration/<file>  # 単体
```

## 本 intent の integration 対象

| 面 | テスト | 検証内容 |
|---|---|---|
| B1 差し替え(16 件) | t341 ほか(束縛差し替え、assertion 削除 0) | conformance / install / compose / drop のジャーニーが合成 fixture で成立 |
| A2 温存(4 件) | t2967 / t378 / t381 / (改名) conformance-fixture harness | コア advisory 経路(directive advisories・latch・handoff)の被覆維持 |
| 残存コア被覆回復(追補 2) | `t-plugin-stage-compile` / `t-sensor-glob-expansion` / `t-advisory-choice-boundaries` / `t-plugin-runtime-trust` | 退役テストが駆動していた plugin stage compile / sensor glob / advisory choice / orchestrate --single ガードの characterization(公開 seam 経由) |
| CI 配線 pin | t222 | base coverage の cache と upload が totals + lcov の**両方**を運ぶ(出現数 2) |
| scratch runner 閉包 | t112(serial) | `lib/lcov-file-totals.ts` を含む import closure の複製が成立 |
| RE 非除外宣言の同期 | t2415 ×2 | specs/tla キーの正本+pin 同時更新(ADR-5) |
| conformance blocking | plugin-conformance-e2e(CI job) | 合成 fixture での blocking green |

## 環境

- 合成 fixture は read-only コピーで使用(t341 契約)。fixture 変更時は t341 の弱体化ゼロ制約に追随
- serial 指定テスト(t112 等)は並列外で実行される — ランナー任せにし手動並列化しない
