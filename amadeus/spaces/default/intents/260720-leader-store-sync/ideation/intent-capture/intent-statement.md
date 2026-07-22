# Intent Statement — 260720-leader-store-sync(Issue #1281)

上流入力(consumes 全数): (本ステージは consumes 宣言なし — 入力は Issue #1281 本文・leader ディスパッチ 2026-07-20T02:47:35Z・クロスレビュー見立て)

## Problem Statement

leader 所有の成果物(選挙 store・監査シャード・PM persist 前の norm 差分)には main への**運搬車が構造的に存在しない**。member intent の record-sync は intent 完了イベントに紐づくが、leader はワークフローを持たないため終端イベントがなく、persist を伴わない選挙(0件確認・clarification)の record は norm PR に同乗した分しか main へ届かない。実測: 2026-07-20 のユーザー指摘棚卸しで選挙 store 51本中 40本・シャード・norm 差分が滞留(leader ブランチ vs origin/main で 531 ファイル、是正 = PR #1280)。

監査の一次記録(HUMAN_TURN / GRANT_ISSUED / DELEGATED_APPROVAL)が長時間 main 外に滞留するのは記録整合性リスクであり、チームの P2(記録と検証は実測事実のみを根拠にする)の基盤を弱める。

## Target Customer

- **leader**(直接): sync 漏れの検知・PR 作成の手作業と認知負荷を除去。
- **チーム全員・将来の監査者**(間接): main を読むだけで選挙裁定・delegate provenance の全量に到達できる。
- **クロスレビュー当事者**(間接): 選挙 record の main 実在により verdict 裏取りが leader worktree 参照なしで可能になる。

## Success Metrics

- leader 所有物の main 未反映滞留が「定義された同期契機」以内に収まる(#1280 級の 531 ファイル一括是正が再発しない)。
- sync PR の生成が機械化され、抽出対象(elections/ 全量+leader 自クローンシャード)と除外(メンバー intent snapshot・memory 層の巻き戻し = E-PM10A)が決定的に導出される。
- 生成 PR がレビュー観点(純追加性・parse・マーカー・E-PM10A 準拠)を機械自己検査した状態で発行される。

## Trigger

2026-07-20 ユーザー指摘(tech debt / 記録整合性)— #1280 の一括是正で顕在化した構造ギャップの恒久化。

## 前提(ディスパッチ・クロスレビューの既決)

- 方式の対応案 A(定期 sync ノルム)/ B(advisory)/ C(生成機械化)は **requirements 段の選挙で確定**(leader 指令 (3)。クロスレビュー見立て: e1 = A を即応ノルム→C を恒久 / e2 = C は E-PM10A 準拠が前提条件)。
- E-PM10A の除外規則(メンバー snapshot 非同乗・memory 層 main 復元)は機械化要件へ焼き込み(指令 (5))。
- 実装面は scripts/(repo ローカル tool、gh-scripts-boundary 内)+ノルム面。e1(engine 面)/e2・e4(election CLI 面)と静的非交差見込み — 着手前に目録確認(指令 (4))。
