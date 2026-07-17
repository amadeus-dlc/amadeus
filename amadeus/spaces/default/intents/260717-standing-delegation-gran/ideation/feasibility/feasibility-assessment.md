# Feasibility Assessment — standing-delegation-grant(Issue #1125)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(成功基準1〜7・Out of Scope)

## 判定: GO(確信度: 高)

実装面の全 seam を実ツール(grep/実読)で実測済み。新規外部依存なし・既存 provenance 機構の対称拡張で構成できる。

## 実測根拠(2026-07-17、測定 ref: 本ブランチ HEAD = origin/main 637255b3e 取込後)

| 面 | 実測 | 帰結 |
|---|---|---|
| 受理側 seam | `humanActedSinceGate`(amadeus-lib.ts:2479)+ `verifyDelegatedProvenance`(:2528)— 判別は verb-scoped、検証は issuer シャード内 HUMAN_TURN 実在照合(パス走査ガード付き) | グラント受理は同族の第2分岐として挿入可能 — 検証様式(issuer シャード行の実在照合)を verbatim 対照にできる |
| 発行側 seam | `handleDelegateApproval` の接地ゲート(amadeus-state.ts:1975-1980)— 実 HUMAN_TURN なしは refuse | grant 発行 verb は同じ接地ゲート様式で fail-closed にできる |
| HUMAN_TURN 偽造耐性 | `amadeus-audit append` 入口で HUMAN_TURN mint 拒否(state.ts:1951-1956 コメント+audit 実装) | グラント発行の根拠 HUMAN_TURN は従来どおり偽造不能 — P4 の根が保たれる |
| チームモード判定 | `AMADEUS_OPERATING_MODE` は packages/framework/core/ で **0 ヒット(TS 初読取になる)**。env 読取の既存前例 = `humanPresenceGuardDisabled`(lib:3392)等 | ユーザー要件(env 唯一判定・fail-closed)は新規 env read 1点で実装可能 — 前例様式あり |
| TTL 定数様式 | `DEFAULT_LOCK_STALE_MS = 10 * 60 * 1000`(lib:3629)+ env override(:3632)の named const 様式実在 | constants-from-code の対照実在 — TTL は同様式で design 確定(数値の発明不要) |
| phase-boundary 識別 | phase-check ガード(state.ts:125-160)が phase 閉包ステージを機械識別済み | 既定除外(phase-boundary)は既存分類の再利用で実装可能 |
| walking-skeleton 識別 | `set-skeleton-stance` verb+Skeleton Stance 状態フィールド(state.ts:374/:538-540) | 既定除外(skeleton ゲート)は状態メタデータで識別可能(具体判定は design) |
| PR マージ除外 | engine に PR マージの verb/gate は不在(approve/delegate 系のみ)— 構造外 | 除外1(no-AI-merge)は**構造的に充足**(グラントが触れるコード経路が存在しない) |
| 監査 | amadeus-audit.ts はイベント名 allowlist 制 — GRANT_ISSUED/GRANT_REVOKED は taxonomy+knowledge/amadeus-shared/audit-format.md への追加が必要 | 追加面は既知・小 |
| doctor | `amadeus-utility.ts doctor` 実在(:190) | 有効グラント可視化の受け皿あり |

## 実現形の見立て(design への引き継ぎ)

- グラントは**発行者(leader)シャードの audit 行**として表現し、受理検証は verifyDelegatedProvenance と同族の「発行行実在+根拠 HUMAN_TURN 実在+scope/TTL/未撤回/チームモードの全 AND」で fail-closed 判定する案が最有力(配送は既存 checkpoint/cherry-pick 流路を再利用 — **per-gate 配送が per-grant 配送に減る**ことが停滞解消の実体)。専用ファイル案との比較は design 選挙(FQ1)。
- 撤回の伝播は delegate と同じ結果整合(取込前ツリーの時間差)— 扱いは design 選挙(FQ2)。

## 前提条件(仮説として明示)

- 「1回のグラント発行で複数ゲートが通る」ことが停滞3波クラスの解消に十分、は #1125 実測(3波とも同一ユーザー不在窓)に基づく仮説 — TTL 窓内のゲート数実測は着地後 FR-7 相当の運用観測で確認する。
