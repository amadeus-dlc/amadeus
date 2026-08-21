# Team-Level Rules

> このチームが複数プロジェクトで共通して採用するプラクティスと是正事項。org.md に矛盾しない規則を加算する。
>
> 2026-08-12 ノルム蒸留(ユーザー直接裁定): 具象ルール・票証跡・チームモード専用ノルムを削除し原理原則へ縮約。旧文面は git 履歴(この整理前のコミット)に保存。一次記録は選挙ストア(`amadeus/spaces/default/elections/`)と intent record に残る。

## First Principles(第一原理)

> 以下は本ファイル・project.md の具象ルール群の背後にある少数の原理である。個別ルールに迷ったとき、または新しい状況で未決のとき、まずこの原理へ遡って判断する。各具象ルールは原理の派生である。原理と具象が矛盾して見える場合、具象を誤りと断定せず、ノルム矛盾監査(選挙、迷えばユーザーエスカレーション)へかける。原理そのものの改定はユーザーエスカレーション事項(正準リスト参照)。

- **P1: 判断は独立検証された合意で行う。** 設計方針・修正方式・トリアージ・規範解釈などの判断は、leader を含む誰も単独で決めない。エージェント選挙(独立投票・アンカリング防止の blind 配布)、Issue クロスレビュー(起票者以外2名の独立エビデンス)、§13 学習選定選挙で合意を作る。既決ルールの機械的執行は判断ではなく執行として選挙不要。迷えば選挙に倒す。

- **P2: 記録と検証は実測事実のみを根拠にする。** ゲート・チェック・Issue・レビュー verdict は、実行結果・file:line・exit code から導出した事実だけを載せる。結果を実行から導かない「検証劇場」(status ハードコード、自己参照比較、消費されない検証フィールド)、推測起票、未実施選挙の先取り記入は、偽の信頼を生む分だけ不在より悪い。新設ゲートは「落ちる実証」を経て初めて完成扱いにする。

- **P3: 承認済み意図からの逸脱は、逸脱者ではなく所有者へ戻す。** 要件・設計・ユーザー可視契約から外れる必要に気づいたら、その場で逸脱を実装せず作業を止め、選挙(設計逸脱)またはユーザーエスカレーション(仕様変更)で裁定を得てから続行する。既決の上位規範は蒸し返さずそのまま適用する。無申告の逸脱はレビューで必ず差し戻す。バグは原因の所在(要件/設計/実装)まで遡って記録する。

- **P4: 不可逆・外部境界には人間を置く。** PR マージ、human-presence ゲート、セッションのライフサイクル操作(起動/再起動/despawn)など、取り消せない/外部に作用する行為は、その都度の人間の明示承認を前提とする。過去や類似案件の承認を次へ流用しない。遠隔承認は委任 provenance(実 HUMAN_TURN 由来の delegate)でのみ行い、ゲートの緩和・偽装はしない。

- **P5: 変更は最小・同期・隔離を保ち、トランクの単純性を守る。** 触るのは必要な箇所だけ(surgical)。要求されない後方互換レイヤー・移行シムは足さず古い挙動を置き換える。生成物を持つプロジェクトでは正本と生成物を同一変更で同期する。並行実装は worktree 隔離規律(割当ツリー外の git 状態変更禁止・本線絶対パス非混入)を守り、scratch は repo 外で実行する。指令ループ外の規範は、該当イベント時にタスク化しない限り実行されない。

## Operating Modes(実行形態)

### ソロモード(現行の唯一の運用形態)

1エージェントが conductor・builder・reviewer の責務を順次担う。判断は既決ノルムと実測証拠から導出し、未決事項・仕様変更・不可逆操作はユーザーへエスカレーションする。独立レビュー手段(サブエージェント、別コンテキストでの再検証、決定的な検査)は使うが、存在しないメンバーや投票結果を捏造しない。

**ソロ選挙:** 2体の fresh subagent(`subagent-1`, `subagent-2`)による選挙を正規の形態とし、conductor は選挙管理委員として amadeus-election CLI の指令ループを駆動し自らは投票しない。自動発動は opt-in で、階層設定の `solo-election.trigger.mode` が `auto` のときだけ (a) 設計逸脱 (b) ブロッカー (c) §13 学習選定 を `open --trigger auto` で発動し、それ以外はユーザーが明示したときのみ。仕様変更と正準リスト事項は設定値によらず選挙対象外(ユーザー専権)。2-0 なら採用、割れたケースはユーザーへエスカレーションする。

