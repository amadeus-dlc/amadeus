# Intent Capture 質問票 — 260810-numeric-provenance-guard

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)。一次入力 = GitHub Issue #2815 本文、クロスレビューコメント2件(reviewer-1 / reviewer-2、いずれも CONFIRMED_WITH_REFINEMENTS、収束 ESTABLISHED_WITH_REFINEMENTS、対象 SHA c909b6130)、ユーザー起動指示(worktree 起動プロンプト 2026-08-10)。

## 判定方針(E-OC1 ヘッダ)

本 intent は事前整理済み(Issue-first 起票 + クロスレビュー2名成立 + ユーザーの起動指示)のため、`cid:intent-capture:c1` に従い質問を真に未決の判断のみに絞る。ステージ既定4問はすべて一次証拠から一意に導出できる執行クラス(`cid:requirements-analysis:always-elect` の執行条項)であり、選挙・decide-question を要しない。未決の設計判断(対象クラス定義・enforcement cutoff・#1237 共通化)は requirements-analysis / design 段へ明示委譲する(Issue 本文とクロスレビュー両名が「設計段の裁定事項」と明記済み)。

## 質問と裁定

### Q1. どのビジネス問題を解決するか

[Answer]: 成果物・報告中の数値主張(件数・PASS/FAIL 数・%・実測値)が記憶・見込みで書かれる fabrication クラスの混入。prose ノルムが多層(numbers-from-command-output-only / ledger-count-mechanical-recalc / measurement-ref-in-artifacts / derived-value-shows-formula / E-ASD-RES13 追補 / project.md「実測値には provenance を添える」)に積まれてもレビュー捕捉頼みで再発が続いており、決定的検査面が存在しない(執行: Issue #2815 背景節 + reviewer-2 の「post-adoption 再発2件(c1-future-value-trace 2026-08-02、provenance 併記則 2026-08-05 成立後)」の裏付け)

### Q2. 顧客は誰で、どんな痛みか

[Answer]: (内部) ステージ成果物を書く conductor/builder(違反が §12a イテレーションを消費する)、成果物数値を信頼して裁定する人間・レビュアー(数値の再導出可能性が保証されない)、下流成果物・公開面(GitHub Issue 本文まで誤値が伝播した実測 #1478)(執行: Issue エレベーターピッチ + 系譜4件)

### Q3. 成功の定義・測定可能な指標は何か

[Answer]: Issue 完了条件(1)-(3)をそのまま採用し、クロスレビューの効能限定を上書きで固定する: (1) 落ちる実証 — コマンド併記なし数値断定 fixture で FAILED (2) 既存コーパス sweep で偽陽性率を実測し、しきい値・適用範囲を観測レンジ内で確定(c1-threshold-inside-observed-range 準拠。reviewer-1 実測: 素朴述語の未併記率 27.6〜66.1% — スコープ定義なしでは findings が3-4桁規模) (3) 定型 ack・軽量報告は対象外。効能範囲は「provenance 不在クラスの検出」に限定 — 算術誤り・二重計上は併記があっても通過する(第1段では構造的に検出不能。reviewer-1 C10 / reviewer-2 機序上の限界の両指摘)(執行: Issue 完了条件 + クロスレビュー収束の訂正)

### Q4. なぜ今か(トリガー)

[Answer]: E-PM7 L1(2026-07-16 採用 4/4)が「機械ガード化は将来 Issue」と予約した機械化の履行。ノルム成立後も post-adoption 再発が実測されており(reviewer-2)、ノルム追記の積み増しでは「指令ループ外の規範はタスク化しない限り実行されない」限界に留まる(執行: Issue 背景 + team.md cid:requirements-analysis:numbers-from-command-output-only の予約文言)

## 設計段への明示委譲(本ステージでは裁定しない)

- 対象クラス定義: 「成果物種別 × 数値の意味クラス」での定義(reviewer-1: スコープで未併記率が2.4倍動く)
- 遡及適用: answer-evidence 型 enforcement cutoff の採否(reviewer-1: 既製の型が同一 repo に実在)
- #1237(引用実在チェッカー)との述語エンジン共通化の可否(両レビュアー: 設計段の裁定事項)
- 「定型 ack・軽量報告は対象外」の適用限定を matches へどう写すか

## 裁定の記録

- 全4問は執行クラス(一次証拠 = Issue #2815 本文・クロスレビュー2件・ユーザー起動指示からの機械的一意導出)であり、decide-question 梯子・選挙は不要
- Intent autonomy mode = full(grant_id: intent-grant-637c32aed3f69d2db6a64fc18336aaa6)。phase 内の質問・ゲートは grant 授権下で処理
- ユーザー承認: 2026-08-10T08:32:24Z(HUMAN_TURN — full グラント発行 ceremony の実人間ターン。INTENT_AUTONOMY_TRANSACTION_COMMITTED 08:32:28Z)
