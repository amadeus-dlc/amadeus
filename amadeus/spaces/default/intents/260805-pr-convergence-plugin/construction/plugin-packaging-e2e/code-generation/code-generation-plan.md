# Code Generation Plan: plugin-packaging-e2e(U3)

上流入力(consumes 全数): unit-of-work、security-design(U3 nfr-design)

TDD(builder = isolation worktree、E-PCP-CGBLK 裁定経路。U1/U2 は intent ブランチ merge で取得 — ls-files -u 0 確認):

- [x] C8 先行着地: センサー manifest+検査本体(plugin tools 非 import の最小 parse)— t450 先行 Red(module not found)→ 21 pass
- [x] C7: ステージ本文断片(scopes: []、工程(0)-(5)+トリアージ表+self-contained Guardrail、sensors 宣言)
- [x] C9: plugin.json へ stages+produces seam を追加(U2 の最小形を拡張)
- [x] t449 E2E: NFR-1 主実証(レポート不在 → next 同 batch 再発出)+対照(未 install で前進)+パス厳密性+ADR-5 順序 fail-closed+drop byte-identical — 12 pass
- [x] t93 sentinel 同期(count-free 化)・docs EN/JA 対訳1行(Mandated 適用 — 申告済み)
- [x] 落ちる実証: センサー11ケース赤 / NFR-1 両側 / UNKNOWN_SENSOR throw
- [x] 検証: typecheck 0 / lint 0 / 指定9ファイル 149 pass / build 0(import closure 通過 = NFR-4)/ **test:ci 全体 847 files 11247 assertions 0 fail ×2回** / source-only clean
- [x] コミット: builder d9c72344a → conductor cherry-pick 096b814a7+fidelity diff 空+conductor 再実行 45 pass 0 fail(build 後)

受け入れ目安1〜3(Issue #1971)の実証は t449/t450 が固定。