## Way of Working

`main` 中心のトランクベース。短命ブランチから Bolt ごとに PR を出してスカッシュマージし、複数ユニット・他 intent の工程記録・無関係なリファクタを束ねない。自 intent の record checkpoint の同梱は可(pr-convergence CLI の create 前提と record→PR の追跡性に整合。同梱の時機は pr-convergence stage 契約に従う — 収束レポートは head に束縛され、verdict 後の record checkpoint commit / それ以前の push は created epoch の再 mint を要する。E-260813-RECORD-BUNDLING-NORM 2-0)。工程記録(`amadeus/`)はチェックポイントコミット(単独または自 intent の Bolt PR への同梱)で本線へ流す。Issue・PR は日本語(識別子・パス・ログ引用は原文保持)、コミットは英語 <!-- cid:requirements-analysis:issues-in-japanese -->

### 意思決定とエスカレーション

- **ユーザーエスカレーションの正準リスト**(全ノルムはこれを参照): (1) 選挙の可否同数 (2) PR マージ判断 (3) 人間の関与が本質の事項(例外承認・外部サービス操作・ノルム整理の迷い・human-presence ゲートの承認) (4) 仕様変更 — 既存の要件・ユーザー可視契約・挙動を変える場合。バグ修正(仕様への回復)は非該当だが、迷えばエスカレーションに倒す <!-- cid:requirements-analysis:escalation-canonical -->
- 判断を要する事項は選挙にかけ単独で決めない。一次証拠で事実が一意に確定し既決 contract へ機械的に適用するだけなら執行として自律実行してよい。複数の妥当解・価値判断・ownership・証拠競合・設計逸脱は選挙、不可逆な外部操作は正準リスト、迷えば選挙。選挙は amadeus-election CLI の指令ループを正とし、definition は複数 question を持てる。回答は question 単位、結果は question 単位の established と hold の混在を許し、再実行は hold 中の question だけを対象にする。open 済みは直接編集せず terminal まで実行する。既決の規範は再議しない(例外はノルム矛盾監査) <!-- cid:requirements-analysis:always-elect -->
- 承認済みの要件・設計から逸脱する必要に気づいたら実装せず停止し裁定を得る(P3)。既存様式への準拠と判断する場合も該当性を単独で決めない。レビュアーは無申告の逸脱を必ず差し戻す <!-- cid:requirements-analysis:implementation-deviation-election -->
- どの Issue に着手するかはユーザーが決定する。方向性への同意や起票指示を着手承認と見なさない <!-- cid:requirements-analysis:issue-selection-user-decides -->

### レビュー・ゲート・マージ

- PR を作成したら `pr-convergence` プラグイン stage の手順に従い、base 競合 → 未解決レビュースレッド → 失敗・保留の必須 check を順に処理する。push のたび mergeability から再確認し、三者が同時に解消するまで継続する。収束確認はマージ承認を代替しない <!-- cid:requirements-analysis:pr-converge-loop-required -->
- 独立レビューの観点: 完全性(実測)、正本と生成物の同期、surgical、落ちる実証、検証エビデンスの実測 exit code、無申告の逸脱。PR 発行前に deslop を通し、除去後は全検証コマンドを再実行する <!-- cid:requirements-analysis:independent-review-on-pr -->
- AI は PR のマージを自発実行しない。CI green とレビュー READY を実測してユーザーへ諮り、承認後にスカッシュマージする。実行前に mergeable・現 head の必須 CI・verdict を再実測し、head が実質変化していれば増分再レビューのうえ再度諮る <!-- cid:requirements-analysis:leader-executes-merge -->
- Issue のクローズは PR の MERGED 状態と着地面の実読・grep の出力を確認した後にのみ行う <!-- cid:requirements-analysis:close-after-landing-verification -->
- §13 学習選定は選挙にかける。候補一覧(採用案+不採用理由)または「0件でよいか」を諮り、裁定成立後に記録する。ゲート報告には候補列挙か明示の「0件」を同梱する。ただし semi/full の Intent autonomy が有効な間は `cid:scope-definition:c1-semi-ladder-routing`(project.md)が優先し、決定経路は `amadeus-bolt decide-question` の5段梯子になる(ソロ選挙の結果はその1段として取り込まれる)。選挙への直行が正規経路なのは autonomy が none の場合に限る <!-- cid:requirements-analysis:learnings-election -->

