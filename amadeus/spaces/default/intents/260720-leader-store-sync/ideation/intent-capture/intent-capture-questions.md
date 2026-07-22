# Intent Capture — 明確化質問(260720-leader-store-sync)

<!-- E-OC1 選挙不要判定ヘッダ -->
> **選挙不要判定(E-OC1)**: 全3問を選挙不要と判定する(根拠種別は各問の判定行 — いずれも leader ディスパッチ 2026-07-20T02:47:35Z の既決事項・Issue #1281 本文の実測事実からの導出)。真に未決の設計判断(方式 A/B/C の確定)は本ステージで問わず、requirements 段の選挙事項として intent-statement 前提節に固定済み(intent-capture:c1 — 事前裁定済み intent は未決のみ質問)。
> 判定申告: 2026-07-20T02:47Z 頃 leader へ agmsg 送信。leader 承認: 2026-07-20T02:49:41Z(agmsg タイムスタンプ、全3問の根拠種別妥当と承認)

上流入力(consumes 全数): (本ステージは consumes 宣言なし — 各問の根拠は Issue #1281 本文と leader ディスパッチ)

## Q1: 解決する問題は何か?

- 判定: 選挙不要 — Issue #1281 本文の実測(51本中40本滞留・531ファイル)と機序(運搬車の構造的不在)が既決事実
- A. leader 所有物(選挙 store・シャード・norm 差分)に main への運搬経路が構造的に無い
X. Other (please specify)

[Answer]: A(E-OC1 選挙不要判定 — leader 承認 2026-07-20T02:49:41Z)

## Q2: スコープ境界(何を扱い、何を扱わないか)?

- 判定: 選挙不要 — leader ディスパッチ (4)(5) の既決(実装面 = scripts/+ノルム面、E-PM10A 焼き込み、engine 面・election CLI 面は他 intent 管轄)
- A. 扱う: leader 所有物の抽出・除外規則の機械化+運用ノルム。扱わない: engine 変更(e1 管轄)・election CLI 変更(e2/e4 管轄)・配布フレームワークへの持ち込み(gh-scripts-boundary)
X. Other (please specify)

[Answer]: A(E-OC1 選挙不要判定 — leader 承認 2026-07-20T02:49:41Z)

## Q3: 方式(A 定期ノルム / B advisory / C 生成機械化)はどこで確定するか?

- 判定: 選挙不要 — leader ディスパッチ (3) の既決(本ステージでは確定せず、クロスレビュー見立てを起点に requirements で選挙)
- A. requirements 段の選挙で確定(e1 見立て: A 即応→C 恒久 / e2 見立て: C は E-PM10A 準拠前提、を候補起点にする)
X. Other (please specify)

[Answer]: A(E-OC1 選挙不要判定 — leader 承認 2026-07-20T02:49:41Z)
