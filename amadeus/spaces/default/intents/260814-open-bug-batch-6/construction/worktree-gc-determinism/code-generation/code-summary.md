# Code Summary — U-4 worktree-gc-determinism(#3031 / FR-4)

depth Minimal。判定分岐 (a) 適用のため**ソース・テスト変更 0 件**。一次証跡は `primary-evidence-log.md`。

## 判定(FR-4 (a))

- **retry は観測失敗を覆う** — CI run 31772609914 attempt 1(job 94681485455)の観測 stderr 逐語 `fatal: could not open '.git/worktrees/feature-copy/locked' for writing: No such file or directory` は、PR #3056 の retry 発火条件文字列 `/locked' for writing: No such file or directory` を部分文字列として含む(python3 `cond in obs` → True)。失敗コマンドは `worktree add`(run head 653a24aa1 の :169 逐語)、exit 128 ≠ 0 — 発火3条件すべて成立
- `locked` は git のロックメタデータファイル名であり worktree 名非依存 — 条件は一般に成立(将来の同型失敗も覆う)
- よって是正 0 件で FR-4 (a) を充足。当時の失敗は retry 導入(e44f6e3c2)**以前**の断面で発生したものであり、現行バイトでは同条件が再現しても retry が吸収する

## 対称面棚卸し(FR-4 (c))

- retry なしの実 `git worktree add` fixture 準備 **8 箇所**を全数列挙(検索述語は primary-evidence-log.md に併記)し、修正せず #3088 として起票
- 被検対象側(本番ツールが内部で worktree add する e2e 等)は除外し、除外リストも記録

## 変更ファイル

- ソース 0 件 / record 3 ファイル(plan / primary-evidence-log / 本ファイル)+ pr-convergence-report(record 配送 PR で mint)

## 申し送り

- Issue #3031 は「観測失敗は既着地 retry が覆う」ことの record 確定によりクローズ提案可能(クローズは人間承認境界)。残余リスクは #3088 が引き継ぐ
