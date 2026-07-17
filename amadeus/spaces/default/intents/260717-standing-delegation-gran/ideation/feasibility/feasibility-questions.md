# Feasibility — 明確化質問(260717-standing-delegation-gran)

<!-- E-OC1 判定証跡(eoc1-evidence-in-questions-header):
判定: 全4問 選挙不要(design 段送り or 既決様式導出)— 各問の根拠種別は下記1問1行。
申告: e4 → leader(agmsg 送信 2026-07-17T01:5xZ — agmsg 一次記録)
leader 承認: 2026-07-17T01:50:14Z(agmsg 一次記録 — agmsg-git-evidence-split に基づく出典明示)
回答の記入は leader 承認受領後にのみ行う。 -->

上流入力(consumes 全数): `../intent-capture/intent-statement.md`

## FQ1: グラントの保存・配送形態はどれか

- A: issuer(leader)シャードの audit 行方式(verifyDelegatedProvenance 同族の実在照合、配送は既存 checkpoint/cherry-pick 流路)
- B: 専用ファイル(workspace 内 or gitignored ローカル)
- X: その他

[Answer]: A 最有力の比較を design へ送付 — design 段選挙送り(leader 承認 2026-07-17T01:50:14Z)
根拠種別: design 段選挙送り — 実装機構の選択(P1)。feasibility は A 最有力の実測比較まで(assessment 記載)

## FQ2: 撤回の伝播モデル(取込前ツリーの時間差)の扱いは

- A: delegate と同じ結果整合として明文化+TTL を上限とする
- B: 受理時に issuer シャードの最新 fetch を強制
- X: その他

[Answer]: design 段選挙送り(leader 承認 2026-07-17T01:50:14Z)
根拠種別: design 段選挙送り — R-3 の設計判断(fetch 強制はオフライン耐性とトレードオフ)

## FQ3: TTL の定義様式は

- A: named const+env override(DEFAULT_LOCK_STALE_MS amadeus-lib.ts:3629-3632 の既習様式に倣う。引用の意味論照合 = citation-semantics-check を design で実施)
- B: ハードコード単値
- X: その他

[Answer]: A — 既決様式導出(constants-from-code、leader 承認 2026-07-17T01:50:14Z)
根拠種別: 既決様式導出(constants-from-code)+具体値は design 確定 — IC Q2 裁定の継承

## FQ4: session 終了時のグラント失効(選択制)は

- A: design 段の選挙で採否確定(IC Q4 の留保を継続保存)
- B: ここで確定する
- X: その他

[Answer]: A — 留保保存継続(leader 承認 2026-07-17T01:50:14Z)
根拠種別: 留保保存の継続(citation-reservation-preservation — IC Q4 裁定どおり design へ)
