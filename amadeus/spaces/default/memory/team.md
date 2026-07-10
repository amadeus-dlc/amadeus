# Team-Level Rules

> このチームが承認したプラクティスと是正事項。org.md を上書きする。practices-discovery の承認ゲートで記入される。原則としてゲート経由で編集し、直接編集しない。
>
> 2026-07-09 ノルム整理(監査: claude-engineer-2、選挙 A4=A 全会一致、ユーザー承認済み): 矛盾・重複・失効・表記ゆれを再編。以降の追記は本整理後の正準表現(エスカレーション正準リスト等)を参照すること。

## Way of Working

このリポジトリは `main` を中心に、短命ブランチから Pull Request 経由で変更を取り込む GitHub Flow / トランクベース寄りの運用を採用する。実装時は `core/` または `harness/<name>/` を編集元とし、`dist/` とセルフインストールツリーは生成物として `bun scripts/package.ts` と `bun run promote:self` で同期する。

amadeus/ ワークスペース(record: state・per-clone 監査シャード・intents.json、memory、codekb、knowledge)は version-controlled。**チェックポイント(ワークフローのパーク時・ステージ完了時・セッションや1日の終わり)で `amadeus/` ツリーごとコミットする**。監査シャードは per-clone・append-only(`<record>/audit/<host>-<clone>.md`、読み取りは `audit/*.md` の glob マージ)で競合しないため、監査だけの専用コミットは通常不要 — チェックポイントのコミットに自然に含める。

amadeus 実行中に、現在の intent と関連して一緒に扱う必要はあるが、同じ intent に含めると目的や成果物の焦点がぼやける課題を見つけた場合は、発見時点では intent 粒度を気にせず GitHub Issue として起票し、リンクを会話・関連成果物・必要なら stage diary に残してから本線の作業へ戻る。質問の選択肢で非採用にした案や、単にスコープ外と判断しただけの案を機械的に Issue 化しない。

起票済み Issue は、必要に応じて intent 単位になるように親 Issue を追加して整理する。Issue 起票の粒度と intent 設計の粒度を同時に決めようとして、発見時点の記録を遅らせない。

Construction の成果は Bolt ごとに PR/スカッシュマージする。複数ユニット・工程記録の一括反映・無関係なリファクタを単一 PR に束ねない — 束ねると walking-skeleton ゲートと人間レビューの実効性が失われる。工程記録(`amadeus/` ツリー)はチェックポイントごとのコミットで本線へ流し、実装 PR を肥大化させない。

### 意思決定とエスカレーション

- **ユーザーエスカレーションの正準リスト**(全ノルムはこのリストを参照する): (1) 選挙の可否同数 (2) PR マージ判断(no-AI-merge) (3) 人間の関与が本質の事項 — 例外承認・外部サービス操作・ノルム整理の迷い・human-presence を要するゲートの物理承認 (user decision 2026-07-09) <!-- cid:requirements-analysis:escalation-canonical -->
- 判断を要する事項は常にエージェント選挙にかけ、leader を含む誰も単独で決めない(設計方針・修正方式・トリアージ・ブロッカー対応・規範の解釈など)。既決ルールの機械的執行(承認済みゲートの delegate 発行、ユーザー承認済みマージの実行など)は判断ではなく執行として選挙不要。選挙か執行か迷う場合は選挙に倒す。エスカレーションは正準リストに従う (user decision 2026-07-09) <!-- cid:requirements-analysis:always-elect -->
- intent の明確化質問はエージェント間選挙で回答を作る: leader が質問を全メンバーへ配信し、各自がコード・Issue を実測確認して投票、多数決で採用する。ユーザーへのエスカレーションは可否同数のときのみ。多数決が成立した質問は選挙結果をそのまま採用する (learned 2026-07-09) <!-- cid:requirements-analysis:election-protocol -->
- org/team/project の memory 層で既決の規範は選挙・質問の対象にせず、そのまま適用する。質問起草時に既決照合を先に行い、真に未決の設計判断だけを問う。例外: ノルム矛盾監査の場での再編提案は、既決ノルム自体を選挙対象にしてよい (learned 2026-07-09) <!-- cid:requirements-analysis:no-election-for-decided-norms -->
- 失敗・ブロッカーが発生したら、conductor は状況と解決の選択肢(回避策・修正案・スコープ変更等、可能な限り複数)を leader へ送り、leader がエージェント間選挙にかけてより良い選択を探す。多数決成立なら結果を採用して続行し、エスカレーションは正準リストに従う (user decision 2026-07-09) <!-- cid:requirements-analysis:blocker-election -->
- 人間判断が必要な事項(正準リスト該当分)は AskUserQuestion で提示し、放置せず必ず承認を取り切る。leader は未回答の判断事項を台帳として追跡し、回答が滞っている場合は忘れられている前提で催促する。判断待ちのまま暗黙に先へ進まない (user decision 2026-07-09) <!-- cid:requirements-analysis:pending-decision-tracking -->