### ノルムの保守

- ノルムは定期的に論理矛盾を監査し、大量追加の直後・intent 完了の節目で矛盾・重複・失効を棚卸しして整理案を裁定にかける。迷う場合(矛盾か意図的例外か不明、統合で意味が変わりうる、暫定と恒久の境界が曖昧)は無理に決めずユーザーへエスカレーションする。ノルム変更は溜めず、persist のたび origin/main 起点の単独ブランチで PR を作り独立レビューを経てマージする(マージは人間承認) <!-- cid:requirements-analysis:norm-consistency-review -->

- 実装 Bolt の検証順序は remote-first を原則とする — 実装がコミットされたら最優先で branch を push して PR を作成し、blocking 検証(フルスイート・coverage・conformance 等)はリモート CI を正とする。ローカルは typecheck / lint / targeted テスト / coverage-patch-quick advisory までとし、ローカルフルスイートの完走を push・PR 作成の前提条件や builder の完了条件にしない(ローカルで全部通してから push する順序自体が誤り)。既存の「PR 発行前に deslop を通し、除去後は全検証コマンドを再実行する」規則は本裁定下では「merge-ready 判定前まで」に読み替え、deslop 後の全検証はリモート CI の再実行で確認する。blocking required check の正本は CI の `ci-success` 集約ジョブ(個別ジョブは集約の needs 経由で blocking になる)。ユーザー直接裁定(2026-08-14、同種失敗の再発への是正) (learned 2026-08-14) <!-- cid:code-generation:c2 -->
## Issue 運用

- 起票経路は相互排他の2つ。(A) **Issue-first**: Issue Form から起票し、種別は `bug` / `enhancement` / `documentation` / `question` から必ず1つ。(B) **intent-first**: intent record を正本に engine がミラー Issue を生成し、record → Issue の一方向同期で概要・リンク・状態だけを共有する。経路・種別・優先度(P0〜P3)・bug の重大度(S1〜S4)・補助ラベルは独立の軸とし、起票時に種別1つと優先度1つ(bug は重大度も)を付ける <!-- cid:requirements-analysis:issue-taxonomy -->
- 種別は題材でなく**完了条件**を上から順に判定する。(1) 回答・裁定だけで閉じる→`question` (2) 変更が文書面だけ→`documentation` (3) 成果物が既存の合意済み契約に違反→`bug` (4) それ以外で契約を追加・意図的に変更→`enhancement` <!-- cid:requirements-analysis:issue-type-decision -->
- 起票前に open/closed 双方の既存 Issue と origin/main・関連 PR を検索し、現行状態でも起票が必要だと確認する。着手時にも既存 open PR を棚卸しし、あれば再実装せずその PR の収束へ回す <!-- cid:requirements-analysis:pre-filing-dup-and-branch-check -->
- 本文は (1) 背景・対象範囲 (2) 根拠・実測証拠 (3) 期待結果・完了条件 (4) 影響・価値 (5) 関連 Issue/PR/intent (6) 初期分類 を必須とし、事実・観測・仮説を区別する。種別固有の様式は `.github/ISSUE_TEMPLATE/*.yml` を正本とし、同じ変更で同期する <!-- cid:requirements-analysis:issue-canonical-body -->
- Issue-first で起票したら、起票者以外の独立2名が主張・分類・重複検索を一次資料と突き合わせ、実行コマンドと結果・file:line・可能なら再現結果をコメントに残す。要約や追認は数えない。2名が揃うまで実装バッチへ組み込まない <!-- cid:requirements-analysis:issue-cross-review -->
- Issue に着手したら(ユーザーの着手決定を受けた時点で)`in-progress` ラベルを付与し、クローズ時に除去する。intent-first のミラー Issue は engine のラベル同期(`intent-initialized` / `workflow-completed` 境界)が同じ役割を担うため手動付与しない <!-- cid:requirements-analysis:issue-in-progress-label -->
- オープンバグゼロを目標にトリアージとバッチ編成を回す。着手順は優先度をキュー順、依存を実行可能性制約とし、同一ファイル・進行中 PR との交差は直列化する。潜在バグ探索では修正せず実測だけを起票する。学びの回収は §13 学習選定と定期のポストモーテムの二段構え <!-- cid:requirements-analysis:bug-zero-goal -->

## 検証・実測規律(P2 の派生)

