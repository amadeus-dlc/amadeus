# Election Record — E-PWF-CGDEV

- question: 260807-projectdir-worktree-fix code-generation の逸脱裁定。builder が実装前停止: FR-2a は「in-process 直 import でケース B と C+env の Red を実測」と定めるが、実測で AC-1a（ケース B 逐語形: cwd=worktree × main 絶対 lib → main を返す欠陥）は in-process では Red にならない — 正本 amadeus-lib.ts は packages/framework/core/tools/ にあり親セグメント core が isHarnessDirName(先頭ドット必須, amadeus-harness.ts:71-73)を満たさず rung 3(script-path)が構造的に到達不能、rung 4 が cwd を返すため修正前でも期待値一致（t481 test 1 が green の実測）。一方 AC-1b(C+env)の Red は逐語で実測済み(exit 1)、AC-1a は祖先形(marker-less 子 dir → worktree root)で Red 実測済み。builder 報告の一次記録は record 外 scratch の builder-report-2352.md。t481 は7ケース作成済み・実装は未着手。裁定選択肢: 逐語 Red の取り方。

裁定: 案C: AC-1a の括弧書きを明示改訂してから案A(choice 3: 2票)
内訳: choice1=0票 choice2=0票 choice3=2票
- 留保(subagent-1, GoA2): AC-1a の改訂は括弧書き（検証面の記述）に限定し、AC-1a の実質要件『cwd=worktree（marker 保有）× env UNSET で worktree root を返す』の文言・射程は逐語のまま維持すること。実質要件に触れる改訂は仕様変更としてユーザーエスカレーション（正準リスト(4)）に当たる。あわせて code-summary に FR-2b/t144 が逐語形の回帰 pin を担う旨を明記し、閉包の所在が文書上追跡可能であること。
- 留保(subagent-2, GoA2): AC-1a の改訂は括弧書き（現行挙動の記述）へ検証面の限定を加えるだけに留め、AC-1a の実質基準（cwd=worktree × main 絶対 lib × env UNSET で worktree root を返す）自体は一切弱めないこと。また逐語形の回帰 pin は案 A/C いずれでも FR-2b の t144 更新が担う（t144 test 4 は現状 cwd=tmp が marker 非保有のため逐語形を pin していない — FR-2b の更新で pin される必要がある）ことを code-summary に明記すること。
票タイムライン: 配信 2026-08-07T11:11:14Z → 配信 2026-08-07T11:11:14Z → subagent-1 2026-08-07T11:13:01Z → subagent-2 2026-08-07T11:13:25Z → 開票 2026-08-07T11:13:30Z
GoA[E-PWF-CGDEV]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
