# Business Logic Model — u003-kanban-hooks

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## QueueHook（PostToolUse）の処理フロー

```
stdin JSON（Claude Code hook 入力）
  0. process.stdin.isTTY なら exit 0（対話シェルからの手動起動でハングしない。既存 hook 規約と同じ）。JSON parse 失敗も exit 0
  1. tool_name が Write / Edit 以外 → exit 0（FR-5.1 の宣言範囲どおり。拡張しない）
  2. tool_input.file_path を正規化し、aidlc/spaces/default/intents/ 配下でなければ → exit 0
  3. path が intents.json そのもの → queue へ "*" を 1 行追記して exit 0
  4. path から record dirName（intents/ 直下のセグメント）を抽出 → queue へ dirName を 1 行追記して exit 0
  ※ ネットワーク・child process・重複排除なし（追記のみ。重複は flush 側で uniq する）
```

## FlushHook（Stop / SessionEnd）の処理フロー

```
stdin JSON
  0. process.stdin.isTTY なら stdin を読まない（Stop / SessionEnd では stdin の内容自体を使わない）
  0.5 孤立 queue.processing（前回プロセスの強制終了で残ったスナップショット）が存在すれば、
      内容を queue へ行単位 append してから削除する（回収。永久孤立を防ぐ）。
      同一 worktree での FlushHook 同時実行は想定しない（Stop / SessionEnd はセッション直列。
      仮に競合しても回収は重複 sync に留まり、N1 の冪等性で自己修復される）
  1. queue が無い / 空 → exit 0
  2. last-success が 2 分以内 → exit 0（同一セッション連続起動の抑止。FR-5.2）
  3. queue を queue.processing へ rename して専有する（TOCTOU 対策。rename 後に別セッションの
     QueueHook が追記する行は新しい queue に入り、次回 flush が拾う。取りこぼしなし）
  4. queue.processing を読み、uniq した dirName 群と "*" に分離する
  5. "*" があれば drops.log へ「registry 変更あり、メインリポジトリでの手動 --all が必要」を 1 行追記（自動実行しない。D-AD11）
  6. dirName 群が空でなければ `bun <PROJECT_DIR>/dev-scripts/kanban-sync.ts --dirs <csv>` を
     cwd = PROJECT_DIR、timeout = 60 秒（spawnSync の timeout。amadeus-stop.ts の
     ENGINE_TIMEOUT_MS と同じ流儀）で同期実行
     - 成功: queue.processing を削除、last-success を現在時刻で更新
     - 失敗 / timeout: drops.log へ 1 行追記し、queue.processing の内容を queue へ行単位 append で
       戻して削除（次回 flush で再試行。FR-5.4 / FR-4.2。順序は先頭に戻さない —
       flush は毎回 uniq した全件を対象にするため順序は結果に影響せず、
       行単位 append は同時追記との読み取り結合競合を避ける）
  7. 常に exit 0（hook は失敗を伝播させない）
```

## worktree ルート（PROJECT_DIR）の解決

hook は `process.cwd()` を信用しない（既存 hook 規約 `resolveProjectDirFromHook` と同じ知見）。
PROJECT_DIR は `CLAUDE_PROJECT_DIR` 環境変数を最優先とし、無ければ hook 自身のスクリプトパス（`import.meta.url`）から repo ルートを逆算する。
`.claude/settings.json` の hooks command も既存 hook と同様に `bun $CLAUDE_PROJECT_DIR/dev-scripts/kanban/hooks/... ` の絶対パス形式で結線する。
QueueHook の書き先・FlushHook の読み先・子プロセスの cwd と CLI パスは、すべてこの同一の PROJECT_DIR から解決する（場所の食い違いによる無音の機能不全を防ぐ）。

## 状態ファイルの位置解決

`.claude/kanban-sync/{queue,queue.processing,last-success,drops.log}` は **PROJECT_DIR（= その worktree のルート）**配下に置く。
メインリポジトリと各 worktree で独立し、他 worktree のキューを読まない（D-AD7 改訂と同じ分離規律）。
ディレクトリが無ければ hook が作る。`.gitignore` に `/.claude/kanban-sync/` を追加する。