- **数値は集計コマンド出力からの転記のみ。** 件数・実測値には測定 ref(どの tree/SHA か)と集計コマンドを併記する。全数列挙の件数には検索述語(パターン・対象集合・除外条件)を再実行できる形で同じ場所に記録する。派生値は算出式を併記し実測値と区別する <!-- cid:requirements-analysis:numbers-from-command-output-only -->
- **引用は起草時に実測する。** file:line で機構を引くときは実在・意味論の適合・一意性(フルパス)を確認し、確約級の引用には verbatim 断片を併記する。不在主張は全域 grep で反証確認する。機構列挙の完全性は起草時1回で確定とせず、レビュー段・実装段でも再列挙する <!-- cid:requirements-analysis:mechanism-cite-verify-at-draft -->
- **落ちる実証は不可分の1セット。** 注入は対象テストが実際に読む面かつ実行時に消費される行へ行い、注入 → 赤の実測 → revert 完了を1セットで実施し残渣ゼロを機械確認する。正当な既存データで赤くならないことも実 corpus で実測する <!-- cid:code-generation:falling-proof-injection-one-set -->
- **報告は確定値のみ・実測の後に出す。** ゲート報告・検証報告は集計完了後の確定値だけで構成する。成功通知は実行結果と着地面を実測検証した後にのみ出す <!-- cid:requirements-analysis:verify-before-notify -->

## Forbidden

- NEVER 要求されていない後方互換レイヤー・フォールバック分岐・非推奨API のシム・移行用の二重実装を追加しない。古い挙動は削除して置き換える。互換維持は requirements/NFR に明示された場合にのみ実装し、根拠を成果物に残す
- NEVER 検証・ゲート・チェックの結果を実行結果から導出せずに構築しない — status のハードコード、自己参照比較(x === x)、両分岐が同一の条件式、どのコードも消費しない検証用フィールドはすべて「検証劇場」であり、偽の信頼を生む分だけゲート不在より悪い
- NEVER AI が PR のマージを自発的に実行しない。マージはその PR について人間の明示承認を得てから実行する。過去の承認や類似 PR の承認をもって次のマージの承認と見なさない <!-- cid:requirements-analysis:no-ai-merge -->

## Mandated

- ALWAYS code-generation / functional-design のレビューゲートで、要求にない後方互換レイヤー・フォールバック分岐・移行シム・二重実装が混入していないかを reviewer が明示的に検査する。混入を発見したら、requirements/NFR に根拠が明示されていない限り是正するまでステージを完了させない
- ALWAYS 新設のゲート・検証スクリプト・チェックは落ちる実証を経て完成扱いにする。生成するエビデンスが実行結果由来であること、および保存先まで実際に到達することを確認する。reviewer はコードを読んで承認するだけでなく、この実証を要求する

## Testing Posture

テストは Bun で unit・integration・smoke を日常 CI に載せ、e2e と形式検証は対象リスクに応じて追加する。実行可能な振る舞いの追加・変更・欠陥修正は TDD を既定かつ必須とする。実装前に合意済みの公開 seam へ失敗テストを1件追加して Red を実測し、それを通す最小実装で Green にする vertical slice を1件ずつ反復する。テストの一括先行・実装後のテスト追加・実装後の落ちる実証は TDD 実施とみなさない。エラーパス・復旧分岐・防御的 catch も「実行可能な振る舞い」に含まれ、この既定の適用対象である — レビュー指摘対応で追加する分岐を含め、エラーパスのテスト後回しを許容しない。適用外は (1) 振る舞いを持たない文書・書式だけの変更 (2) 振る舞い不変のリファクタリング (3) 正本から機械生成される投影物だけの同期 (4) 破棄する探索的 spike に限り、適用外でも既存テストの前後 Green・characterization test・drift check・文書検査を行う。挙動変更を含むリファクタリング、正本・generator・投影規則の変更、機械的に消費される文書は適用外にしない。変更が小さい・急ぎ・テストが難しい・既存 seam がないことも理由にしない。seam が未確定なら実装前に停止して合意を取り、迷えば TDD に倒す。coverage ratchet、patch coverage、complexity、生成物 drift は blocking gate として維持する <!-- cid:code-generation:tdd-default-with-narrow-exceptions -->

検証は日常 CI の property-based/unit/integration を基本とする。形式検証面(並行プロトコル spec 変更時の単一形式モデル完全探索)は FMC 退役(intent 260821-fmc-retirement、2026-08-21)により当面持たない — 再設計時に本則へ再導入を裁定する <!-- cid:build-and-test:two-layer-verification-posture -->

