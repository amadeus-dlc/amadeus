# Requirements Analysis 質問

Intent: 260705-parallel-policy-docs（Bolt worktree 実行契約と並行運用 policy の整理・補強）
対象 Issue: [#407](https://github.com/amadeus-dlc/amadeus/issues/407)、[#342](https://github.com/amadeus-dlc/amadeus/issues/342)
回答方式: Maintainer の包括委任（2026-07-05「このあとの進め方はあなたに任せます」）に基づく推奨案の自己回答。判断根拠を各回答に付す。

---

## Q1. #407 の Intent worktree × Bolt worktree の関係をどう明文化するか

- A. Issue の候補 1 を採用する: Intent worktree を外側の隔離単位（並行運用ポリシーの単位）、Bolt worktree を Construction 内の実行隔離（エンジンの amadeus-bolt fork/merge 機構）として両方使う関係を明文化する（推奨）
- B. 候補 2: Intent worktree だけを実行隔離とし、Bolt は記録単位に限定する
- C. 候補 3: 本家の aidlc-worktree.ts 相当を新規実装する
- X. Other

[Answer]: A（自己回答。根拠: 現行エンジンに amadeus-bolt start --worktree と fragment fork/merge、STATE_FORKED/AUDIT_FORKED 等のイベントが既に実装されており、候補 1 が実装と一致する。候補 3 は新規実装で docs Intent の範囲外、候補 2 は既存エンジン機構の否定になる）

---

## Q2. #342 の弱点 1（walking skeleton 相当の不在）をどう扱うか

- A. 現行エンジンで実装済み（gate: "unresolved" の stance 分類、ladder prompt、AUTONOMY_MODE_SET）であることを確認し、#342 の記述とのズレを「実装済み」として文書整合で閉じる（推奨）
- B. 追加の契約変更を提案する
- X. Other

[Answer]: A（自己回答。根拠: 2026-07-05 の Intent 260705-hooks-state-bugfix で walking-skeleton stance 分類と ladder 相当の autonomy 選択を実運用で通過済み。stage-protocol.md に Ladder prompt が明文化されている）

---

## Q3. #342 の弱点 2（Bolt 切り直し手順の未明文化）をどう扱うか

- A. 並行運用ポリシーではなく construction phase memory（aidlc/spaces/default/memory/phases/construction.md）へ、halt-and-ask から delivery-planning 再実行（backward jump）に至る切り直し手順を短く明文化する（推奨）
- B. docs/amadeus/lifecycle/ の恒久文書に書く
- C. 運用実績が無いため未確定のまま残す
- X. Other

[Answer]: A（自己回答。根拠: 切り直しは自己開発の働き方に属し、phase memory が rules_in_context として Construction stage に自動ロードされる。恒久文書化は運用実績が積まれてからで良い。#342 自身が「頻度の証拠がない」と認めており、重い契約化は時期尚早）

---

## Q4. 2026-07-05 の並行運用実例を並行運用ポリシーの根拠表へ追記するか

- A. 追記する: (a) primary checkout の占有と解放の調整（Intent 単位並行の worktree 占有通知）、(b) 完了済み workflow への hooks 誤動作と修正（#476/#479）、(c) 意味的接触（ファイル非接触でも文書と実装の乖離が起きる）の申し送り、(d) 指示系統の委任（Maintainer→代理→worker）による並行統制（推奨）
- B. 追記しない
- X. Other

[Answer]: A（自己回答。根拠: 並行運用ポリシー自身が「観察済みの実例に根拠がある範囲だけを扱い、新しい実例が観察された場合は実例の根拠付きで判断基準を更新する」と定めている。4 件とも本日の実 PR / audit / agmsg 履歴で追跡可能）
