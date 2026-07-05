# Requirements — GitHub Kanban Sync（260705-github-kanban-sync）

上流入力: [intent-statement.md](../../ideation/intent-capture/intent-statement.md)、[scope-document.md](../../ideation/scope-definition/scope-document.md)

対象 Issue: [#470](https://github.com/amadeus-dlc/amadeus/issues/470)

すべての要求は intent-statement.md の成功指標 1〜4 と scope-document.md の MoSCoW に遡る。
実装先はこのリポジトリ内限定の暫定開発ツールである（constraint-register C02 / C07）。

## 機能要求

### FR-1 台帳の Issue 参照（P1: registry-issues-field）

- FR-1.1: `intents.json` の各 entry は任意フィールド `issues`（数値配列、例 `[470]`）を持てる。フィールドが無い entry は空として扱う。
- FR-1.2: 既存の読み手（エンジン、validator、既存スクリプト）の挙動を変えない（追加的変更）。
- FR-1.3: 既存 entry のうち、Intent record（`aidlc-state.md` の Project 文、audit の Request 文）から Issue 番号を判別できるものへ遡及補完する。判別できない entry には付与しない（questions Q2 = A）。

出典: scope-document.md In-scope ①、Maintainer 承認（scope-definition DECISION_RECORDED）。

### FR-2 ローカルスキャン（P2: kanban-sync-manual）

- FR-2.1: `dev-scripts/kanban-sync.ts` は default space の `intents.json` と全 Intent の `aidlc-state.md` を読み、Intent ごとに次を抽出する: dirName、status、scope、Active Agent、Worktree Path、Current Stage、承認待ち有無（`[?]` の存在）、issues。
- FR-2.2: ホスト識別を audit shard ファイル名（`<host>-<clone>.md`）から抽出する。複数 shard がある場合は最終更新の shard を使う。
- FR-2.3: 承認待ち判定は `[?]` ステージの存在で行う（滞留イベントの追加解析は Won't）。

出典: intent-statement.md 成功指標 1、feasibility-assessment.md 確定事項 2。

### FR-3 board への冪等反映（P2）

- FR-3.1: 反映先は amadeus-dlc org の Projects v2（amadeus repo にリンク）とする。
- FR-3.2: 列（Status option）は Awaiting Approval / Ideation / Inception / Construction / Operation / Done の 6 個。承認待ちの Intent は phase 列より Awaiting Approval を優先する。completed の Intent は Done。
- FR-3.3: カスタムフィールドは Agent / Host / Worktree / Scope / Stage / Issue / Synced At の 7 個（+ Status）。カードタイトルは dirName。本文に Issue リンク、scope、worktree を書く。
- FR-3.4: 反映は冪等な全上書きとする。カードが無ければ作成し、あれば全フィールドを上書きする。複数 worktree から同時実行しても最終状態が一致する。
- FR-3.5: project / 列 / フィールドが存在しなければ作成する（board 初期構築を含む。wireframes.md、intent-backlog.md P2）。
- FR-3.6: 書き込みは `gh api graphql` の mutation で行う（C04）。
- FR-3.7: `Synced At` に sync 実行時刻を書く（鮮度表示）。

出典: rough-mockups/wireframes.md、feasibility-questions Q1 / Q2、scope-document.md Must。

### FR-4 認証・失敗時の扱い（P2）

- FR-4.1: `gh` 認証に `project` scope が無い場合、実行冒頭で検知して分かりやすいエラーで終了する（何も書き込まない）。
- FR-4.2: sync 失敗（オフライン、rate limit、scope 不足）は drop として記録し、次回実行で回復する。リトライ・通知は実装しない（Won't）。

出典: feasibility-questions Q3 / Q4、raid-log.md R01 / I01。

### FR-5 hook 結線（P3: kanban-hook-flush）

- FR-5.1: PostToolUse hook は、`aidlc/spaces/*/intents/**` 配下（`intents.json` を含む）への Write / Edit を検知したとき、ローカルキューへ 1 行追記するだけで終了する。ネットワークへ接続しない（C05）。
- FR-5.2: Stop / SessionEnd hook は、キューが空でなければ `kanban-sync.ts` を実行し、成功時にキューを消化する。直近 2 分以内に成功した sync があればスキップする（questions Q1 = A）。
- FR-5.3: hook はリポジトリローカルの設定として結線し、Amadeus 本体（`.agents/amadeus/hooks/`、`skills/`）へ追加しない（C02）。
- FR-5.4: flush の失敗は hooks-health と同型の drop 記録を残す（FR-4.2）。

出典: Issue #470 確定判断、constraint-register C05、feasibility-questions Q4。

## 非機能要求

- N1（冪等性）: FR-3.4 の全上書き設計により、同時・反復実行で最終状態が収束する。
- N2（レイテンシ）: PostToolUse hook はローカル追記のみで完了する。ツール実行の体感を悪化させない。
- N3（軽量実装）: 暫定機構として最小構成を保つ。統計・通知・リトライ戦略を追加しない（C07）。
- N4（依存）: 実行時依存は Bun + gh CLI のみ。npm 依存を追加しない（C03）。
- N5（実装先）: `dev-scripts/` とリポジトリローカル hook 設定のみに実装する。Amadeus 本体成果物（parity 対象）に触れない（C02）。

## 受け入れ条件（Issue #470 と対応）

1. 進行中の全 Intent の phase / stage、担当エージェント、ホスト、worktree、Issue が board から一覧できる（FR-2、FR-3）。
2. 承認待ち Intent が Awaiting Approval 列で確認できる（FR-3.2）。
3. sync は冪等で、複数 worktree から同時実行しても収束する（FR-3.4 / N1）。
4. hook がツール実行のレイテンシを体感悪化させない（FR-5.1 / N2）。
5. sync 失敗時に drop が記録され、次回実行で回復する（FR-4.2 / FR-5.4）。
6. board 側だけを手編集しても、次回 sync でローカル正へ収束する（FR-3.4）。

## スコープ外

double sync（board→ローカル）、statusline 表示、GitHub Actions 補完、他 workspace 掲載、計測・通知・統計（scope-document.md Out-of-scope / Won't）。
