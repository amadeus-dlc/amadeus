# Requirements：260705-steering-learnings

## Intent 分析

### 目的

Issue #502（多体連携の試行実績を steering へ反映し learnings を persist する）を実施する。達成したい状態は次の 3 点である。

1. `aidlc/spaces/default/memory/team.md` と `project.md` が、試行 1 周（Issue #497、Intent 260705-agmsg-trial-docs、PR #500）の観察済み実例を根拠として、多体連携の働き方を判断基準として持っている。
2. 試行 Intent record の各ステージ memory.md にある learnings 候補の採用・不採用が、理由付きで記録されている。
3. 前 Intent が引き継いだ 2 件のうち「team.md（steering）への統合は後続 Intent で行う」（前 Intent FR-3.2）が解消されている。もう 1 件の「Issue #497 コメントへの転記は leader が行う」（前 Intent FR-4.2）は、leader による転記コメントの実施（2026-07-05）をもって解消済みであり、本 Intent はその転記コメントを正として参照する。

### 上流の位置づけ

- 試行規約の正は Issue #497 であり、確定内容は leader による転記コメント（https://github.com/amadeus-dlc/amadeus/issues/497#issuecomment-4886584459 ）に集約されている。定型文・実機確認の本体は merge 済み record 成果物 `aidlc/spaces/default/intents/260705-agmsg-trial-docs/construction/agmsg-trial-docs/code-generation/multi-agent-trial-record.md` にある。本 Intent はこの 2 つを正として参照し、複製しない。
- intent-statement と scope-document は scope（refactor）により SKIP のため存在せず、Issue #502 とディスパッチ定型文（state-init 宛 DECISION_RECORDED に転記済み）が上流入力を代替する。
- コードベース知識は既存の `aidlc/spaces/default/codekb/amadeus/`（business-overview、architecture、code-structure ほか。PR #496 で全面更新済み、reverse-engineering ステージで採用済み）を参照する。
- チームの働き方（team-practices 相当）は `aidlc/spaces/default/memory/team.md` の並行運用ポリシーと Git Branching Policy であり、本 Intent の変更対象そのものである。

## 機能要求

### FR-1: team.md 並行運用ポリシーへの多体連携の反映

- FR-1.1: 並行運用ポリシー内に新節「多体連携の運用」を追加する（ピア協議 Q1 = A）。
- FR-1.2: 新節は、エージェント固定 worktree（leader / engineer1〜3）の判断基準を含む。
- FR-1.3: 新節は、質問プロトコル（技術的な内容確認 = ピア協議可、承認系 = 人間へエスカレーション。期限 15 分・回答 1 件で成立）を含む。試行で観察された運用細目（先着 1 件で即確定せず期限内の後続回答も採用材料に含める、小さな構造判断は担当 engineer の自己判断 + gate 確定）も判断基準として含める。
- FR-1.4: 新節は、承認中継（承認経路は一貫して人間 → leader → engineer。ディスパッチ定型文・中継承認定型文の 2 種）を判断基準として要約し、定型文の本体は正への参照で示す（ピア協議 Q3 = A）。
- FR-1.5: 新節の冒頭で適用条件（本体制はデフォルトではなく、チーム構成を取れる場合だけの働き方）を明示する。並行運用ポリシー既存の適用範囲注記（複数人チームは扱わない = 1 人の人間 + 複数エージェント）と両立する形で書く。
- FR-1.6: 既存の「根拠」表へ、多体連携の判断基準に対応する実例行を追記する。証跡は Issue #497、PR #500、#497 転記コメントを含める。

### FR-2: team.md Git Branching Policy へのロール名 prefix 例の追記

- FR-2.1: branch 名規約の例へ、ロール名 prefix（`leader/`、`eng1/`〜`eng3/`）の実例を追記する。既存の Agent prefix 規定（Codex = `codex/`、Claude = `claude/`）と矛盾しない位置づけ（多体連携時のロール識別）で書く。