複数の test path を列挙して実行する場合は、実行前に全 path の実在を機械確認し、実行後に期待ファイル数と runner の報告数を照合する — ランナーは不存在 path を無音で除外したまま成功しうる <!-- cid:build-and-test:test-path-set-completeness -->

## Learnings Inbox(未蒸留)

日常の §13 学習・些細なノルム追加はまずこの節へ追記する。定期蒸留ラウンドで本文への昇格(一般化・機械化)または削除を裁定する。蒸留済み本文と未蒸留の具象学習を混在させない。

- 種別判定への当り前品質基準の追加(ユーザー直接裁定 2026-08-21 実 HUMAN_TURN、逐語要旨「ユーザの便益を考えて。普通に使う分に障壁になるなら対応必須。enhancement って課題解決だよ。当り前品質を実現できていないなら bug 相当」): cid:requirements-analysis:issue-type-decision の完了条件基準 (3)「成果物が既存の合意済み契約に違反→bug」の適用は、明文契約への違反だけでなく**ユーザー便益視点の当り前品質**(狩野モデル — 通常運用で当然成立すべき品質: record の耐久的証拠性・ツールが自ら宣言する契約の適時強制など)の未達を含めて判定する。変更の実装形が「契約の追加」であっても、動機が当り前品質の回復なら種別は bug(+ 重大度)であり、対応は必須(優先度もその前提で付ける)。実測: Issue #3382 — 起票時 enhancement/P2(契約追加の形式で判定)→ ユーザー裁定で bug/S3-MAJOR/P1 へ再分類(再導出: gh issue view 3382 の title/labels とコメント https://github.com/amadeus-dlc/amadeus/issues/3382#issuecomment-5364633393) (learned 2026-08-21) <!-- cid:requirements-analysis:c1-kano-must-be-quality-bug -->
- ユーザー常任マージ承認(2026-08-15 実 HUMAN_TURN、逐語「CI greenであればマージしてよいです。以後も」): 本則「AI は PR のマージを自発実行しない…承認後にスカッシュマージ」(cid:requirements-analysis:leader-executes-merge)の個別承認要求を、**必須 CI green と収束判定 `converged: true`(上記4条件)を実測した場合に限り**常任承認で代替してよい、へ緩和する。マージ前の再実測義務(mergeable・現 head 必須 CI・verdict)と merge queue 経由・Ruleset 非バイパスは不変。head が実質変化していれば増分再レビューのうえ実測をやり直す。この常任承認はマージのみに適用され、リリース・publish・その他の不可逆外部操作へは拡張しない。**既存則との優先関係**: `cid:requirements-analysis:no-ai-merge`(Forbidden 節)および P4 の「過去や類似案件の承認を次へ流用しない」を、本条件(必須 CI green かつ pr-convergence の収束判定 `converged: true` の実測 — `plugins/github-pr-convergence/tools/pr-convergence-predicate.ts:235-289` の4条件: repliedUnresolved 0・ignored 0・mergeStateStatus CLEAN・resolution resolved)を満たすマージに限りユーザー直接裁定で緩和する — 条件を満たさないマージへの適用・他の不可逆操作への拡張は引き続き禁止。次回蒸留で本則へ統合する (learned 2026-08-15, intent 260814-priority-bug-batch, ユーザー直接裁定) <!-- cid:ci-pipeline:standing-merge-approval-ci-green -->

## election-v2 ballot は response に rationale フィールド(string|null)も必須

- cid:code-generation:election-v2-ballot-contract への追補: ballot の responses[] 各要素は questionId/choiceInternalNo/goa に加え reservation と rationale の両フィールドが present であることを codec が要求する(amadeus-election-codec.ts parseResponse — undefined は「string or null」shape 違反で decode 拒否。省略不可、値なしは明示的 null)。既存学習は GoA・reservation 非空・submittedAt 位置・kind を記すが rationale の存在要求が未記載で、intent 260818-priority-bug-batch-4 の選挙 E-260818-PBB4-FIX-METHODS で両票が初回 decode 拒否 → rationale: null の機械補完(投票内容不変)で受理の往復 1 回を実測 (learned 2026-08-18, ユーザー採用裁定) (learned 2026-08-18) <!-- cid:application-design:c2-ballot-rationale-field -->
