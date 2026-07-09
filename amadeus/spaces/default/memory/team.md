# Team-Level Rules

> このチームが承認したプラクティスと是正事項。org.md を上書きする。practices-discovery の承認ゲートで記入される。原則としてゲート経由で編集し、直接編集しない。

## Way of Working

このリポジトリは `main` を中心に、短命ブランチから Pull Request 経由で変更を取り込む GitHub Flow / トランクベース寄りの運用を採用する。実装時は `core/` または `harness/<name>/` を編集元とし、`dist/` とセルフインストールツリーは生成物として `bun scripts/package.ts` と `bun run promote:self` で同期する。

amadeus/ ワークスペース(record: state・per-clone 監査シャード・intents.json、memory、codekb、knowledge)は version-controlled。**チェックポイント(ワークフローのパーク時・ステージ完了時・セッションや1日の終わり)で `amadeus/` ツリーごとコミットする**。監査シャードは per-clone・append-only(`<record>/audit/<host>-<clone>.md`、読み取りは `audit/*.md` の glob マージ)で競合しないため、監査だけの専用コミットは通常不要 — チェックポイントのコミットに自然に含める。

amadeus 実行中に、現在の intent と関連して一緒に扱う必要はあるが、同じ intent に含めると目的や成果物の焦点がぼやける課題を見つけた場合は、発見時点では intent 粒度を気にせず GitHub Issue として起票し、リンクを会話・関連成果物・必要なら stage diary に残してから本線の作業へ戻る。質問の選択肢で非採用にした案や、単にスコープ外と判断しただけの案を機械的に Issue 化しない。

起票済み Issue は、必要に応じて intent 単位になるように親 Issue を追加して整理する。Issue 起票の粒度と intent 設計の粒度を同時に決めようとして、発見時点の記録を遅らせない。

Construction の成果は Bolt ごとに PR/スカッシュマージする。複数ユニット・工程記録の一括反映・無関係なリファクタを単一 PR に束ねない — 束ねると walking-skeleton ゲートと人間レビューの実効性が失われる。工程記録(`amadeus/` ツリー)はチェックポイントごとのコミットで本線へ流し、実装 PR を肥大化させない。

