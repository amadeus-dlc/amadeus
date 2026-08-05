# Code Summary: plugin-packaging-e2e(U3)

上流入力(consumes 全数): unit-of-work、security-design(U3 nfr-design)

## 変更ファイル(コミット 096b814a7 — builder d9c72344a の cherry-pick、fidelity diff 空)

| ファイル | 内容 |
|---|---|
| `packages/framework/core/sensors/amadeus-pr-convergence-report-format.md` | C8 manifest(advisory、matches = レポートパス形) |
| `packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts` | C8 検査本体(plugin tools 非 import — 2 reader の乖離は t450 が renderReport 生成 fixture で検出) |
| `plugins/pr-convergence/stages/pr-convergence.md` | C7 工程断片(scopes: []、工程(0)-(5)+2軸トリアージ+self-contained Guardrail、sensors 宣言) |
| `plugins/pr-convergence/plugin.json` | C9 — stages+produces seam(target=code-generation, entry=pr-convergence-report) |
| `tests/integration/t449-*.test.ts` / `t450-*.test.ts` | NFR-1 両側実証 E2E / センサー様式検査(11 赤ケース) |
| `tests/integration/t93.test.ts`+docs 06-sensors EN/JA | sentinel 同期(count-free)+対訳1行(Mandated 適用の申告済み追加) |

## 落ちる実証(Issue 受け入れ目安の閉包)

- **目安1**: install 済みでレポート1件不在 → `next` が同 batch 再発出(t449 実測)。未 install では前進(対照 — 片側でない証明)
- **目安2**: `replied-unresolved` fixture で述語赤(U2 t446。U3 E2E は composed runtime 経由の貫通確認)
- **目安3**: 台帳の GraphQL 機械導出(U2 t447 — ページング/bot 判定/severity/終端処理)
- ADR-5 順序: core manifest 不在で compile が UNKNOWN_SENSOR throw(fail-closed)
- drop: byte-identical 復元+produces stock 復帰

## 検証結果

- builder: typecheck 0 / lint 0 / 9ファイル 149 pass / build 0(NFR-4 import closure)/ **test:ci 847 files 0 fail ×2** / source-only clean
- conductor 再実行(cherry-pick 後): typecheck 0 / build 0 / t449+t450+t93 = 45 pass 0 fail(build 後の dist 断面で green)

## 申し送り

- no-silent-drop BASELINE_INVALID は base 由来(census 寄与 0 件を census-evidence で確認済み)— rebind は PR 作成時に conductor が単独コミット(c3-nsd-rebind)
- 実 GitHub API への status/report/override ライブ実行は AC 外(未検証面 — verdict-names-unverified-facets の申し送り形)
