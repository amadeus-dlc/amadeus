# Requirements Analysis 質問

Intent: 260705-hooks-state-bugfix（hooks と engine state のバグ修正バッチ）
対象 Issue: [#464](https://github.com/amadeus-dlc/amadeus/issues/464)（PHASE_VERIFIED 後の Phase Progress 未更新）、[#476](https://github.com/amadeus-dlc/amadeus/issues/476)（hooks の並行セッション・完了済み workflow 誤動作 4 症状）

各質問の `[Answer]:` に選択肢の記号または自由記述を記入する。

---

## Q1. #464 の 2 層目（phase-check 成果物の欠落）をどう扱うか

#464 には 2 層ある。(1) PHASE_VERIFIED 発生時に Phase Progress フィールドが Verified へ更新されない、(2) validator が Verified な phase に要求する `verification/phase-check-<phase>.md` が通常フローで生成されない。(1) は機械的更新で確定だが、(2) は「誰が作るか」の設計判断が要る。

- A. エンジンの phase 境界処理が conductor へ phase-check 作成を要求する（produces と同様、成果物不在なら phase 境界の完了を拒否する。生成は conductor の knowledge work のまま）（推奨）
- B. エンジンが phase-check 成果物の骨格を自動生成し、conductor が内容を埋める
- C. validator 側の要求を実フローに合わせて緩める（Verified でも phase-check を必須にせず、存在する場合だけ検査する）
- D. (2) は本 Intent の対象外とし、(1) の Phase Progress 更新だけ修正する（phase-check は後続 Issue へ）
- X. Other (please specify)

[Answer]: A
---

## Q2. #476 の stop hook のセッション所有権判定を何で行うか

stop hook が「このセッションが engage した workflow」だけを督促するための、session→intent 対応の正とするデータを決める。

- A. `.aidlc-sessions/<session-id>` ファイル（既存の session→intent UUID 対応）を正とし、自セッションの対応が現 cursor の intent と一致する場合だけ督促する（推奨）
- B. transcript 内の engine 呼び出し痕跡から所有を推定する（現行の engagement 判定を拡張）
- C. A と B の両方を満たす場合だけ督促する
- X. Other (please specify)

[Answer]: A
---

## Q3. mint-presence の skip 条件（完了済み Intent への HUMAN_TURN 抑止）を何で判定するか

- A. registry（intents.json）の該当 entry の status が complete 系なら mint を skip する（registry が正準台帳）（推奨）
- B. 対象 Intent の aidlc-state.md の Status: Completed を読む
- C. audit shard の WORKFLOW_COMPLETED イベント有無を確認する
- X. Other (please specify)

[Answer]: A
---

## Q4. stop hook の解放ガード（他セッションの進捗で延命される問題）の扱い

- A. Q2 の所有権判定で督促対象自体を絞れば延命問題は実質解消するため、ガードの signature 変更は最小限（現行維持＋所有権判定の追加）に留める（推奨）
- B. signature を「自セッション由来の進捗」だけで計算するよう作り替える
- C. ガード上限を時間ベース（例: 初回 block から N 分で必ず解放）へ変更する
- X. Other (please specify)

[Answer]: A