### FR-3: project.md Corrections への HUMAN_TURN 中継 mint 前例の追記

- FR-3.1: HUMAN_TURN の mint 規律（中継承認定型文の受信直後に限り mint する。ピア協議の回答受信では mint しない）を、既存 Corrections の形式（learned 日付 + cid コメント）で追記する。

### FR-4: learnings 候補の精査と persist

- FR-4.1: 精査の母集団は、試行 Intent record の 5 ステージ memory.md（reverse-engineering、requirements-analysis、functional-design、code-generation、build-and-test）の全エントリとする。
- FR-4.2: 採用・不採用と理由を、本 Intent record の Construction 成果物 `learnings-triage.md` に一覧で記録する（ピア協議 Q2 = A）。
- FR-4.3: 採用分だけを steering（team.md / project.md）へ手動編集で反映する（ピア協議 Q4 = A）。FR-1〜FR-3 で反映済みの内容と重複する候補は「FR-n で反映済み」を理由に個別追記しない。
- FR-4.4: 既存 steering（project.md Corrections、Testing Posture）に persist 済みの候補は「反映済み」を理由に不採用とする。

## 非機能要求

- NFR-1: 成果物と steering 変更は日本語で書き、`japanese-tech-writing` skill の規範に従う。機械可読ラベルは英語のまま使う。
- NFR-2: 各成果物文書は required-sections sensor（H2 見出し 2 個以上）を満たす。
- NFR-3: 事実の記述は出典（Issue、PR、audit イベント、record path）を明示し、未確認の値は `未確認` と書く（Grounding）。
- NFR-4: PR 作成前に対象 Intent の validator（`AmadeusValidator.ts`）と `npm run test:all` を実行し、結果を記録する（Issue #502 受け入れ条件との 1:1 対応）。

## 制約

- C-1: scope は refactor（docs 系）であり、実装コードとテストコードの変更を含まない。`codekb/amadeus/` も変更しない。
- C-2: 正（Issue #497 の転記コメントと multi-agent-trial-record.md）は複製せず、判断基準として要約統合する（承認要旨、確定判断 12）。
- C-3: Bolt は直列実行とし、PR の merge は人間が行う。
- C-4: 承認系の判断は leader 経由で人間へエスカレーションし、HUMAN_TURN は中継承認定型文の受信直後だけ mint する（#497 確定判断 6・8）。
- C-5: steering へ反映する判断基準は、試行 1 周で観察された実例に根拠がある範囲に限定する（並行運用ポリシーの原則）。
- C-6: 試行で検出した未解決バグ系（Issue #498、Issue #499、validator seam 差、完了済み Intent への hook 追記 = Issue #476 系）は Issue 管理側で扱い、steering へは反映しない（ピア協議 Q4 のスコープ注意）。

## 前提

- A-1: 正として参照する 2 つ（#497 転記コメント、multi-agent-trial-record.md）は、いずれも merge 済み（PR #500）または leader 実施済みで参照可能である。
- A-2: 試行 1 周（4 体構成の実働、gate 承認中継 4 回、ピア協議 2 回、PR #500 merge）は、steering の「観察済みの実例」の根拠として足りる。これは Maintainer の Intent 承認（承認要旨）で確認済みである。

## スコープ外

- agmsg 自体の機能改善（Monitor 通知の切り詰め・配信遅延への対処）。
- Issue #498（codekb path の worktree 名漏れ）、Issue #499（docs 系 refactor の code-generation ガード衝突）、validator seam 差（エンジン glob と record 内検査の不一致）の修正。
- 定型文そのものの改版（正は Issue #497 側で管理する）。
- 本 Intent record 以外の Intent record への変更。

## 未解決事項

- O-1: 新節「多体連携の運用」の並行運用ポリシー内での配置（節順）と小見出し構成は functional-design で確定する。
- O-2: learnings triage の採用境界（borderline 候補の扱い）は triage 成果物の作成時に判断し、gate の人間承認で確定する。