### 役割と指揮系統

- leader は作業をしない: 実装・成果物作成・intent の conductor 役はすべてメンバーへ委任し、leader はユーザー⇔メンバーの中継、ゲート執行、選挙の配信と集計、Issue/PR 管理、進捗監視に徹する。leader が手を動かし始めたら移管する。**leader が自ら行う執行業務**(作業ではない): ゲート執行(delegate-approval 発行含む)、ユーザー承認済みマージの実行、§13 ノルム persist と norm PR の作成、自分の record・ワークスペースの整合維持 (learned 2026-07-09) <!-- cid:requirements-analysis:leader-no-work -->
- intent・タスクのディスパッチは leader のみが行う。メンバーは割り当てられていない作業を自発的に開始しない(発見事項は Issue 起票・報告まで)。作業が完了したら leader へ報告し、次の作業指示を仰いで待機する (user decision 2026-07-09) <!-- cid:requirements-analysis:leader-dispatch-authority -->
- メンバーの役割分担: codex メンバーにはレビュー・ディープリサーチ(調査・検証・トリアージ)系のタスクを割り当てる。実装・conductor 役は claude メンバーが担う(CI 整備などユーザーが明示指定した場合は例外)。選挙は全員参加のまま (user decision 2026-07-09) (superseded by all-claude-team 2026-07-10 — codex 退役により失効) <!-- cid:requirements-analysis:codex-role-specialization -->
- 進捗管理は報告制: leader はメンバーへ進捗ポーリングをしない。タスクディスパッチ時に完了・ブロッカーの自発報告を義務付け、報告が来るまで待つ(長時間の沈黙に対するヘルスチェックはユーザー承認の例外として可) (learned 2026-07-09) <!-- cid:requirements-analysis:push-reporting -->
- フロー効率よりリソース効率を優先する: 単一アイテムのリードタイム最適化のために全体を待たせない。leader は逐次のピンポンを避けて作業をバッチで委任し、メンバーの手が空かないよう並行割当を維持する (user decision 2026-07-09) <!-- cid:requirements-analysis:resource-efficiency -->
- タスク規模に応じてサブエージェントを有効活用する: 小さな作業はインラインで済ませ、複数ファイル・複数観点・並列化可能な作業は Task サブエージェントへ分割して fan-out する(worktree 隔離が必要な並行実装は隔離付きで)。隔離規律は Corrections の worktree ディスパッチ規律(cid:code-generation:c2)に従う。サブエージェントのモデルは定義の model: ピンに従う(高判断=opus) (user decision 2026-07-09) <!-- cid:requirements-analysis:subagent-utilization -->
- サブエージェントが自前のモニタ/バックグラウンド待ちでターンを終えたまま再開通知が来ない場合がある。conductor はディスパッチ先の無応答を検知したら worktree/成果物の実状態を直接検分し、作業を引き取って完遂してよい(引き取り時は差分検分と検証コマンドの再実行を必須とする) (learned 2026-07-09) <!-- cid:code-generation:c5 -->

