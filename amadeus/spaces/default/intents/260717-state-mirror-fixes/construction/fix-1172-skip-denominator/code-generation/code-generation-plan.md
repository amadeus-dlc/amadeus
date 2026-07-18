# Code Generation Plan — fix-1172-skip-denominator

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、requirements.md、unit-of-work.md

## 実行計画(実施済み — swarm worktree 隔離)

1. swarm prepare(batch 1)で worktree `bolt-fix-1172-skip-denominator` を main(cb27c32a0)から fork
2. builder subagent へ設計内包プロンプトでディスパッチ(c2+deviation-stop+sync-completion)
3. 実装: countStageProgress へ scope-skip 除外1本追加([S] 除外の直後・total++ の前 — logical-components.md の挿入位置どおり)+コメント両条件化
4. テスト: t232 の捏造 fixture 実様式化+両様式ケース+18/18 ケース
5. 落ちる実証(条件恒偽化→3 fail→revert→12 pass の1セット、残渣 grep 0)
6. referee check: converged=true / tampered=false(実測)

## 検証コマンド列と結果

typecheck 0 / lint 0(対象2ファイルの警告 0)/ t232 unit 12 pass / t232 integration 19 pass / run-tests.sh --ci PASS(374 files・5286 assertions・Failed 0)。配布面なし(scripts ローカル)

## 上流整合

requirements.md FR-2a〜2c/FR-4b と unit-of-work.md U2(概算 3-5+20-40 行)に対する実績: 実装 +8 相当・テスト +82 相当(fixture 是正含むため見積り上限超は fixture 行数由来 — 実装本体は 3-5 行内)。
