# Code Generation Plan — fix-1170-retreat-guard

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、requirements.md、unit-of-work.md

## 実行計画(実施済み — swarm worktree 隔離)

1. swarm prepare(batch 1)で worktree `bolt-fix-1170-retreat-guard` を main(cb27c32a0)から fork
2. builder subagent(amadeus-developer-agent)へ設計内包プロンプトでディスパッチ(c2 隔離文言+deviation-stop+sync-completion 明記)
3. 実装: handleSetStatus の export 化+withAuditLock ラップ+ロック内 parseCheckboxes 判定(logical-components.md の最終形どおり)
4. テスト: tests/integration/t233(BR-1/2/3/4/6/8 — テスト配置は nfr-design の T-3 写像どおり integration 層)
5. dist 6ツリー+self-install 再生成 → dist:check / promote:self:check
6. 落ちる実証(述語恒偽化→赤→revert→緑の1セット)
7. **ブロッカー**: 既存3テスト(t147/t149/t209)が旧バグ挙動(completed の巻き戻し)を assert — builder が実装前停止 → E-SMF-CG1 選挙(D=A+B 併用採用、2026-07-18T01:08:47Z 開票)→ A 方式で3テストを非 completed 前進 stage(user-stories)へ retarget(宣言付き契約更新)
8. referee check: converged=true / tampered=false(実測)

## 検証コマンド列と結果

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / run-tests.sh --ci PASS(375 files・5295 assertions・Failed 0)/ complexity-gate 0 new violations / ローカル lcov: handleSetStatus 全域被覆(抑止分岐・書込分岐とも covered)

## 上流整合

requirements.md FR-1a〜1e/FR-4a/4c と unit-of-work.md U1(概算 30-40+160-190 行)に対する実績: 実装 +48(dist 除く正本)・t233 +303(契約更新分 d84244049 は E-SMF-CG1 裁定由来の追加で見積り外 — 宣言済み)。
