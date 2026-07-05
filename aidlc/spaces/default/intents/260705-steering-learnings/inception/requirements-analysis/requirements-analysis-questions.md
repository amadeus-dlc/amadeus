# Requirements Analysis Questions：260705-steering-learnings

Intent: Issue #502（#497 試行 1 周の実績を根拠に、steering（team.md / project.md）へ多体連携の働き方を反映し、試行 Intent record の learnings 候補を精査して space memory へ persist する）。

回答方式: 本 Intent は多体連携の運用下にあるため、内容確認の質問はピア協議（leader + engineer1, 3 宛、期限 15 分・回答 1 件で成立）で回答する。各回答に回答者を明記する。

## Q1: team.md 並行運用ポリシーへの反映の形

多体連携（エージェント固定 worktree の判断基準、質問プロトコル、承認中継、適用条件）は、並行運用ポリシーのどこへ反映するか。

A. 並行運用ポリシー内に新節「多体連携の運用」を追加し、既存の「根拠」表へ試行実例（Issue #497、PR #500）の行を追記する
B. 既存節（並行させる単位、ゲート承認の運用など）へ分散して追記する（新節は作らない）
C. 新節だけを追加し、根拠表は変更しない
D. 並行運用ポリシーとは別の独立文書を team.md 内に新設する
X. Other (please specify)

[Answer]: A（ピア協議成立・回答 3 件で全員一致。回答者: leader=A、engineer1=A、engineer3=A（期限内の後続回答として採用材料に含めた）。採用判断: engineer2。補足の取り込み: 並行運用ポリシーの適用範囲注記（複数人チームは扱わない = 1 人の人間 + 複数エージェント）を新節側でも維持する（leader）。根拠表の実例行の証跡には PR #500 に加え #497 コメント転記 https://github.com/amadeus-dlc/amadeus/issues/497#issuecomment-4886584459 も含める（engineer1））

## Q2: learnings 候補の採用・不採用の記録先

試行 Intent record の各ステージ memory.md にある learnings 候補（計 10 件前後）の精査結果（採用・不採用と理由）は、どこに記録するか。

A. 本 Intent record の Construction 成果物（learnings-triage.md）に理由付き一覧を置き、採用分だけを steering（team.md / project.md）へ反映する
B. 全候補を project.md の Corrections へ追記する（不採用の概念を作らない）
C. 採用・不採用は audit の decision だけで記録し、成果物ファイルは作らない
D. 精査結果は Issue #502 のコメントへ記録する
X. Other (please specify)

[Answer]: A（ピア協議成立・全員一致。回答者: leader、engineer1、engineer3。採用判断: engineer2。受け入れ条件「採用・不採用が理由付きで記録」を Construction 成果物 learnings-triage.md で満たし、Corrections の肥大化を避ける）

## Q3: 正を複製しない「要約統合」の粒度

承認要旨は「正（Issue #497 の転記コメントと multi-agent-trial-record.md）は複製せず判断基準として要約統合する」とする。steering への反映はどの粒度で書くか。

A. 判断基準（いつ・何を・誰が判断するか）として要約し、定型文テンプレート全文や実機確認の表は複製せず、正への参照（Issue #497 転記コメント、Intent record の multi-agent-trial-record.md）で示す
B. 定型文テンプレート全文も team.md へ転記する（参照切れを避けるため）
C. 項目名の列挙だけにとどめ、内容はすべて参照で示す
X. Other (please specify)

[Answer]: A（ピア協議成立・全員一致。回答者: leader、engineer1、engineer3。採用判断: engineer2。参照先は Issue #497 の転記コメント（試行規約の正）と record 成果物 multi-agent-trial-record.md（定型文・実機確認の本体）の 2 つを区別して示す。前 Intent の FR-3.2/FR-4.2 の引き継ぎの解消として書き、traceability を接続する（engineer1 補足））

## Q4: learnings persist の実行手段

採用分の space memory への persist は、どの手段で行うか。

A. steering ファイル（team.md / project.md）の手動編集として本 Intent の docs 変更に含める。project.md Corrections は既存の形式（learned 日付 + cid コメント）に合わせる
B. amadeus-learnings.ts persist ツールを試行 Intent record（260705-agmsg-trial-docs）に向けて実行する
C. persist は行わず、triage 記録だけを残す
X. Other (please specify)

[Answer]: A（ピア協議成立・全員一致。回答者: leader、engineer1、engineer3。採用判断: engineer2。amadeus-learnings.ts persist は active Intent の stage diary 用で、完了済み他 Intent record には適用外（engineer1 の試行時の観察と、engineer3 の実装裏取り amadeus-learnings.ts:233-470 = cid・audit の帰属が壊れる、の両方で確認）。Corrections の cid マーカーは既存の cid:<stage>:<cN> 形式に合わせ、出所 stage 内で連番が衝突しない番号を選ぶ（engineer3 補足）。Corrections への追記は learned 形式 + cid コメントを踏襲する。スコープ注意（engineer1）: 未解決バグ系（#498、#499、validator seam 差、完了済み Intent への hook 追記）は Issue 管理側とし、steering へは観察済み実例に根拠がある判断基準だけを反映する）
