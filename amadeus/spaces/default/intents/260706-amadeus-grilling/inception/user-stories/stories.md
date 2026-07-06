# User Stories — Amadeus Grilling 統合

**Intent**: Amadeus Grilling 統合 / **Stage**: user-stories (2.4)
**Upstream**: `../requirements-analysis/requirements.md`(FR/NFR)と `personas.md`(P1-P3)、codekb `component-inventory.md`(統合触点)に基づく。ジャーニー準拠(モード選択→対話→確認→生成)で分割。各ストーリーは独立して検証可能(INVEST)。
**優先度**: scope-document の MoSCoW 決定(全 Must・不可分1パッケージ)に従い、全ストーリー **Must Have**(Should/Could/Won't は空)。MVP 境界の決定は delivery-planning に委ねるが、本 intent は分割出荷しない。
**team-practices**: 本 intent では team-practices 成果物は未消費(practices-discovery は SKIP、team.md の既存規律は requirements の NFR-4 経由で反映済み)。

## US-1: Grill me モードを選択する(P1) — **優先度: Must Have**

**As** ワークフロー実行者 **I want** ゲート付きステージのモード選択で「Grill me」を選べる **so that** 重要なステージだけ深掘り対話に切り替えられる。

- **AC-1.1** Given ゲート付きステージの質問ファイル作成後 When モード選択が提示される Then 選択肢に Grill me が既存3モードと並んで表示される(FR-1.1)
- **AC-1.2** Given Construction/Operation フェーズのステージ When モード選択が提示される Then Grill me の説明文に「例外的な利用」の注記が含まれる(FR-1.1)
- **AC-1.3** Given ユーザーが Grill me を選択 When モード選択が確定する Then モード選択が監査ログ(QUESTION_ANSWERED)に記録され、grilling 対話が開始される(FR-3.1)

## US-2: 1問ずつ推奨つきで深掘りされる(P1) — **優先度: Must Have**

**As** ワークフロー実行者 **I want** 質問が1問ずつ、推奨回答と根拠つきで提示される **so that** 各論点を深く考え、想定外の前提に気づける。

- **AC-2.1** Given grilling 対話中 When 質問が提示される Then 1回の構造化質問に質問は1つだけ(FR-1.2)
- **AC-2.2** Given 質問の提示 When 選択肢が表示される Then 質問文に推奨の根拠があり、先頭選択肢に「(推奨)」が明記されている(FR-1.3)
- **AC-2.3** Given コードベース/成果物から確定できる事実 When エージェントが質問を組み立てる Then その事実はユーザーに問われず、自己調査で解決される(FR-1.4)
- **AC-2.4** Given 自己調査で確定できない事実 When エージェントが提示する Then 推定(確度つき)として確認を求め、ユーザーが不同意なら通常質問に降格する(FR-1.4)
- **AC-2.5** Given 動的に生成された追撃質問 When 提示される前 Then 質問ファイルに空 `[Answer]:` タグつきで追記されている(FR-1.5)
- **AC-2.6** Given 各回答の確定 When 回答が受理される Then 質問ファイルへ即時書き戻され、1問ごとに QUESTION_ANSWERED が記録される(FR-1.5, FR-3.1)

## US-3: 対話の長さを自分で制御する(P1) — **優先度: Must Have**

**As** ワークフロー実行者 **I want** depth の目安を超えて続けるか、途中で打ち切るかを自分で決められる **so that** 論点の重さに応じて対話コストを調整できる。

- **AC-3.1** Given depth 目安(Standard なら ~5-8 問)に到達 When 次の質問へ進む前 Then 継続確認が提示される(FR-1.6)
- **AC-3.2** Given 対話の任意の時点 When ユーザーが「done」と言う Then 追加質問なしに終了フロー(US-4)へ移る(FR-1.6)
- **AC-3.3** Given 継続確認 When ユーザーが「続けて」と言う Then 対話が延長される(FR-1.6)

## US-4: 共通理解を確認してから生成される(P1) — **優先度: Must Have**

**As** ワークフロー実行者 **I want** 全決定事項の合意サマリを確認してから成果物が生成される **so that** 認識ズレを成果物生成前に検出できる。

- **AC-4.1** Given grilling 対話の終了 When 終了フローに入る Then 全決定事項の合意サマリが提示され、明示確認を求められる(FR-1.7)
- **AC-4.2** Given 合意サマリへの修正要求 When ユーザーが変更を指定する Then 該当 `[Answer]:` が更新され、サマリが再提示される(FR-1.7)
- **AC-4.3** Given 合意サマリの明示確認が未取得 When 成果物生成フローへの遷移が試行される Then 生成は行われず確認提示へ戻る(FR-1.7)
- **AC-4.4** Given セッション中断(未回答質問あり) When ターンが終わる Then 未回答質問が空 `[Answer]:` タグとしてファイルに残っている(FR-1.5 エッジケース)

## US-5: ワークフロー外で grilling を使う(P2) — **優先度: Must Have**

**As** スタンドアロン利用者 **I want** `/amadeus-grilling <対象>` で任意の計画・ファイルを深掘りできる **so that** ワークフローを走らせずに設計の壁打ちができる。

- **AC-5.1** Given ワークフロー未起動または任意の状態 When `/amadeus-grilling <対象>` を実行 Then US-2〜US-4 と同じ規律(1問ずつ/推奨/推定降格/終了確認)で対話が進む(FR-2.2)
- **AC-5.2** Given スキル実行の前後 When amadeus-state.md と監査ログを比較 Then Current Stage と監査ログに差分がない(FR-2.1)
- **AC-5.3** Given 対話終了 When ユーザーが書き出しを明示要求しない Then ファイルは一切作成されず端末表示のみ(FR-2.3)
- **AC-5.4** Given 対話終了 When ユーザーが「サマリを <path> に保存して」と明示要求 Then 合意サマリが指定パスへ書き出される(FR-2.3)

## US-6: どのハーネスでも同じ体験を得る(P3) — **優先度: Must Have**

**As** 外部導入チームメンバー **I want** 自分のハーネスでも文書どおりの Grill me / /amadeus-grilling が使える **so that** ハーネス選定に関係なく同じ導入価値を得られる。

- **AC-6.1** Given `bun scripts/package.ts` 実行後 When 4ハーネスの dist を確認 Then すべてに grilling 規律定義とスキルが配布されている(FR-2.4)
- **AC-6.2** Given dist 再生成後 When `bun scripts/package.ts --check` を実行 Then ドリフトなしでパスする(NFR-4)
- **AC-6.3** Given docs を読む When 対話モード節と session skills 節を参照 Then Grill me と /amadeus-grilling の記述があり、mattpocock/skills への帰属(MIT)が明記されている(FR-4.1, FR-4.2)

## 依存とクリティカルパス

- US-2 が中核(grilling 規律そのもの)。US-1/US-3/US-4 は US-2 の対話ループに接続するが、それぞれ独立に検証可能。
- US-5 は US-2〜US-4 の規律定義を再利用する(依存: 規律の共有定義)。US-6 は全ストーリーの配布面。
- クリティカルパス: US-2(規律の annex 枠内表現 = OQ-1 の検証を含む)→ US-1 → US-4 → US-5 → US-6。
- OQ-2(在席ゲート)は US-2 AC-2.6 の検証で顕在化する — functional-design で実機確認(requirements の Open Questions を参照)。
