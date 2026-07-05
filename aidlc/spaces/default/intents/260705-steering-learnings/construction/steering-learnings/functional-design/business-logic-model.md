# Business Logic Model — steering-learnings

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更対象と構成（O-1 の確定）

変更対象は steering 2 ファイルと record 成果物 1 点である。

| 変更対象 | 変更内容 | 対応要求 |
|---|---|---|
| `aidlc/spaces/default/memory/team.md` | 並行運用ポリシー内に新節「多体連携の運用」を追加し、「根拠」表へ実例行を追記する。Git Branching Policy の branch 名の例へロール名 prefix を追記する | FR-1、FR-2 |
| `aidlc/spaces/default/memory/project.md` | Corrections へ HUMAN_TURN 中継 mint の前例を learned 形式 + cid で追記する。learnings triage の採用分で steering 反映が必要なものを追記する | FR-3、FR-4.3 |
| `construction/steering-learnings/code-generation/learnings-triage.md`（record 成果物） | 試行 record 5 ステージ memory.md 全エントリの採用・不採用と理由の一覧 | FR-4.1、FR-4.2 |

新節「多体連携の運用」の配置は、並行運用ポリシーの「ゲート承認の運用」の直後、「同一 worktree での直列化」の前とする。理由: 新節の内容（承認中継、質問プロトコル）は「ゲート承認の運用」の委任構造（Maintainer → 代理セッション → worker）を多体連携の実例で具体化するものであり、隣接させると判断の流れが読み手に自然につながるため。

見出しレベルは、新節を `## 多体連携の運用`（H2）とし、小見出し 4 つを `###`（H3）でネストする。並行運用ポリシー配下の既存 H2 節と同格で並べ、節内部の H3 は既存の「### #407 の判断項目と本節の対応」の前例に倣う。

新節の小見出し構成は次の 4 つとする。

| 小見出し | 内容 | 対応要求 |
|---|---|---|
| 適用条件 | 本体制はデフォルトではなく、チーム構成を取れる場合だけの働き方。既存の適用範囲注記（1 人の人間 + 複数エージェント）と両立 | FR-1.5 |
| エージェント固定 worktree | leader / engineer1〜3 のロール別固定 worktree の判断基準と、既存原則「worktree を Intent ごとに分ける」との関係の明文化 | FR-1.2 |
| 質問プロトコル | 技術系 = ピア協議可 / 承認系 = 人間エスカレーション、期限 15 分・回答 1 件成立、運用細目（先着 1 件で即確定しない、小さな構造判断は自己判断 + gate 確定、ピア回答も鵜呑みにせず事実確認する） | FR-1.3 |
| 承認中継 | 承認経路は一貫して人間 → leader → engineer。定型文 2 種（ディスパッチ・中継承認）の判断基準の要約と正への参照 | FR-1.4 |

### 既存原則との整合（「並行させる単位」との reconcile）

「並行させる単位」節の原則「並行は Intent 単位で行い、worktree を Intent ごとに分ける」と、多体連携の「ロール固定 worktree」は、次の関係で両立させる。この文言方針を新節「エージェント固定 worktree」小見出しに書く。

1. **変更作業が 1 Intent = 1 worktree に閉じる点は維持する。** Intent の変更作業（branch、成果物、steering 編集）は、ディスパッチされた担当 engineer の worktree 1 個の中だけで行う。試行 1 周（Issue #497）と本 Intent（Issue #502）の実例でも、変更は担当 engineer の worktree に閉じている。
2. **ロール固定は worktree の割り当て方の運用である。** Intent ごとに新しい worktree を切る代わりに、ロール（leader / engineer1〜3）の常設 worktree へ Intent をディスパッチで割り当てる。既存原則の例外ではなく、割り当て手段の具体化として位置づける。
3. **他ロールは対象 Intent のファイルを変更しない。** leader と他 engineer は自分の worktree からピア協議・承認中継・レビューで参加するだけであり、対象 Intent の worktree に対する並行編集は生じない（「同一 worktree での直列化」と矛盾しない）。

