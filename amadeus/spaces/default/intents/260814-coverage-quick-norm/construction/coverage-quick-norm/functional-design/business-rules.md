# Business Rules — coverage-quick-norm

上流: requirements.md FR-1〜FR-15。

## BR-1: Inbox のみ
追記は Learnings Inbox 節の箇条追加に限る。蒸留済み節の行を改変しない。

## BR-2: advisory を標準、フルは最終1回
内側ループの標準は `coverage-patch-quick` の advisory。フル `coverage:ci` はゲート直前の最終確認1回。

## BR-3: フル実行の条件
フル実行時は `-P 4` を付け、実行中は重い並行をしない。single-owner と #1331/#1326 を緩めない。

## BR-4: 代替禁止
quick の緑を CI Patch/Project Coverage Gate の代替と書いてはならない。

## BR-5: 数値は転記
11 分 03 秒と 3 秒は job 94095568607 の再取得からの転記のみ。

## BR-6: マージしない
PR マージコマンドを実行しない。
