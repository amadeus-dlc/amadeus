# Build and Test Summary — 260820-fmc-drift-batch

上流入力: 4 unit の `code-generation-plan.md` / `code-summary.md`(applicability-arms / revise-model-commit / boundary-three-face / advisory-retirement)。実測の一次記録は `build-test-results.md`。

## ビルド状況と前提

| 項目 | 状態 | 根拠 |
|------|------|------|
| build (`bun run build`) | ✅ exit 0 | origin/main `99f61828c` 断面 |
| typecheck | ✅ exit 0 | 同上 |
| lint (Biome) | ✅ exit 0(errors 0) | 同上 |
| リモート CI(正本) | ✅ 4 merge とも `CI Success` = success | #3362/#3363/#3364/#3374 の merge commit check-runs |

前提: Bun + `bun install --frozen-lockfile` のみ。追加サービス・環境変数なし。

## テスト種別インベントリ

| 種別 | 生成 | 備考 |
|------|------|------|
| unit-test-instructions.md | ✅ | 4 unit の実装済みテストの実行手順と要件 trace |
| integration-test-instructions.md | ✅ | 境界横断面(t3186×2 / t449 / t439 / t450 / t526 / t3028 等) |
| performance-test-instructions.md | ✅(N/A 判定) | NFR-3 により専用検査は不生成 — 根拠と覆す条件を記載 |
| security-test-instructions.md | ✅(N/A 判定) | 同上。fail-closed 検証は通常テストとして実装済み |
| E2E / contract 等の追加種別 | 生成せず | 適用 NFR・新設外部境界なし(TLC 依存 e2e は環境前提外) |

## unit 別カバレッジ期待

- **applicability-arms**: t3186 2 ファイル 42 pass(tier i/ii + defectRecurrence + fail-closed 全枝)。Patch Coverage Gate green(2周目)
- **revise-model-commit**: t448 28 pass / t3078 落ちる実証 / integration 119 pass(実装時実測)
- **boundary-three-face**: 3面 Red→Green + SOURCE_DRIFT 両アーム + formal/tla 86 ファイル 1391 pass(実装時実測)
- **advisory-retirement**: 触れた 11 テストファイル 197 pass + 残存ゼロ census 9 キー(実装時実測、着地面再実測済み)

## 準備状況評価

- **build-ready**: ✅(origin/main で build/typecheck/lint 全 green)
- **test-ready**: ✅(targeted 169 pass / 0 fail + リモート CI 正本 green)
- **deployment-ready**: 該当なし(本プロジェクトはデプロイ基盤を持たず、リリースは release.yml の workflow_dispatch 一本 — 本 intent はリリース操作を含まない)

## 既知の制限・申し送り

- ローカルフルスイート完走は非実施(remote-first 規律 — 正本はリモート CI)。未検証面の書き分けは build-test-results.md 申し送り節参照
- pr-convergence CLI の merged-arm 最終化は「1 bolt 内の member units が別 PR で配送された」形を member-loop が閉じられない(revise-model-commit で実測)— 回復は head checkout 再測定 + audit union 回収で完了済み(梯子 AUTO_DECIDED auto-decision-8410374f1a696726aa91207d3132e24b)。構造欠落の起票は §13 で扱う
- FR-X-4(t448 自己参照比較の起票)は **Issue #3371(OPEN)として起票済み**を実測確認(`gh issue list --search "t448 自己参照"`、2026-08-21)。修正自体は要件どおり本 intent のスコープ外
