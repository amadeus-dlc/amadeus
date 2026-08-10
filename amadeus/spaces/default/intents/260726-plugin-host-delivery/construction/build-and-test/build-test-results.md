# Build and Test Results — 260726-plugin-host-delivery

> 上流入力(consumes 全数): code-generation-plan、code-summary — 各ユニットの code-generation-plan.md の検証宣言と code-summary.md の exit code 主張を、統合ツリー(fix/plugin HEAD、U2〜U8 全マージ後)での conductor 再実測と突き合わせた結果を記録する。

## ビルド結果(実測 ref: fix/plugin e29e2e0c8 時点)

| コマンド | exit code | 結果 |
|---|---|---|
| `bun run typecheck` | 0 | 成功 |
| `bun run lint` | 0 | 成功 |
| `bun run dist:check` | 0 | drift なし(7ハーネス) |
| `bun run promote:self:check` | 0 | drift なし |

## テスト結果(`bash tests/run-tests.sh --ci`)

- **RESULT: PASS(exit 0)**。テストファイル 580 PASS / 0 FAIL(`grep -c '^--- PASS'` = 580、`^--- FAIL` = 0)
- サイズ別分類(runner 集計表の転記): small 153 / medium 533 / large 3
- 失敗詳細: なし

## カバレッジ(`bun run coverage:ci` — exit 0)

- プロジェクト全体: hits 43,209 / lines 50,670 = 85.28%(coverage/coverage-totals.json 転記。85.28 は 43209÷50670 の導出値)
- **patch(diff 追加行)機械照合**: origin/main(f8fe817c5)との diff のソース追加行 × lcov DA 直読で **DA:0 = 0**(対象 12 ファイル: core tools 4・harness hooks 5・scripts 3)
- lcov 不在 3 ファイル(codex/kiro/kiro-ide の adapter hooks、追加 18 行)は patch gate の構造的測定不能クラス(tests/coverage-patch-gate.ts:199 「file absent from lcov → structurally unmeasurable」)としてスキップされる

## 性能実測(NFR-2 予算固定)

- `compose --if-stale` no-op 経路: real 0.04s ×3(scratch fixture、詳細は performance-test-instructions.md)→ 予算 500ms 固定、実測はその 1/12 以下

## 実行中に検出・是正した事項

1. **t258 boundary-guard 赤**(U7 統合時): skill 文書の `scripts/conformance-report.ts` 参照が allowlist 漏れ → id 付きエントリ追加で閉包
2. **t199 prefix-contract 赤**(U7 tracked 化時): t188-trace.md の上流リポジトリ名参照 → content allowlist へ登録(語彙衝突による自己検出 1 回を是正込みで閉包)
3. **t177 flake**(#1565 起票): rmSync force:true が削除失敗を無言に飲み込むクラス — removeTreeWithRetry を後置 existsSync 検証+リトライへ是正(e29e2e0c8)。是正前 単体 1/3 pass → 是正後 5/5 pass、フルスイート PASS
4. **distribution writer lock の stale reader**(DEAD PID): 除去で回復(build-instructions.md のトラブルシューティングに記載)

## 未検証面の明示(verdict-names-unverified-facets)

- GitHub Actions(Linux)上の CI はプッシュ後に実測する(ローカル macOS 実測との環境差 — 特に並行 FS 挙動 — は PR の CI green をもって閉包)
- codecov patch gate の最終判定は CI の Coverage Report が権威(ローカル lcov 照合は DA:0 = 0)
