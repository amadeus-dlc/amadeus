# journal-logger 運用手順書

この文書は、journal-logger（agmsg 専任メンバー）の起動・運用・日次 PR の手順を定義する（Issue #557。契約は [journal/README.md](../journal/README.md)）。初回起動と運用は人間 / leader が行う（本 Intent では実 spawn しない = ディスパッチ指示）。

## 1. worktree 準備（初回のみ）

```sh
cd /path/to/amadeus  # primary checkout
git fetch origin main
git worktree add ../amadeus-worktree/journal-logger origin/main
```

- journal-logger は `amadeus/spaces/default/journal/` を単独所有する（他メンバーは journal/ へ直接書き込まない）。
- 作業 branch は日次で `logger/journal-<YYMMDD>` を最新 origin/main から作る。

## 2. 起動（agmsg spawn。実測: ~/.agents/skills/agmsg/scripts/spawn.sh の usage）

tmux 内の leader セッションなどから:

```sh
~/.agents/skills/agmsg/scripts/spawn.sh claude-code journal-logger \
  --project /path/to/amadeus-worktree/journal-logger \
  --boot-prompt "$(cat <<'PROMPT'
（役割 prompt は本文書の §5 を全文貼り付ける）
PROMPT
)"
```

- spawn.sh は pre-join → tmux pane / OS ターミナル起動 → `/agmsg actas journal-logger` を初期プロンプトで実行し、既定では watcher の ready まで待つ（`--no-wait` で省略可、`--ready-timeout <秒>` 既定 90）。
- 軽量モデルで可（起動時のモデル選択は起動側 CLI の設定に従う。定型整形 + 追記 + 固定 ack の複雑度のため）。

## 3. 日次 PR（draft ルール準拠）

1. 当日分の追記が落ち着いたら（目安 = 日付変更またはキリの良い節目）、`git add amadeus/spaces/default/journal/ && git commit`。
2. `git fetch origin main && git rebase origin/main`（journal/ は単独所有 + 追記専用のため conflict は原則発生しない）。
3. `npm run test:all` と validator（journal 検査を含む）を実行して記録。
4. `gh pr create --draft` で作成し、CI green + コメント決着 + 検証記載で ready 化 → leader へ merge 依頼（恒常ルール）。

## 4. 不達時 fallback

- journal-logger が応答しない（ack が返らない）場合、送信者は leader へ直接記録を依頼する（leader が復旧まで #556 方式の手動記録または再 spawn を判断）。
- 再 spawn: §2 を再実行（worktree と journal/ は残っているため冪等）。actas ロックが残る場合は前セッションで `/agmsg drop journal-logger` を先に実行する。

## 5. 役割 prompt（spawn の --boot-prompt に渡す全文）

```text
あなたは agmsg チームの journal-logger である。役割は次に限定される。

1. 【受信 → 整形追記】任意のメンバーから agmsg でメッセージを受けたら、amadeus/spaces/default/journal/<今日のYYMMDD>.md の末尾へ、契約（amadeus/spaces/default/journal/README.md）のエントリ形式（## HH:MM:SSZ <種別> — <要約> + 発信者/種別/本文/昇格 の 4 フィールド、種別は 調停/委任/体制/観察）で追記する。ファイルがなければ「# journal <YYMMDD>」の見出しで新設する。
2. 【ack 必須】追記に成功したら、送信者へ 1 メッセージの固定形式で返す:
   「【journal 追記】<YYMMDD>.md#<見出しアンカー> に記録（種別: X）。仕分け: <生ログ | learnings 候補（→ 該当 Intent の §13 へ） | steering 候補（→ 反映 Intent バックログへ）>。<候補の場合は 1 行の提案理由>」
   追記に失敗したら、失敗した旨と原因を必ず返す（無言の失敗禁止）。
3. 【仕分けは提案のみ】memory / knowledge への定着を自分で行わない。決定権は §13 の human gate と steering 反映 Intent にある。
4. 【追記専用】記録済みエントリを書き換えない。唯一の例外は、メンバーから昇格の事実（cid:... / PR #n）を受けたときに該当エントリの「昇格:」フィールドへスタンプを追記すること。
5. 【日次 PR】手順書（amadeus/spaces/default/knowledge/journal-logger-runbook.md）の §3 に従い draft PR を作る。merge は人間。
6. 【越権禁止】journal/ 以外のファイルを変更しない。Issue の起案・クローズをしない。他メンバーへの指示をしない。
```

## 6. 停止

- 平常時: `/agmsg despawn journal-logger`（spawn した側のセッションから）または対象セッションで `/agmsg drop journal-logger` → セッション終了。
- 未 push の追記が残っていないかを despawn 前に確認する（残っていれば §3 を先に実施）。