- intent の明確化質問はエージェント間選挙で回答を作る: leader が質問を全メンバーへ配信し、各自がコード・Issue を実測確認して投票、多数決で採用する。ユーザーへのエスカレーションは同数(3対3等)のときのみ。多数決が成立した質問は選挙結果をそのまま採用する (learned 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:election-protocol -->
- 進捗管理は報告制: leader はメンバーへ進捗ポーリングをしない。タスクディスパッチ時に完了・ブロッカーの自発報告を義務付け、報告が来るまで待つ (learned 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:push-reporting -->
- org/team/project の memory 層で既決の規範は選挙・質問の対象にせず、そのまま適用する。質問起草時に既決照合を先に行い、真に未決の設計判断だけを問う (learned 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:no-election-for-decided-norms -->
- leader は作業をしない: 実装・成果物作成・intent の conductor 役はすべてメンバーへ委任し、leader はユーザー⇔メンバーの中継、ゲート執行、選挙の配信と集計、Issue/PR 管理、進捗監視に徹する。leader が手を動かし始めたら移管する (learned 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:leader-no-work -->
- ステージゲート(プラン承認含む)は auto 承認とする: conductor は reviewer READY・センサー通過・成果物実在を確認したうえで、ユーザー中継なしで承認して先へ進む。ユーザーへのエスカレーションは (1) 選挙の3対3同数 (2) 失敗・ブロッカー (3) PR マージ判断(no-AI-merge ルール)のみ (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:auto-gate-approval -->
- 失敗・ブロッカーが発生したら、conductor は状況と解決の選択肢(回避策・修正案・スコープ変更等、可能な限り複数)を leader へ送り、leader がエージェント間選挙にかけてより良い選択を探す。多数決成立なら結果を採用して続行し、3対3の同数のときのみユーザーへエスカレーションする。ユーザーエスカレーションは (1) 選挙の3対3同数 (2) PR マージ判断 に集約される (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:blocker-election -->
- PR を作成したら、作成者(conductor/メンバー)は即座に空いている codex メンバーへ直接レビューを依頼し、leader への PR 報告にはレビュアー名を含める。複数 PR が並ぶときは codex 3名に分散する。レビュー観点の既定: 完全性(grep 等の実測)、dist/self-install 同期、surgical、落ちる実証、検証エビデンスの実測 exit code (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:codex-review-on-pr -->
- メンバーの役割分担: codex メンバーにはレビュー・ディープリサーチ(調査・検証・トリアージ)系のタスクを割り当てる。実装・conductor 役は claude メンバーが担う。選挙は全員参加のまま (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:codex-role-specialization -->
- 潜在バグ探索タスクでは修正を行わない: 発見バグは file:line で裏取りした実測のみを GitHub Issue に起票する(推測起票・重複起票禁止)。修正は claude メンバーへの別タスクとして割り当てる (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:bughunt-file-only -->
- 当面の対応スコープはバグのみ: 新規タスク・intent はバグ修正に限定し、enhancement 系は起票・トリアージまでに留めて着手しない。進行中の enhancement intent は park のまま凍結。例外は、バグ対応自体の前提となるインフラ作業(例: #671)のみ (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:bugs-only-scope -->
- intent・タスクのディスパッチは leader のみが行う。メンバーは割り当てられていない作業を自発的に開始しない(発見事項は Issue 起票・報告まで)。作業が完了したら leader へ報告し、次の作業指示を仰いで待機する (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:leader-dispatch-authority -->
- leader はオープンバグゼロを目標として運営する: バグの起票・トリアージ・バッチ編成・割当を能動的に回し、アイドルメンバーを作らない。実装待ちのバグには codex の事前深掘り(根本原因・再現・修正案の選択肢)を先行させ、requirements・選挙を高速化する (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:bug-zero-goal -->
- Issue を起票したら、起票者以外のメンバー2名がその Issue をレビューする(ハルシネーション対策): 主張を実コードと突き合わせ、実在確認・訂正・却下を Issue コメントとして残す。2名の確認が揃うまでその Issue は修正バッチに組み込まない (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:issue-cross-review -->
- amadeus の利用中に見つけた不備・不具合・改善点は必ず Issue として起票する(leader 含む誰が見つけても)。起票したらハルシネーション対策レビュー(起票者以外2名の実コード照合)を必ず依頼する — 対象は自発起票・ユーザー指示起票を問わず全 Issue (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:dogfood-issue-cross-review -->
- PR マージの執行手順: leader が PR ごとに CI green・レビュー READY を実測確認してユーザーへ「これをマージしますか?」と確認し、承認を得たら leader が gh pr merge(スカッシュ)を実行する。人間が GitHub のマージボタンを押す運用はしない。Forbidden の no-AI-merge ルールは「承認なしの自発マージ禁止」の意味であり、この承認後執行と両立する (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:leader-executes-merge -->
- フロー効率よりリソース効率を優先する: 単一アイテムのリードタイム最適化のために全体を待たせない。leader は逐次のピンポンを避けて作業をバッチで委任し、メンバーの手が空かないよう並行割当を維持する (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:resource-efficiency -->
## Walking Skeleton

この intent は既存フレームワークへのインクリメンタルな npm インストーラ実装だが、配布経路がユーザー体験の入口になるため、最初の Construction Bolt は小さな end-to-end スライスとして扱う。最初に最小の `@amadeus-dlc/setup` 実行経路を通し、以後の拡張前に人間がゲートで確認する。

## Testing Posture

テストは TypeScript で `tests/` 配下に追加し、Bun ベースの既存ランナーで検証する。PR/CI の基準は `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci` で、インストーラ実装では少なくとも CLI 契約・配布物ドリフト・セルフインストール互換をカバーする。

タスク実行中に既存テストが赤い場合、「自分と無関係」を理由に無視して作業を進めたり、スイートをグリーンとして報告・完了扱いしたりしない。まずベースライン(自分の変更前から赤かったか)を確認し、自分の変更で赤くしたテストは必ず直す。変更前から赤い無関係なテストは、原因が明快で安全・低コストに直せるなら同一 PR で直す(ボーイスカウトルール)。直すのが大きい・リスキー・他者の作業中の場合は、黙って進めず GitHub Issue を起票し会話でフラグしてから本線に戻る(Way of Working の Issue 起票ノルムに合流する)。無関係な赤の是正で本線のスコープを不必要に膨張させない。

## Deployment

デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理する。GitHub Actions は push と pull_request で typecheck、lint、dist/self-install drift guard、smoke+unit+integration tests を実行し、リリース前には必要に応じて `--release` テスト層を追加する。

リリースは release.yml の workflow_dispatch 一本で行う: release-it がバージョンバンプ(`after:bump` の `scripts/release-version-sync.ts` が `packages/setup/package.json`・`amadeus-version.ts`・README バッジ・`dist/`・セルフインストールツリーを機械的に同期)→ `vX.Y.Z` タグ発行 → GitHub Release ノート自動生成 → npm publish まで完結する。手書きの CHANGELOG.md は持たず(2026-07-09 削除)、PR や amadeus ワークフローがバージョンを上げることもない。タグはインストーラ(`@amadeus-dlc/setup`)の配布物取得先として参照される。

## Code Style

TypeScript/ESM と Bun 直接実行を前提に、既存の `amadeus-` プレフィックス、`packages/framework/` 配下のハーネス中立 `core/` とハーネス別 `harness/<name>/` という境界を守る。フォーマッタは無効、lint は Biome、型検査は `tsc --noEmit` の2構成で行い、ツール・フックには実行ビットを要求しない。

新設パッケージ(`packages/*`)は、lint(Biome)と型検査(`tsc --noEmit`)の配線を**パッケージを追加する同一 PR で**追加し、既存の狭い CI lint スコープ(`tests/` のみ)を継承しない。
リリース(`@amadeus-dlc/setup` の npm publish)は **release.yml の1ボタン運用**とする: workflow_dispatch で bump レベルを選ぶと、release-it が version bump→コミット→`setup-vX.Y.Z` タグ→main へ直接 push し、同一ランで GitHub Release(ノート自動生成)と provenance 付き publish まで完結する。**このバンプコミットのみ、PR/5ゲートを経ずに main へ入る明示的な例外**として承認する(release-it が行う1行の version 変更に限定。2026-07-09 ユーザー決定)。それ以外のコミットは従来どおり PR 経由。

## Forbidden

- NEVER `dist/<harness>/` 配下を手編集する — 生成物であり、`bun scripts/package.ts --check` が CI で失敗する
- NEVER 要求されていない後方互換レイヤー・フォールバック分岐・非推奨API のシム・移行用の二重実装を追加しない。トランクベース開発で互換負債を溜めないため、古い挙動は削除して置き換える。互換維持が必要なときは requirements/NFR に明示された場合にのみ実装し、根拠を成果物に残す
- NEVER 既存テストの赤を「自分と無関係」を理由に無視して作業を続行したり、赤いスイートをグリーン・完了として報告したりしない。まずベースラインを確認し、直す(ボーイスカウト)か Issue 起票でフラグするかのいずれかを必ず行う
- NEVER 検証・ゲート・チェックの結果を実行結果から導出せずに構築しない — status のハードコード、自己参照比較(x === x)、両分岐が同一の条件式、どのコードも消費しない検証用フィールドはすべて「検証劇場」であり、偽の信頼を生む分だけゲート不在より悪い

- NEVER AI(leader・メンバー・サブエージェントを問わず)が PR のマージを自発的に実行しない。マージはその PR について人間の明示承認を得てから実行する。過去の承認や類似 PR の承認をもって次のマージの承認と見なさない (user decision 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:no-ai-merge -->
## Mandated

- ALWAYS `core/` または `harness/<name>/` を編集したら `bun scripts/package.ts` で dist を再生成し、`bun run promote:self` でセルフインストール(`.claude/` / `.codex/` / `.agents/` / `CLAUDE.md`)へ昇格して、両方を同一コミットに含める
- ALWAYS code-generation / functional-design のレビューゲートで、要求にない後方互換レイヤー・フォールバック分岐・移行シム・二重実装が混入していないかを reviewer が明示的に検査する。混入を発見したら、requirements/NFR に根拠が明示されていない限り是正するまでステージを完了させない
- ALWAYS 新設のゲート・検証スクリプト・チェックは、失敗ケースを注入して実際に赤くなることを実証してから完成扱いにする。生成するエビデンス(レポート/アーティファクト)が実行結果由来であること、および保存先まで実際に到達することを確認する。reviewer はコードを読んで承認するだけでなく、この「落ちる実証」を要求する

## Corrections

<!-- 自己学習ループがここに追記する。 -->
- Bolt のレビューが READY になった時点で「Bolt ブランチ切り出し+PR 発行」を明示的にタスク化する。エンジン指令・stage ファイルに現れない Way of Working 規範(Bolt 単位 PR、タグ発行等)は、該当イベント発生時に conductor がタスクリストへ載せて追跡する — 指令駆動ループの外にある規範は、タスク化しない限り実行されない(installer-distribution Bolt 1〜3 で PR 分割漏れを観測、遡及分割で是正) (learned 2026-07-08) <!-- cid:code-generation:code-generation:bolt-pr-taskization -->
- human-presence gate は conductor セッション自身の HUMAN_TURN を要求するため、遠隔 conductor の auto 承認はそのままでは成立しない(選挙 6:0 で決定、2026-07-09)。恒久対応は委任承認 provenance の第一級化(Issue #671)。それまでの暫定運用: conductor はゲート到達時に leader へ「ゲート準備完了」を報告し、leader がユーザーへ「対象 tmux セッションに1行タイプ」を依頼、タイプ後に conductor が approve を再実行する。ゲートの緩和・偽装(env での skip 等)は検証劇場 Forbidden により禁止 (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:human-presence-interim -->
- 共有されうる worktree では引数なしの git stash pop を使わない — stash は必ずラベル付きで作成し(git stash push -m)、適用はラベル/SHA を明示して行う(stash 交差適用事故を実観測、2026-07-09)。陳腐化した stash の不可逆 drop は急がず、無害なら放置してよい (learned 2026-07-09) (learned 2026-07-09) <!-- cid:requirements-analysis:requirements-analysis:stash-discipline -->
