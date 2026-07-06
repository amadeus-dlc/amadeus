# Decisions — Application Design（260705-presence-evidence）

上流入力: [components.md](components.md)

## O-1 の前倒し確定について

requirements / refined-mockups は O-1（追記位置・見出しレベル）の確定先を functional-design としていたが、本ステージで必要な事実（3 コピーの系統、audit-format.md の実構造、parity-map の実内容）が出揃ったため前倒しで確定する。functional-design は AD-1〜AD-3 の**追認と本文執筆**のみを行う（再確定はしない）。

## 決定

| ID | 判断 | 理由 |
|---|---|---|
| AD-1 | 追記先は knowledge/amadeus-shared/audit-format.md（70 events 版）のフルパスで確定（O-1 の位置確定・前半） | 3 箇所のうち GUARD_EXEMPTED を収録する正はここだけ。skills 側 references は上流凍結コピーのため触れない |
| AD-2 | 独立 H2 節として追加し、冒頭カウントは更新しない（O-1 の見出しレベル確定） | イベント表を持たない説明節のため。Event Registry 内 H3 は 0 件カテゴリの様式不整合を生む（refined-mockups の場合分け） |
| AD-3 | 既存の engineFileExceptions（knowledge/aidlc-shared/audit-format.md、Issue #499 由来）の reason へ、本 Intent の追記の説明を追補する（新規宣言は不要 = 登録済み） | parity-map は knowledge/ を検査対象に含み、当該ファイルは例外登録済み。reason が #499 の GUARD_EXEMPTED 追記だけを説明したままだと、本追記が理由なき乖離として残る。parity:check の pass は path 例外により内容に依らないため、妥当性は reason で担保する |
