# Code Summary — kiro-tui-live-e2e（Bolt 1）

## 結果

**direct branch 成立**（follow-up Issue 不要・未起票）。branch `bolt-kiro-tui-live-e2e`（base: `5fb23ec2a`）に 4 コミット: `8533c0a5b`（refactor）→ `baa2b79f7`（feat）→ `b18b8a170`（test）→ `10c73b6b2`（fix）。1530 insertions / 93 deletions。adapter 本体（kiro-tui.ts + kiro.ts）は 698 行で U3 の direct 見積 550〜900 行の範囲内。

## 実装前 live probe の知見

- Kiro の auth は source home 配下の SQLite DB で、env var による redirect 手段が存在しない（`KIRO_HOME` / `XDG_DATA_HOME` は無効）。scratch HOME は未認証になる。
- `kiro-cli chat` は `$HOME/.local/bin/kiro-cli-chat` を re-exec し、scratch HOME では ENOENT で死ぬ。
- いずれも scratch 側 **symlink**（Kimi precedent と同じ手法）で解決: 資格情報バイトは source home の外へ出ず、scratch へのコピーもなく、adapter は source 状態を書き換えず、scratch tree の削除で束縛全体が消える。
- 実装前に 0.07 credits で live end-to-end anchor 書き込みを確認済み。

## 追加・変更ファイル

- 新規: `tests/harness/live-e2e/kiro-tui.ts`（514）/ `kiro.ts`（184）/ `tmux.ts`（71）/ `scratch.ts`（39）、`tests/harness/kiro-tui-live.ts`（54）、`tests/integration/t-live-e2e-kiro-tui.integration.test.ts`（392）、`tests/integration/t-kiro-tui-live-gate.integration.test.ts`（116）、`tests/e2e/t-kiro-tui-kernel.serial.test.ts`（75）
- 変更: `registry.ts`（`kiro-tui` 行）、`journey.ts`（`createKiroTuiJourney`）、`claude-tui.ts` / `claude.ts`（抽出した tmux/scratch モジュールへ再配線、公開 export 不変）、`docs/harness-engineering/live-e2e.md`（safety boundary / runbook / matrix 再生成）

## テスト結果

- 新規 kiro テスト: 17 pass / 0 fail（53 assertions）
- live journey（`AMADEUS_KIRO_TUI_LIVE=1`）: 1 pass 約 9 秒、実モデル turn、anchor 検証、cleanup closed、ledger 追記。3 回連続で全緑、scratch root / socket / kiro-cli プロセスの残存ゼロ
- 共有抽出後の claude-tui 回帰: 12 pass / 0 fail
- 収束（worktree）: BUILD_RC=0 / TYPECHECK_RC=0 / TEST_CI_RC=0（820 files / 10789 assertions / 0 fail）/ LINT はベースライン同値（411 warnings）
- referee 検証: `amadeus-swarm check` converged / untampered、`finalize --batch 1` 成功（SWARM_UNIT_CONVERGED / SWARM_COMPLETED 記録済み）

## 実測で発見した欠陥（3 件、いずれも修正済み）

1. tmux socket path が macOS の UNIX socket 約 104 byte 制限を超過 → tmpdir 配下の短い run-identified 名へ移動し、長さガードと cleanup 時の明示 unlink を追加
2. pane 内で bare binary 名が死ぬ（tmux は shell 経由で pane コマンドを起動し、shell 起動ファイルが PATH を書き換える）→ child PATH に対して絶対パス解決
3. cleanup が scratch root をリークしたまま closed を報告（kill された child が削除後に scratch HOME 配下へファイルを再作成、tmux は kill-server で socket を unlink しない）→ server 自身の消滅を待ってから scratch を削除・再検証し、いずれの失敗も cleanup failure として PASS を禁止

## 設計からの逸脱（2 件、承認ゲートで裁定）

1. **launch が `--agent kiro_default` を固定**: dist/kiro 導入済み環境では shipped `amadeus` conductor が workspace 既定 agent になり、scratch project で turn が完了しない（transport は健全なのに 180 秒 timeout）。journey の測定対象を TUI transport に限定するための固定で、claude-tui が project-only settings + hooks 無効で走る構図と同型。conductor-on-Kiro の workflow journey は既存の `tests/e2e/t-tui-kiro-intent-capture.serial.test.ts` が担う。
2. **retry は maxAttempts:1**: 設計の retryable-code 集合（`tmux-start-collision` / `kiro-startup-capacity` / `provider-throttled-before-anchor`）は未実装。共通 kernel の `runLiveJourney` が全 adapter で 1 attempt 固定であり、retry 実装は kernel 変更（本タスクで禁止）を要するため。その他の規則（gate 優先順位、planned-before-created registry、順序付き冪等 cleanup、cleanup-before-PASS、error 優先順位、bounded evidence）は設計どおり。

## 別トリアージ推奨の発見（本 Unit スコープ外）

isolated scratch HOME 下で amadeus conductor agent が wedge する（おそらく dist/kiro hooks が PATH 上の `bun` を要求）。本 Unit では追跡していない。

## 補足

- `kiro-tui` は既存の `AMADEUS_KIRO_TUI_LIVE` キーを再利用しており、既存の conductor TUI journey も同時に発火する。
- コミット済み `runs.jsonl` は不変（live run は kernel 設計により per-pid tmp ledger へ書く）。matrix の `kiro-tui` 行は他 adapter と同じく UNVERIFIED 表示。
