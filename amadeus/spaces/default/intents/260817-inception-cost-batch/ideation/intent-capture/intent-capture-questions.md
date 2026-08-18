# Intent Capture 質問ファイル — 260817-inception-cost-batch

> 本ステージの4トピック(解決する問題 / 顧客 / 成功指標 / トリガ)は、起票済み Issue 本文・独立2名クロスレビュー・本セッションのユーザー裁定で全て確定済みである。project.md `cid:requirements-analysis:c5`(Issue と承認済み成果物にある決定を再質問しない)に従い、新規質問は起票せず、既決事項を裁定 provenance 付きで記録する。blank の [Answer]: タグは 0 件(人間待ちなし)。
>
> リーダー承認: 2026-08-17T18:16:42Z — ユーザー実 HUMAN_TURN(AskUserQuestion)にて本ステージのゲートを Approve、§13 学習選定は c2+c3 統合採用を選択。記録済み回答の裁定元は各 [Answer] の provenance を参照(E-OC1)。

## Q1: 解決する問題と、いま着手するトリガは何か(問題+トリガの統合記録)

A. インセプション固定費(RE+RA 中央値47分/intent)と RE 入力の自己増幅(排出物 53.3〜86.5%)を解消する — Issue #3181 + #2415 のとおり
B. その他

[Answer]: A — 確定済み。provenance: (1) Issue #3181 本文の audit 実測(直近21 intent で RE+RA active 中央値 47分/intent、(RE+RA)/(RE+RA+CG) 中央値 48%、測定 ref = record ツリー HEAD 215855ea7)。(2) Issue #2415 本文+クロスレビュー xrev-2415-20260818(両名 CONFIRMED_WITH_REFINEMENTS、収束 ESTABLISHED_WITH_REFINEMENTS): 差分入力の 53.3% が他 intent 工程記録(独立2名が完全再現)、直近7区間の排出物比 46.5〜86.5%(reviewer-2 実測)。(3) トリガ = ユーザー明示指示(2026-08-18 実 HUMAN_TURN「これのようなボトルネック解消が急務です」)。

## Q2: スコープ・対象者・成功指標は何か(統合記録)

A. self-feature スコープ / 対象は self-fix intent を回す conductor とその成果物を裁定する人間・レビュアー / 成功指標は導入後 self-fix N 件での RE+RA active 中央値の再実測比較(#3181 完了条件4)と除外適用後の RE 入力縮小率(#2415 完了条件2)
B. その他

[Answer]: A — 確定済み。provenance: (1) スコープ = ユーザー裁定(2026-08-18、AskUserQuestion 回答「self-feature (Recommended)」— 両 Issue が enhancement であることと project.md § Scope Overrides の整合による)。(2) 対象者 = Issue #3181「エレベーターピッチ」節の宣言。(3) 成功指標 = 両 Issue の完了条件(測定手法同一・ベースライン 47分/intent、縮小率の実測記録)。N と目標低下幅は requirements-analysis で観測レンジ内に確定する(cid:code-generation:c1-threshold-inside-observed-range)。