## Git Branching Policy への追記の具体化（FR-2）

追記位置は Git Branching Policy「Branch Lifecycle」内の「### branch 名」節とする。既存の包括規定「その他の Agent は、人間が識別できる短い lowercase prefix を使う」の具体例として、ロール軸の prefix を明記する。

1. 本文へ 1 段落を追加する: 多体連携の運用（並行運用ポリシーの同名節を参照）では、エージェント実装名（`codex/`、`claude/`）の代わりにロール名 prefix（`leader/`、`eng1/`〜`eng3/`）を使う。ロール名は agmsg のロールと worktree に対応し、人間がどのロールの作業か識別できる。
2. 既存の例ブロックの直後に、ロール名 prefix の例ブロックを追加する。実例は試行 1 周と本 Intent で実際に使われた branch 名（`eng1/issue-497-trial`、`eng2/issue-502-steering`）を使う。
3. エージェント実装軸（既存）とロール軸（追加）は置換ではなく並記とし、多体連携時はロール軸を選ぶという選択基準を 1 文で書く。

## code-generation 向け実行方針

本 Intent の code-generation は docs 系 refactor であり、次のとおり実行する。

1. 実装コード・テストコードは生成しない（C-1）。変更は steering 2 ファイルの編集と record 成果物 1 点の執筆である。
2. steering ファイル（team.md、project.md）は workspace の既存文書の編集であり、ステージ既定の「workspace へ書く」に適合する（前例: 260705-ledger-pr-docs の docs/amadeus/lifecycle/state.md 編集）。
3. learnings-triage.md は record dir（`construction/steering-learnings/code-generation/`）へ直接執筆する。ステージ既定の produces 2 件（code-generation-plan、code-summary）に 1 件を追加する意図的な逸脱であり、根拠はピア協議 Q2（triage は Construction 成果物に置く）である。
4. code-summary.md にこの構成（コード非生成、steering 編集 + record 成果物追加）を明記し、audit から追跡できるようにする。

## steering 反映の手順

1. 正（Issue #497 転記コメント、multi-agent-trial-record.md）を読み、判断基準として要約する。定型文テンプレート全文と実機確認の表は複製せず、正への参照で示す（C-2、ピア協議 Q3）。
2. 参照は 2 つを区別して示す: Issue #497 の転記コメント（試行規約の正）と、record 成果物 multi-agent-trial-record.md（定型文・実機確認の本体）。
3. 「根拠」表の実例行の証跡は Issue #497、PR #500、#497 コメント転記を含める（FR-1.6）。
4. 前 Intent の引き継ぎ（FR-3.2 = team.md 統合）の解消として、新節から前 Intent（PR #500、Intent 260705-agmsg-trial-docs）を参照する。完了済み record 側は書き換えない。

## learnings triage の手順

1. 母集団は試行 record の 5 ステージ memory.md（reverse-engineering、requirements-analysis、functional-design、code-generation、build-and-test）の全エントリとする（FR-4.1）。
2. 各エントリを次の基準で判定する: (a) 採用 = 今後の Intent でも使う判断基準として再利用価値がある、(b) 不採用（反映済み） = FR-1〜FR-3 の反映内容または既存 steering（Corrections、Testing Posture）と重複する、(c) 不採用（Issue 管理側） = 未解決バグ系（#498、#499、validator seam 差など）で C-6 に該当する、(d) 不採用（Intent 固有） = その Intent の実行文脈だけで意味を持ち、判断基準として一般化できない。
3. 判定と理由を learnings-triage.md の表に記録する（FR-4.2）。
4. 採用分だけを steering へ手動編集で反映する（FR-4.3）。Corrections への追記は learned 形式 + cid とし、cid は出所 stage 内で連番が衝突しない番号を選ぶ（ピア協議 Q4 + engineer3 補足）。
