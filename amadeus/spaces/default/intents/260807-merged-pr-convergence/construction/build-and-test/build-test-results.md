# Build & Test Results — 260807-merged-pr-convergence

上流入力(consumes 全数): unit landed-report の `code-generation-plan.md`(TDD 計画と裁定)と `code-summary.md`(実装・検証実績 — `construction/landed-report/code-generation/`)。測定 ref = ブランチ `bolt/landed-report` head `a18d5bc63`(base = origin/main `4a3da7d62`)。実行日 2026-08-07。

## ビルド

| 項目 | 結果 | 出典コマンド |
|---|---|---|
| typecheck | exit 0 | `bun run typecheck` |
| lint | exit 0(errors 0) | `bun run lint` |
| complexity gate | exit 0(新規違反 0 — ヘルパー抽出で解消、baseline 追加なし) | `bun tests/complexity-gate.ts --check` |
| build 後追跡ファイル不変 | 確認済み | `bun run build` + porcelain |

## テスト(conductor 独立再実行)

対象6ファイル(実在 6/6 配列確認): **148 pass / 0 fail / 387 expect**、`Ran 148 tests across 6 files`(`bun test`)。t446 / t448 は無改変 green(AC-2c)。

## CI(正規判定)

PR #2414: 必須集合 **13 pass / 2 skipping**(Tests = full `test:ci` / Coverage 両ゲート / 再現性 / source-only / graph 不変量 / plugin conformance / Bugbot / CodeRabbit)。
- Tests の fail 2回はいずれも t427-no-silent-drop 系の**毎回別テスト**(患部非接触・ローカル 23/23 green)— #2397 の回転フレークと帰属し re-run で回収(両結果を PR コメントと #2397 へ記録 — Flakes are evidence)。
- Patch gate 赤1回(5行)は多行型注釈 DA:0 + primed 未駆動 — 是正コミットで解消し再 run green。
- Complexity gate 赤1回(2件)はヘルパー抽出で解消。

## 収束(dogfood)

新 CLI 自身で status = `converged: true`(CLEAN / threads 7 resolved / terminalized 6)、report 生成、`pr-convergence-report-format` センサー **SENSOR_PASSED**(audit 実測)。

## 検証した面と未検証の面

- 検証済み: AC-1a〜AC-4b 全数(scripted fixture + 実 FS integration)・既存挙動保存・converged 経路の実地 end-to-end。
- 未検証(AC 外): landed 経路の実機実行(マージ後に初出 — summary 申し送り1)。