### ゲートとマージ

- ステージゲート(プラン承認含む)は auto 承認とする: conductor は reviewer READY・センサー通過・成果物実在を確認して先へ進む。承認の実行経路は委任承認 provenance(#671 実装済み): conductor がゲート準備完了を leader へ報告 → leader が delegate-approval を発行(leader セッションの実 HUMAN_TURN が根拠)→ conductor が approve をコミット。エスカレーションは正準リストに従う (user decision 2026-07-09) <!-- cid:requirements-analysis:auto-gate-approval -->
- PR マージの執行手順: leader が PR ごとに CI green・レビュー READY を実測確認してユーザーへ「これをマージしますか?」と確認し、承認を得たら leader が gh pr merge(スカッシュ)を実行する。人間が GitHub のマージボタンを押す運用はしない。Forbidden の no-AI-merge ルールは「承認なしの自発マージ禁止」の意味であり、この承認後執行と両立する (user decision 2026-07-09) <!-- cid:requirements-analysis:leader-executes-merge -->
- PR を作成したら、作成者(conductor/メンバー)は即座に空いている codex メンバーへ直接レビューを依頼し、leader への PR 報告にはレビュアー名を含める。複数 PR が並ぶときは codex 3名に分散する。レビュー観点の既定: 完全性(grep 等の実測)、dist/self-install 同期、surgical、落ちる実証、検証エビデンスの実測 exit code (user decision 2026-07-09) <!-- cid:requirements-analysis:codex-review-on-pr -->

### バグとスコープ

- leader はオープンバグゼロを目標として運営する: バグの起票・トリアージ・バッチ編成・割当を能動的に回し、アイドルメンバーを作らない。実装待ちのバグには codex の事前深掘り(根本原因・再現・修正案の選択肢)を先行させ、requirements・選挙を高速化する (user decision 2026-07-09) <!-- cid:requirements-analysis:bug-zero-goal -->
- 当面の対応スコープはバグのみ: 新規タスク・intent はバグ修正に限定し、enhancement 系は起票・トリアージまでに留めて着手しない。進行中の enhancement intent は park のまま凍結。例外: (1) バグ対応自体の前提となるインフラ作業(例: #671) (2) ユーザーが P0 指定したタスク(#683、#684 とその分割 Issue — #697 の PBT は #684 Phase B としてのみ実装可。#688 単体の本格導入は凍結継続。2026-07-09 ユーザー裁定) (user decision 2026-07-09) <!-- cid:requirements-analysis:bugs-only-scope -->
- 潜在バグ探索タスクでは修正を行わない: 発見バグは file:line で裏取りした実測のみを GitHub Issue に起票する(推測起票・重複起票禁止)。修正は claude メンバーへの別タスクとして割り当てる (user decision 2026-07-09) <!-- cid:requirements-analysis:bughunt-file-only -->
- Issue の起票と検証: amadeus の利用中に見つけた不備・不具合・改善点は必ず Issue として起票する(leader 含む誰が見つけても、自発起票・ユーザー指示起票を問わず)。起票したらハルシネーション対策レビューとして、起票者以外のメンバー2名が主張を実コードと突き合わせ、実在確認・訂正・却下を Issue コメントに残す。2名の確認が揃うまでその Issue は修正バッチに組み込まない (user decision 2026-07-09) <!-- cid:requirements-analysis:issue-cross-review -->

### 並行実装

- Construction は Bolt をできる限り並行実装する(相互依存が真に必要な箇所のみ直列)。delivery-planning / units-generation では Bolt・Unit を独立に切って並列バッチを最大化し、code-generation は swarm(prepare → 並列 fan-out → check → finalize)による worktree 分離の並行実装を既定とする (user decision 2026-07-09) <!-- cid:requirements-analysis:parallel-bolts -->

### ノルムの保守

- ノルム(memory 層のルール)は定期的に論理矛盾を監査する: 大量追加の直後・intent 完了の節目で、矛盾・重複・失効(暫定運用の期限切れ等)を棚卸しし、発見したら整理案を選挙にかけて再編する。矛盾したルールの放置はエージェントのパフォーマンス悪化要因として扱う (user decision 2026-07-09) <!-- cid:requirements-analysis:norm-consistency-review -->
- ノルム整理で判断に迷う場合(矛盾か意図的な例外か不明、統合すると意味が変わりうる、暫定と恒久の境界が曖昧など)は、選挙で無理に決めず必ずユーザーへエスカレーションする (user decision 2026-07-09) <!-- cid:requirements-analysis:norm-review-escalation -->
- ノルム変更(memory 層への追加・整理)がある程度溜まったら、leader は変更をまとめた PR を作成し、他メンバー(最低2名、codex を含む)のレビューを受けてから main へマージする(マージは従来どおり人間承認)。ノルムの逐次コミットは leader ブランチ上のチェックポイントとして行い、main への反映は必ずこの PR 経由とする (user decision 2026-07-09) <!-- cid:requirements-analysis:norm-changes-via-pr -->

- codex メンバーの手空き時の既定タスクは潜在バグ探索とする: leader が未踏領域を割ってディスパッチし、レビュー依頼が来たら探索を中断して最優先で対応する。探索は bughunt-file-only ルール(実測起票のみ・修正禁止・クロスレビュー必須)に従う (user decision 2026-07-09) (learned 2026-07-09) (updated by all-claude-team 2026-07-10: 『codex』は『手空きメンバー』に読み替えて存続) <!-- cid:requirements-analysis:requirements-analysis:codex-default-bughunt -->
- Issue のラベルトリアージは自動発動とする: 起票者は起票時に種別(bug/enhancement/documentation)+ 優先度(P0-P3)の見立てを必ず付ける。leader は起票報告を受けるたびに未付与・不整合がないか確認し、あれば空いているメンバー(旧: codex — all-claude-team 2026-07-10 で読み替え)へトリアージを即ディスパッチする(ユーザーの指示を待たない)。優先度基準: P0=正しさ/安全性の破綻、P1=重要だが回避可、P2=通常、P3=いつか (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:auto-label-triage -->
- Issue クロスレビューは独立検証であって同意表明ではない: レビュアーは起票文の要約・追認だけのコメントを書かず、自分で実際にコード・ファイルを開いて突き合わせた新しいエビデンス(自分が実行したコマンドと結果、確認した file:line の引用、可能なら再現の実測)を必ずコメントに含める。独立エビデンスのないレビューは2名確認の頭数に数えない。leader は verdict コメントにエビデンスが無い場合、レビューやり直しを差し戻す (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:issue-review-evidence -->
- ドキュメントの修正・執筆(docs/、amadeus/ 配下の日本語 Markdown、EN/JA ペア更新を含む)は claude メンバーが担当する。codex メンバーには日本語文書の執筆・修正を割り当てない(日本語の品質担保のため。codex はドキュメントの検証・参照整合チェックには従来どおり参加してよい) (user decision 2026-07-09) (learned 2026-07-09) (note: codex 条項は all-claude-team 2026-07-10 の退役により空文化 — 全 claude 体制ではドキュメントは全員可) <!-- cid:requirements-analysis:requirements-analysis:docs-by-claude -->
- $HOME/.agents/skills のスキルを状況に応じて活用する: PR レビュー時は thermo-nuclear-code-quality-review(厳格な保守性監査)を codex の標準レビュー手順に加える。PR が壊れているときは fix-merge-conflicts / fix-ci / loop-on-ci。他エージェントの主張・レビュー結果の裏取りには verify-this(反証可能な形での fresh evidence 検証 — Issue クロスレビューの独立エビデンス要件と整合)。PR コメント回収は get-pr-comments (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:agents-skills-usage -->
- 役割分担の改定(2026-07-09 ユーザー決定、codex の gpt-5.6 sol medium への更新に伴う): codex メンバーにも実装作業・バグ修正の Bolt を割り当ててよい(従来のレビュー・ディープリサーチ・トリアージに追加)。制約: (1) 自分が実装した PR のレビューは他メンバーが行う(自己レビュー禁止) (2) 日本語ドキュメントの執筆・修正は引き続き claude 担当 (3) intent の conductor 役は当面 claude が担い、codex 拡大は実績を見て再判断。旧 codex-role-specialization はこの項で更新される (learned 2026-07-09) (superseded by all-claude-team 2026-07-10 — codex 退役により全条項失効) <!-- cid:requirements-analysis:requirements-analysis:codex-implementation-enabled -->
- 無言で作業しない: 各メンバー(特に codex)は作業中、自セッションのターミナルに進捗ナレーションを出す — 着手時に「何をどの手順でやるか」、長い工程の節目ごとに「いま何をしていて次に何をするか」、ツール実行の前に一言の意図表明。人間がターミナルを覗いたときに現在地が分かる状態を常に保つ(leader への報告制とは別軸: 報告は節目、ナレーションは常時) (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:no-silent-work -->
- PR 作成前の deslop を標準工程にする: 実装者は PR を出す前に $HOME/.agents/skills/deslop スキル(main との diff から AI slop — 不要コメント・過剰防御・any キャスト・深いネスト・周辺コードと不整合なパターン — を除去、挙動不変)を実行する。レビュアーも slop 残存をレビュー観点に含める(thermo-nuclear と併用)。deslop 後も全検証コマンドの再実行必須(挙動不変の実証) (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:deslop-in-workflow -->
- チームは claude 6名体制で運用する(2026-07-09 決定): codex(GPT-5.6)は agmsg の monitor 受信が Codex CLI 本体の制約(外部イベントで走行中の可視セッションを起こす API 不在 — openai/codex #18056/#15299/#17543 open, #11415 not_planned、3名独立 VERIFIED)で成立せず turn mode 退避が必要になったため、codex worktree を claude で立ち上げ直した(codex-engineer-1/2/3 worktree → claude-engineer-4/5/6)。全員 monitor で可視・wake 可能。旧 codex 専用の役割分担(レビュー/リサーチ専任・実装解放等)は失効し、全 claude が実装・conductor・レビュー・リサーチを担う(自己実装 PR の自己レビュー禁止は維持)。Codex 側が該当機能を実装したら codex 再導入を再検討 (learned 2026-07-09) (learned 2026-07-10) <!-- cid:requirements-analysis:requirements-analysis:all-claude-team -->
- 全 claude 6名の役割モデル(2026-07-10 ユーザー指示により leader が策定): 能力は同一のため、役割の区別は固定分担ではなく「領域アフィニティ(蓄積した文脈)」と「帽子(conduct / レビュー / バグハント)」で行う。領域アフィニティ: e1=ゲート・presence・監査層(amadeus-state/lib/audit)、e2=CI・カバレッジ・リリース(workflows/codecov/release)、e3=パッケージング・dist・promote-self・日本語ドキュメント、e4=エンジン(orchestrate/swarm)・ハーネス表層、e5=tools 深部(learnings/runner-gen)・テストインフラ、e6=scripts・packages/setup・トリアージ。運用規則: (1) 同時 conduct は最大3 intent とし、常時2名以上をレビュー/バグハント側に確保する(レビュー枯渇防止) (2) conductor 割当はアフィニティ最寄りの手空きメンバーを既定とする (3) Issue クロスレビューは起票者以外で「領域内1名+領域外1名」を混ぜる(盲点防止) (4) 優先順位は全員共通で レビュー > バグハント > 新規着手 (5) アフィニティは独占ではない — 手が空いた者が領域外を担ってよく、選挙・ドキュメントは全員が担う (user decision 2026-07-10) <!-- cid:requirements-analysis:claude-role-model -->
## Walking Skeleton

スコープ別の walking-skeleton 既定は org.md に従う。greenfield 要素(新パッケージ・新配布経路など)を含む intent では、最初の Construction Bolt を小さな end-to-end スライスとして扱い、以後の拡張前に人間がゲートで確認する。

## Testing Posture

テストは TypeScript で `tests/` 配下に追加し、Bun ベースの既存ランナーで検証する。PR/CI の基準は `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`。ユーザー可視の契約(CLI 契約・配布物ドリフト・セルフインストール互換など)は該当領域を触る変更で必ずカバーする。

タスク実行中に既存テストが赤い場合、「自分と無関係」を理由に無視して作業を進めたり、スイートをグリーンとして報告・完了扱いしたりしない。まずベースライン(自分の変更前から赤かったか)を確認し、自分の変更で赤くしたテストは必ず直す。変更前から赤い無関係なテストは、原因が明快で安全・低コストに直せるなら同一 PR で直す(ボーイスカウトルール)。直すのが大きい・リスキー・他者の作業中の場合は、黙って進めず GitHub Issue を起票し会話でフラグしてから本線に戻る(Way of Working の Issue 起票ノルムに合流する)。無関係な赤の是正で本線のスコープを不必要に膨張させない。

## Deployment

デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理する。GitHub Actions は push と pull_request で typecheck、lint、dist/self-install drift guard、smoke+unit+integration tests を実行し、リリース前には必要に応じて `--release` テスト層を追加する。

リリースは release.yml の workflow_dispatch 一本で行う: release-it がバージョンバンプ(`after:bump` の `scripts/release-version-sync.ts` が `packages/setup/package.json`・`amadeus-version.ts`・README バッジ・`dist/`・セルフインストールツリーを機械的に同期)→ `vX.Y.Z` タグ発行 → GitHub Release ノート自動生成 → npm publish まで完結する。手書きの CHANGELOG.md は持たず(2026-07-09 削除)、PR や amadeus ワークフローがバージョンを上げることもない。タグはインストーラ(`@amadeus-dlc/setup`)の配布物取得先として参照される。リリースのバンプコミットのみ、PR/5ゲートを経ずに main へ入る明示的な例外として承認する(release-it が行う version 変更に限定。2026-07-09 ユーザー決定)。

## Code Style

TypeScript/ESM と Bun 直接実行を前提に、既存の `amadeus-` プレフィックス、`packages/framework/` 配下のハーネス中立 `core/` とハーネス別 `harness/<name>/` という境界を守る。フォーマッタは無効、lint は Biome、型検査は `tsc --noEmit` の2構成で行い、ツール・フックには実行ビットを要求しない。

新設パッケージ(`packages/*`)は、lint(Biome)と型検査(`tsc --noEmit`)の配線を**パッケージを追加する同一 PR で**追加し、既存の狭い CI lint スコープ(`tests/` のみ)を継承しない。

リリース手順の正準は Deployment 節を参照(旧: 本節に `setup-vX.Y.Z` タグ表記の重複段落があったが、実タグは `vX.Y.Z` であり事実誤りのため 2026-07-09 の整理で Deployment へ一本化)。

## Forbidden

- NEVER `dist/<harness>/` 配下を手編集する — 生成物であり、`bun scripts/package.ts --check` が CI で失敗する
- NEVER 要求されていない後方互換レイヤー・フォールバック分岐・非推奨API のシム・移行用の二重実装を追加しない。トランクベース開発で互換負債を溜めないため、古い挙動は削除して置き換える。互換維持が必要なときは requirements/NFR に明示された場合にのみ実装し、根拠を成果物に残す
- NEVER 既存テストの赤を「自分と無関係」を理由に無視して作業を続行したり、赤いスイートをグリーン・完了として報告したりしない。まずベースラインを確認し、直す(ボーイスカウト)か Issue 起票でフラグするかのいずれかを必ず行う
- NEVER 検証・ゲート・チェックの結果を実行結果から導出せずに構築しない — status のハードコード、自己参照比較(x === x)、両分岐が同一の条件式、どのコードも消費しない検証用フィールドはすべて「検証劇場」であり、偽の信頼を生む分だけゲート不在より悪い
- NEVER AI(leader・メンバー・サブエージェントを問わず)が PR のマージを自発的に実行しない。マージはその PR について人間の明示承認を得てから実行する。過去の承認や類似 PR の承認をもって次のマージの承認と見なさない (user decision 2026-07-09) <!-- cid:requirements-analysis:no-ai-merge -->
- NEVER leader・メンバーがメンバーセッションのライフサイクル操作(起動・再起動・despawn、tmux 直接操作を含む)を行わない。セッションは人間が identity ランナー(scripts/run-claude.sh / run-codex.sh、CLAUDE_IDENTITY 指定)で起動する。エージェント側は再起動が必要な状況の案内までに留める (user decision 2026-07-09) <!-- cid:requirements-analysis:no-session-lifecycle-ops -->

## Mandated

- ALWAYS `core/` または `harness/<name>/` を編集したら `bun scripts/package.ts` で dist を再生成し、`bun run promote:self` でセルフインストール(`.claude/` / `.codex/` / `.agents/` / `CLAUDE.md`)へ昇格して、両方を同一コミットに含める
- ALWAYS code-generation / functional-design のレビューゲートで、要求にない後方互換レイヤー・フォールバック分岐・移行シム・二重実装が混入していないかを reviewer が明示的に検査する。混入を発見したら、requirements/NFR に根拠が明示されていない限り是正するまでステージを完了させない
- ALWAYS 新設のゲート・検証スクリプト・チェックは、失敗ケースを注入して実際に赤くなることを実証してから完成扱いにする。生成するエビデンス(レポート/アーティファクト)が実行結果由来であること、および保存先まで実際に到達することを確認する。reviewer はコードを読んで承認するだけでなく、この「落ちる実証」を要求する

## Corrections

<!-- 自己学習ループがここに追記する。 -->
- Bolt のレビューが READY になった時点で「Bolt ブランチ切り出し+PR 発行」を明示的にタスク化する。エンジン指令・stage ファイルに現れない Way of Working 規範(Bolt 単位 PR、タグ発行等)は、該当イベント発生時に conductor がタスクリストへ載せて追跡する — 指令駆動ループの外にある規範は、タスク化しない限り実行されない(installer-distribution Bolt 1〜3 で PR 分割漏れを観測、遡及分割で是正) (learned 2026-07-08) <!-- cid:code-generation:code-generation:bolt-pr-taskization -->
- human-presence gate は conductor セッション自身の HUMAN_TURN を要求するため、遠隔 conductor の承認は委任承認 provenance(#671、実装済み)で行う: conductor がゲート準備完了を leader へ報告 → leader が delegate-approval を発行 → conductor が approve を再実行。ゲートの緩和・偽装(env での skip 等)は検証劇場 Forbidden により禁止。(superseded: #671 実装前の暫定運用「ユーザーが対象 tmux に1行タイプ」は 2026-07-09 の #671 マージで失効) (learned 2026-07-09) <!-- cid:requirements-analysis:human-presence-interim -->
- git stash refs は同一リポの全 worktree・全エージェントで共有される。共有されうる worktree では引数なしの git stash pop を使わず、stash は必ずラベル付きで作成し(git stash push -m)、適用はラベル/SHA を明示して行う(stash 交差適用事故を実観測、2026-07-09)。他エージェントの WIP stash に触れてしまった場合は内容のバイト一致を確認し、即座に所有者へ報告する。陳腐化した stash の不可逆 drop は急がず、無害なら放置してよい (learned 2026-07-09) <!-- cid:requirements-analysis:stash-discipline -->
- 並列実装をサブエージェントの worktree 隔離でファンアウトするとき、プロンプトに conductor 本線ツリーの絶対パスを書かない(参照ファイルは worktree 内相対パスで指示する)。あわせて『割当 worktree(タスク環境の worktreePath)以外での git 操作(checkout/stash/reset)禁止』を毎回明示する — 本線パスの混入は複数エージェントの本線誤入・共有 stash 汚染・未コミット工程記録の消失を引き起こす(bug-zero-batch code-generation で実測、patch-id 照合で復旧) (learned 2026-07-09) <!-- cid:code-generation:c2 -->
- bun --coverage は spawn したサブプロセスの実行を計測しない — カバレッジ対象にしたいロジックは CLI 直叩きテストだけでなく in-process の seam(関数直接呼び出し)でテストする。Codecov patch ゲート導入後は新規行がこの盲点に入るとゲートが赤になるため、seam 設計を実装時点で行う (learned 2026-07-09、integrity-batch B2 で実測) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:bun-coverage-spawn-blindspot -->
- Codex 0.144.0 は code_mode_host が既定有効で、環境に codex-code-mode-host 実体が無いと functions.exec 等のツール実行が失敗する。対策はバージョンを下げず ~/.codex/config.toml の [features] に code_mode_host=false を設定する(0.143.0 固定は gpt-5.6 が使えないため不採用)。確認手順: codex --version / codex features list / agmsg whoami・inbox (learned 2026-07-09、codex-engineer-1 の実復旧) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:codex-code-mode-host-workaround -->
- Codex の共有 app-server は起動時の feature 状態を保持し続けるため、~/.codex/config.toml の変更(code_mode_host=false 等)後も古い app-server が再利用されると症状が継続する。delivery.sh set monitor の再実行では app-server は入れ替わらない。復旧手順: 対象セッション終了 → delivery.sh set off codex <worktree> → set monitor → 再launch(app-server の作り直しまで含める) (learned 2026-07-09、codex-engineer-2 の実復旧) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:codex-app-server-stale -->
- agmsg send.sh は未登録の宛先名でも成功を返すため、宛先 typo は無音で不達になる(claude-3 の再起動後全報告が『leader』宛で不達になった実障害、2026-07-09)。対策: 宛先は必ず正確な実名(claude-leader / claude-engineer-N / codex-engineer-N)を使い、重要な報告で leader から反応がない場合は宛先名を疑って team.sh で実名確認する。長時間の無応答を検知した側(leader 含む)も、相手の送信不達の可能性を診断に含める (learned 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:agmsg-recipient-typo -->
- codex(GPT-5.6)の受信は当面 turn mode を既定運用とする(2026-07-09 ユーザー決定)。理由: 外部から走行中セッションを起こしつつ TUI に可視化する経路が Codex CLI 本体に存在しない(MCP 通知がモデルに届かない #18056、走行中通知ルーティング未実装 #15299/#17543、外部プロンプト注入 not planned #11415 — 一次情報認定)。既製 MCP ツールも同制約で解決不可。運用: leader は keep-alive で保留を検知して nudge を置き、確実に起こすのはユーザーの TUI 物理入力。Codex 本体が該当機能を実装したら monitor(push)へ復帰を再検討。tmux send-keys wake ウォッチャーは実装可能だが当面は採らない (learned 2026-07-09) (learned 2026-07-10) (dormant: all-claude-team 2026-07-10 の codex 退役中は適用対象なし — 再導入時の運用知識として温存) <!-- cid:requirements-analysis:requirements-analysis:codex-turn-mode-standing -->
- 複数 Bolt の code-generation は、編集正本と dist/self-install 再生成面がファイル単位で非交差なら worktree 隔離の並行ディスパッチを既定とする(交差する場合のみ直列化)。非交差判定は着手前に対象ファイル目録の突き合わせで行う (learned 2026-07-10) <!-- cid:code-generation:c6 -->
