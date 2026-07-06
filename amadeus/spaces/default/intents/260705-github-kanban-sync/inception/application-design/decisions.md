# Design Decisions（260705-github-kanban-sync）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)

| ID | 判断 | 根拠 | 却下した代替 |
|---|---|---|---|
| D-AD1 | カードは draft issue として作成し、タイトル = dirName で同定する | Intent は必ずしも単一 Issue と 1 対 1 でなく（issues は配列）、実 Issue を board item にすると Intent と Issue の粒度がずれる。draft issue なら board 専用の表現にできる | 実 Issue の item 化（Issue が無い Intent を表現できない） |
| D-AD2 | Lifecycle Phase = INITIALIZATION の Intent は Ideation 列に丸める | 列は 6 個で確定済み（FR-3.2）。Initialization は数分で通過する起動フェーズであり、専用列の価値が無い | Initialization 列の追加（列定義の変更になる） |
| D-AD3 | 冪等性は「タイトル索引 → upsert 全上書き」で実現し、削除は行わない | registry から entry が消えることは想定しない（前提 A01 系）。削除ロジックは軽量方針に反する | 完全ミラー（board 側の余剰 item を削除） |
| D-AD4 | 1 card = 1 GraphQL リクエスト（フィールド更新 mutation を alias で束ねる） | `gh project item-edit` の 1 呼び出し 1 フィールド制約（C04）を回避しつつ、実装を単純に保つ。Intent 数は十数件で rate limit に遠い | 全 card を 1 リクエストに束ねる（クエリ生成が複雑化） |
| D-AD5 | hook の状態は `.claude/kanban-sync/` に置き、gitignore する | 既存 hooks-health と同じ「repo 内・非コミット」の慣行に合わせる | ホーム配下（worktree 間で repo 単位の分離がしにくい） |
| D-AD6 | FlushHook は CLI を child process で同期実行する（ライブラリ直 import しない） | hook と CLI の境界を保ち、CLI 単体の手動実行（P2）と同一経路で検証できる | hook 内でライブラリ関数を直接呼ぶ（経路が二重になる） |
| D-AD7（改訂） | worktree からの自動 flush は、その worktree のキューに載った Intent の record だけを cwd の `aidlc/` から読んで部分 sync する（`--dirs`）。全 Intent の一括 sync（`--all`）はメインリポジトリのチェックアウトでの手動実行に限る | worktree のチェックアウトは分岐時点の他 Intent record を含むため、全上書きすると他 worktree の実況を古い値へ退行させる（architecture reviewer 指摘 #2）。自分が書いた record だけを書けば、各カードの書き手はその Intent の作業 worktree に限られ、退行が起きない | (a) cwd 全上書き（他 Intent カードの退行）、(b) メインリポジトリ固定（自 worktree の実況が拾えない）、(c) 全 worktree 横断で Intent ごとに最新実体を選ぶ（軽量方針に反する複雑さ） |
| D-AD8 | project の解決は org=amadeus-dlc、title="Amadeus Intents" の固定値とする（定数） | 暫定機構であり設定化しない（C07）。board 作成は人間操作（C11）なので、名前は decisions で固定して人間と共有する | CLI 引数化・設定ファイル化（軽量方針に反する） |
| D-AD9 | hook の実体は `dev-scripts/kanban/hooks/` に置き、`.claude/settings.json`（非 symlink の実ファイル）の hooks 設定から直接指す | `.claude/hooks/` は `.agents/amadeus/hooks/`（Amadeus 本体、parity 照合対象）への symlink であり、そこへの書き込みは C02 / N5 違反になる（architecture reviewer 指摘 #1） | `.claude/hooks/` 配下への設置（symlink を辿って本体へ書いてしまう）、parity-map.json への例外登録（本体へ機能を足さないという原則が崩れる） |
| D-AD10 | FR-1.3 の遡及補完は、P1 の PR 内で実装者が `intents.json` を直接編集して行う（ワンショット。スクリプト化しない） | 対象は既存 9 entry 程度で一度きり。判別根拠（aidlc-state.md の Project 文、audit の Request 文）は人が読む判断を含むため、スクリプト化の価値が無い（C07） | 補完スクリプトの実装（使い捨てコードの追加） |
| D-AD11 | queue の `*`（`intents.json` 直接更新）は自動 flush の対象にしない。FlushHook は `*` を drop 記録（「registry 変更あり、手動 `--all` が必要」）へ落として消化し、CLI は worktree からの `--all` を明示エラーで拒否する（二重ガード） | `*` → `--all` の自動実行は、worktree の古いチェックアウトで全カードを上書きし D-AD7 改訂の安全性（自動 flush は他 Intent を壊さない）を破る（architecture reviewer 再指摘）。registry 変更（Intent birth 等）の board 反映は低頻度であり、手動 `--all` への委譲で足りる | (a) `*` を `--all` として自動実行（退行の再導入）、(b) intents.json の diff から変化 dirName を特定（暫定機構に対して複雑） |
