# Code Generation Plan: convergence-toolchain(U2)

上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、unit-of-work

TDD 8サイクル(builder = worktree 隔離 subagent、E-PCP-CGBLK/CGDEV 裁定準拠):

- [x] 1: classifyThread 決定表(BR-U2-2)— Red(module not found)→ 8 pass
- [x] 2: MergeStateStatus/Mergeable parse(ADR-2 未知値 throw)→ 13 pass
- [x] 3: evaluateConvergence(BR-U2-1)→ 19 pass
- [x] 4: resolveMergeable retry(BR-U2-5/ADR-4 タイミングシーム)→ 26 pass
- [x] 5: gh runner 4契約(BR-U2-6)→ 12 pass
- [x] 6: ledger(BR-U2-3/4/9/10)→ 27 pass(テスト側期待の初出順訂正1件)
- [x] 7: CLI 3 verb(BR-U2-7/8)→ 28 pass(fixture 採取クエリ不足の再採取1件)
- [x] 8: log-tool パスの harness 中立性(builder 自己捕捉の parity 欠陥修正)→ 30 pass
- [x] 落ちる実証3種(連言削除/report fail-open 化/HUMAN_TURN 拒否無効化)— 注入→赤→checkout 復元→残渣ゼロ
- [x] 検証: typecheck 0 / lint 0 / t446-448 = 83 pass 0 fail 225 expect / build 0 / test:ci 全体 843 files PASS / complexity 0(refactor で CCN 18→13)/ t377 0(コメント reword)
- [x] コミット: builder `130f46778`+`e471c7d0b` → conductor ブランチへ cherry-pick(再接地後 `7c5722421`+`90134e2d0`)+fidelity diff 空

申告4件(conductor 受理 — 一次証拠から一意の執行): plugin.json 最小形(build fail-closed 対応、U3 が拡張)/ override の emit 先行順序(fail-closed 側への精密化)/ severity 写像の実測限定(BR-U2-10)/ 型 import 粒度(辺集合6本不変)。
