# Requirements Analysis — 明確化質問(260717-standing-delegation-gran)

<!-- 判定証跡(eoc1-evidence-in-questions-header):
判定: 全4問 選挙必要(真に未決の設計判断 — FS FQ1/FQ2/FQ4 の受け皿+TTL 既定値。P1 により単独決定禁止)
選挙: E-SDG-RA として leader へ配信依頼(agmsg 一次記録)
裁定受領: E-SDG-RA 開票 2026-07-17T03:18:17Z — 全問 A(e1/e2 全問 GoA 1・e3 Q1-Q3 GoA 1(Q4 後着記録)+提案側、全問 3/4 以上。agmsg 一次記録 — agmsg-git-evidence-split に基づく出典明示)
回答の記入は選挙裁定の受領後にのみ行う(election-answer-after-ruling)。 -->

上流入力(consumes 全数): `../../ideation/intent-capture/intent-statement.md`、`../../ideation/scope-definition/scope-document.md`、`../../ideation/feasibility/constraint-register.md`、codekb `code-structure.md`(delegate provenance 観測節)・`architecture.md`・`business-overview.md`(いずれも本日 RE 現況、Q1 前提の配置・運用文脈)、`../practices-discovery/team-practices.md`

## 選挙対象の宣言(1問1行)

- Q1: 選挙必要 — グラントの保存・配送形態(FS FQ1 の受け皿)
- Q2: 選挙必要 — 撤回の伝播モデル(FS FQ2 の受け皿)
- Q3: 選挙必要 — session 終了失効の採否(FS FQ4/IC Q4 の受け皿)
- Q4: 選挙必要 — TTL 既定値(意味論対照の named constant が不在のため値は新規決定)

## 追補: E-SDG-RA2(phase-boundary 除外可否)

裁定: C(既定除外+発行時 opt-in フラグ)— 2026-07-17T03:28:21Z 開票、e3/e1/e2 各 GoA 2 の 3/4(起草者 e4 推奨 B は開票後公開・非採用)。留保3件は requirements.md AC-4f へ転記済み。票タイムライン: 配信 03:24Z 頃 → e3 03:25:25Z → e1 03:25:54Z → e2 03:27:58Z → 開票 03:28Z(agmsg 一次記録)。

## Q1: グラントの保存・配送形態は?

前提実測(codekb 観測節/scan-notes): DELEGATED_APPROVAL は発行者シャードの audit 行で、受理側は `verifyDelegatedProvenance`(lib:2528)が issuer シャード内の行実在+HUMAN_TURN 実在を照合。配送は leader の checkpoint コミット→conductor cherry-pick の既存流路。

- A. **発行者シャードの audit 行方式** — GRANT_ISSUED/GRANT_REVOKED を issuer シャードに置き、受理検証は verifyDelegatedProvenance 同族の実在照合。配送は既存 checkpoint/cherry-pick 流路(per-gate 配送が per-grant 1回に減る)
- B. 専用ファイル(workspace 内 git 管理)— 新しい台帳形式・衝突面が増える
- C. 機械ローカルファイル(gitignored)— worktree 間で共有されず、チームモードの複数 conductor に届かない
- X. その他

[Answer]: A(E-SDG-RA 裁定 — e2 の C への 8 は反証根拠「worktree 間配送実績は共有シャードのみ」付き)

## Q2: 撤回の伝播モデル(取込前ツリーの時間差)は?

前提実測: delegate 配送は結果整合(fetch/cherry-pick 前のツリーは旧状態)。GRANT_REVOKED 行も同じ流路なら、撤回後〜取込前の窓で旧グラントが verify されうる。

- A. **delegate と同じ結果整合として明文化+TTL を上限とする** — 撤回の即時性は「leader が撤回を発行し配送を依頼する」運用(agmsg 通知)で補い、機構は結果整合。実装最小・オフライン耐性維持
- B. 受理時に issuer シャードの origin 最新 fetch を強制 — 即時性は上がるがネットワーク依存を検証パスに持ち込む(オフラインで受理不能)
- X. その他

[Answer]: A(E-SDG-RA 裁定)

## Q3: session 終了時のグラント失効(選択制)の採否は?

前提実測: engine に「発行セッションの終了」を跨いで検知する既存機構はない(セッションは per-clone runtime で、シャードはセッション非依存の永続記録)。実装するなら発行セッション id の記録+受理時の生存判定という新規機構が要る。

- A. **採らない(TTL+明示 revoke のみ)** — セッション生存判定の新規機構は複雑度に対し増分価値が薄い(TTL が上限を画す)。#1125 の「session 終了失効(選択制)」は不採用として ADR に根拠を記録
- B. 採る(発行セッション終了で自動失効)— 新規の生存判定機構を design で設計
- X. その他

[Answer]: A(E-SDG-RA 裁定 — 不採用根拠を ADR 化すること)

## Q4: TTL 既定値は?

前提実測: 意味論の対照になる既存 named constant は不在(DEFAULT_LOCK_STALE_MS=10分 はロック鮮度で意味論が異なる — 引用の意味論適合 citation-semantics-check により流用不可)。#1125 の停滞実測はユーザー不在窓 = 数十分〜数時間規模。日次運用(就寝跨ぎ)を1グラントで覆うかは統制強度の選択。

- A. **4時間** — 作業セッション1回分を覆い、就寝跨ぎは再発行を要求(統制寄り)
- B. 24時間 — 就寝跨ぎも1グラントで覆う(利便寄り、P4 の露出窓は大きい)
- C. 1時間 — 最小露出(再発行頻度が高く停滞解消効果が薄まる)
- X. その他

[Answer]: A = 4時間(E-SDG-RA 裁定 — 根拠: #1125 停滞実測との適合+統制思想)
