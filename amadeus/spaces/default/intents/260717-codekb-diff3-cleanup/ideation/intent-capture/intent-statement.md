# Intent Statement — codekb diff3 cleanup(Issue #1129)

上流入力(consumes 全数): なし(本ステージの `consumes` 宣言は空。参照した事実源は [Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129)、同 Issue の独立クロスレビュー、修正コミット `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0`、現 HEAD `249d6eb21d1dd2bbb9894e32207083e765cec3dc`)。

## Problem Statement

e1 の `fix/1027-state-set-fail-closed` 系統にある2つの共有 CodeKB ファイルへ、3-way(diff3) conflict の base マーカー `||||||| a7a4a9716` と旧「最新」ヘッダが孤立したまま残った。対となる `<<<<<<<` / `=======` / `>>>>>>>` は存在せず、従来の `<<<<<<<` だけを探す検査では検出できなかった。

この残渣は実行時の診断結果を壊さないが、履歴ブロックを「最新」に見せ、record-sync 経路で main へ流入すると CodeKB の鮮度表示と将来のヘッダ構造検査を紛らわせる。影響は表示・保守性に限られるため、[Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129) の分類 `P3` / `S4-MINOR` と整合する。

修正コミット `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` は当該2ファイルから孤立 sentinel と残存 base ヘッダを各2行削除しており、`origin/fix/1027-state-set-fail-closed` に存在する。現 conductor HEAD `249d6eb21d1dd2bbb9894e32207083e765cec3dc` はこの修正コミットを祖先に持たないが、origin/main 側にも欠陥がなかったため、同じ2ファイルは clean である。したがって本 intent の中心は新しい機能追加ではなく、修正済みの branch hygiene を record-sync の着地まで追跡し、main へ欠陥を持ち込まないことである。

## Target Customer

- CodeKB を次の intent の事実源として読む Amadeus の conductor と architect
- 共有 CodeKB の履歴・鮮度ポインタをレビューする保守者と reviewer
- record-sync の着地と Issue の close 条件を管理する leader

利用者の痛みは、孤立マーカーそのものよりも、どのブロックが最新かを誤読しやすいこと、構造 grep が偽陽性になること、clean な main へ branch 固有の残渣が流入しうることにある。

## Success Metrics

1. `amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md` と `code-structure.md` の `|||||||` がそれぞれ0件である。
2. 同2ファイルの「最新」を示す H2 ヘッダがそれぞれ1件で、`260715-opencode-cursor-harness` の履歴ブロックが1本だけ保持される。
3. record-sync の main 着地後に同じ検査を再実行して0件 / 1件を確認し、着地状態の実測後にだけ [Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129) を close する。
4. 既決の `cid:reverse-engineering:diff3-marker-vocab` を適用し、今後の conflict-marker 検査語彙に `|||||||` を含める。新しい重複ノルムは作らない。

2026-07-17T17:48Z 頃の現 HEAD 実測では、指標1は `0 / 0`、指標2の最新ヘッダは `1 / 1` である。件数は各ファイルへの `awk` 全数走査から得た。

## Initiative Trigger

[Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129) は、別 intent の Reverse Engineering 中に発見され、起票者以外2名が対象行と対マーカー不在を独立検証した。修正コミット自体は既に当該 branch にあるが、main 着地前の浄化を追跡可能な intent record として残し、着地確認と Issue close を同じ成功条件で結ぶ必要があるため開始された。

## Initial Scope Signal

- 記録済み scope: `amadeus`
- depth: `Standard`
- test strategy: `Comprehensive`
- IN: 修正済み CodeKB 2ファイルの clean 状態、record-sync 着地条件、着地後の close 条件の追跡
- OUT: origin/main の無関係な CodeKB 再編集、過去履歴の書き換え、既に採用済みの diff3 検査語彙ノルムの再設計

scope は intent birth 時のユーザー選択をそのまま尊重し、このステージでは再解釈しない。
