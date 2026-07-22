# ドメイン用語集(Ubiquitous Language)

このプロジェクトで使う用語の正本。Tier 2 Team Knowledge(`amadeus/spaces/<space>/knowledge/amadeus-shared/`)として全エージェントのステージ実行コンテキストに自動ロードされる。

## 運用ルール

- **正本は1箇所**: フレームワーク用語の定義正本は `docs/guide/glossary.md`(英)/ `docs/guide/glossary.ja.md`(日)。本ファイルはそれらを再定義せず、チーム固有の用語と表記の決定だけを持つ。既存正本にある用語はポインタで参照する。
- **意見を持つ**: 同じ概念に複数の呼び名があるときは1つを正とし、他を「避ける表記」に列挙する。ただし表記の裁定はノルムに従い選挙(またはユーザー裁定)で決め、本ファイルが独断で新しい規範を作らない。未裁定の揺れは「_表記ゆれ(未裁定)_」として記録する。
- **定義は短く**: 1〜2文。何であるかを書き、実装詳細は書かない。
- **確定した時点で書く**: 用語が結晶化するのはステージ作業中(requirements-analysis の語彙固定、functional-design の domain-entities 等)。確定したらためずにその場で本ファイルへ反映する。
- **提案語彙は登録しない**: Issue・設計提案・議論の段階で導入された語彙は「提案語彙」であり、本ファイルには登録しない。登録できるのは、(a) ステージ成果物(requirements / application-design / functional-design 等)のレビュー承認で確定した用語、(b) 選挙またはユーザー裁定で確定した用語、のいずれかのみ。提案語彙は出どころ(Issue 番号・intent record)の側で管理し、確定した時点で出典付きで本ファイルへ移す。
- **出典を残す**: 定義が選挙・裁定・成果物に由来する場合は出典(cid・E-code・file:line)を併記する。

## 用語(プロジェクトドメイン・確定分)

**ライフサイクルレコード**:
Space 配下で「生まれて・状態が変わって・完了する」記録単位の総称(Intent と選挙の上位概念)。コード識別子は lifecycleRecord。(ユーザー裁定 2026-07-23、intent 260722-space-record-catalog intent-capture Q3)
_避ける表記_: 単独の「レコード」— 既存の Record dir(intent 記録ディレクトリ、`<record>/`)と衝突するため、この概念は常に完全形「ライフサイクルレコード」で呼ぶ

## 用語(チーム運用で現用のもの)

> フレームワーク正本 `docs/guide/glossary.md` に未収録で、team.md・日常運用で使われている用語。定義の詳細規則は各出典 cid が正本。

### 体制・役割

**leader**:
ユーザー⇔メンバーの中継・ゲート執行・選挙の配信と集計・Issue/PR 管理に徹する非実装役。実装・成果物作成は行わない。(team.md cid:leader-no-work)

**member / builder / conductor / reviewer**:
チームモードで責務として割り当てる帽子。conductor は intent の進行役、builder は実装役、reviewer は独立レビュー役。固定メンバー名やハーネスではなく責務で割り当てる。(team.md cid:role-model。Conductor / Reviewer のフレームワーク定義は docs/guide/glossary.md)

**ソロモード / チームモード**:
実行形態の2値。`AMADEUS_OPERATING_MODE=team` の明示マーカーがある場合のみチームモード。(team.md「Operating Modes」)

### 意思決定

**選挙(エージェント選挙)**:
判断を要する事項を全メンバーの独立投票で裁定する仕組み。実施は amadeus-election CLI の typed loop が正本。(team.md cid:always-elect、cid:election-cli-canonical)

**E-code**:
個々の選挙・裁定に付く識別子(例: E-PM10、E-GSFND13)。裁定の出典参照に使う。

**GoA(Gradients of Agreement)**:
票に付ける8段階の合意度スケール(1 全面的支持〜8 拒否・ブロック)。(team.md cid:gradients-of-agreement-scale)

**blind 配布**:
アンカリング防止のため、推奨候補・先行票を伏せて選挙候補を中立に配ること。(team.md cid:election-protocol)

**エスカレーション正準リスト**:
ユーザーへ委ねる4類型(可否同数/マージ判断/人間関与が本質/仕様変更)の確定列挙。(team.md cid:escalation-canonical)

**delegate-approval(委任承認)**:
leader セッションの実 HUMAN_TURN を根拠に、遠隔 conductor がゲート approve をコミットできるようにする provenance 機構。(team.md cid:auto-gate-approval、#671)

**HUMAN_TURN**:
人間の実入力ターンを記録する監査イベント。human-presence ゲートと delegate 発行の根拠になる。

### ノルムと学習

**ノルム**:
memory 層(org/team/project/phases)に永続化されたルール。§13 学習ループで追加され、矛盾は admission check で拒否される。

**cid**:
ノルム行に付く安定識別子(`<!-- cid:stage:slug -->` 形式のアンカーコメント)。ノルムの相互参照・引用に使う。

**§13 学習選定**:
ステージ完了時にどの学習候補を memory 層へ persist するかを選挙で確定する手続き。(team.md cid:learnings-election)

**ローリング・ポストモーテム(PM)**:
約1時間周期で全員から学習候補を募り blind 選挙で採否確定する第2層の学び回収。(team.md cid:postmortem-two-tier)

**蒸留ラウンド**:
週次 PM に統合されたノルム棚卸し。高チャーン候補を機械化/一般化/退役/維持の4値で裁定する。(team.md cid:weekly-distillation-round)

**ノルム PR**:
memory 層変更を main へ反映する専用 PR。origin/main 起点の単独ブランチ+2名レビュー+ユーザー承認マージ。(team.md cid:norm-changes-via-pr、project.md cid:norm-pr-from-main-base)

### 品質・検証

**検証劇場**:
実行結果から導出されない検証(status ハードコード、自己参照比較等)。ゲート不在より悪いものとして Forbidden。(org.md Forbidden)

**落ちる実証**:
新設ゲート・チェックが失敗ケース注入で実際に赤くなることの実証。完成扱いの前提条件。(org.md Mandated)

**クロスレビュー**:
Issue の主張を起票者以外の2名が実コードと突き合わせて独立エビデンス付きで検証する手続き。(team.md cid:issue-cross-review)

**deslop**:
PR 作成前に main との diff から AI slop(不要コメント・過剰防御等)を挙動不変で除去する標準工程。(team.md cid:deslop-in-workflow)

**P / S ラベル**:
bug Issue の2軸ラベル。P0-P3=いつ直すか(優先度)、S1-S4=どれだけ深刻か(重大度)。(team.md cid:bug-severity-labels)

**origin:bootstrap**:
欠陥コードが bootstrap 初期実装(本家)由来と判明したバグに付けるラベル。(team.md cid:bug-severity-labels)

### 運用・インフラ

**agmsg**:
エージェント間メッセージングの skill(send/inbox/ack)。不達が無音のため ack プロトコルとセット。(team.md cid:dispatch-ack-required)

**herdr**:
チームセッション(tmux pane 群)を管理するランナー。`scripts/team-up.sh` 経由で起動される。(team.md「Operating Modes」)

**swarm**:
prepare → 並列 fan-out → check → finalize で worktree 分離の並行実装を回す code-generation の既定機構(amadeus-swarm.ts)。(team.md cid:parallel-bolts)

**codekb**:
reverse-engineering が生成・差分リフレッシュする per-repo のコード知識ベース(`amadeus/spaces/<space>/codekb/<repo>/`、9成果物)。

**record-sync PR**:
intent の record・codekb 差分を main へ反映する PR。(team.md cid:rescan-prompt-record-sync)

**チェックポイントコミット**:
ワークフローのパーク時・ステージ完了時・セッション終了時に `amadeus/` ツリーを自ブランチへコミットする運用。(org.md Way of Working)

**ミラー Issue**:
intent-first 起票の共有面。タイトル+概要+record リンク+状態行のみを持ち、設計詳細は record 側に置く。同期は record → Issue の一方向。(team.md cid:intent-first-mirror-issue)

**park / unpark**:
ワークフローを再開可能な状態で一時停止/再開する engine の操作。gate open 状態は park を跨いで保存される。(team.md cid:park-for-human-turn-wait)

## フレームワーク用語(正本へのポインタ)

以下は定義済みのため本ファイルでは再定義しない:

- **Bolt / Unit of Work / Intent / Space / Record dir / Scope / Artifact / Audit trail / Knowledge / memory.md / Runtime graph / Conductor / Reviewer / Sensor / Learning loop / Walking skeleton / Ladder prompt / Parallel batch** ほか全55語 — `docs/guide/glossary.md`(日本語版: `glossary.ja.md`)を参照
- **チーム運用の詳細規則**(上記各用語の完全な定義・手続き)— `amadeus/spaces/default/memory/team.md` の該当 cid を参照
