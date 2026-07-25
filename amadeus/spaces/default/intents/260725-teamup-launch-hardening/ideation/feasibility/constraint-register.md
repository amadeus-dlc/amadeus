# Constraint Register — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`

- `intent-statement.md` — 「スコープ」節（含む／含まない）と「出荷方針」「完了条件」を引き、下記の制約が本 intent のどの境界に効くかを対応づけた。

測定 ref: HEAD `c4c9531ee`。実測値は feasibility の2実験による。

## 外部依存の制約（変更不可）

| # | 制約 | 出典（実測） | 設計への影響 |
|---|---|---|---|
| C-1 | actas モードの watcher は delivery mode が `monitor` または `both` のときだけ起動する | claude-code ドライバ `template.md:144-148` step 5d（verbatim: `Only if the project's delivery mode is \`monitor\` or \`both\``）＋実験1/2の対照 | 初期プロンプトを actas へ変えるだけでは不十分。`delivery.sh set monitor` が先行する必要がある（`team-up.sh:877-879` が既に実行済み） |
| C-2 | ready sentinel を書くのは actas モードの watcher のみ | `watch.sh:307`（書込）、ガード `:300`、`ACTIVE_NAME` は `:43` の第4位置引数 | monitor モードのままでは検証が成立しない（#1449 で確定済み） |
| C-3 | actas は受信範囲を `<name>` 宛のみに制限する | `template.md:148`（verbatim: `restricts the subscription to messages addressed to \`<name>\` only`） | チームモードは1 worktree に1ロールのため実質同等と見込むが、要検証 |
| C-4 | actas は排他ロックを事前クレームし、他セッション保持時は **abort** する | `template.md` step 4（`status=held` → abort）、`watch.sh:185` `actas_lock_state` / `:203` `actas_lock_claim` | resume（`-c`）や異常終了後の再起動でロックが残存すると起動失敗しうる |
| C-5 | agmsg は repo 外（`~/.agents/skills/agmsg/`）にあり本 intent では変更しない | `project.md` の正本境界 | 修正はすべて `team-up.sh` 側に閉じる。agmsg の挙動は実測して合わせる |
| C-6 | `git worktree add` は並列度を上げすぎるとスループットが劣化する | 実測: 並列度4 = 3.32秒、並列度7 = 7.55秒（直列 7.39秒） | 並列度に上限を設ける。無制限 fan-out は退行 |
| C-7 | 並列 `git worktree add` は `.git` ロックで**失敗しない** | 実測: 全並列度で成功 7/7、stderr 0 bytes | ロック競合対策のリトライ機構は不要 |

## プロジェクト規約の制約

| # | 制約 | 出典 |
|---|---|---|
| C-8 | 正本は `packages/framework/core/tools/`、`dist/` と self-install は生成物。同一変更で同期する | `project.md` Mandated |
| C-9 | `bun run dist:check` / `promote:self:check` をマージ前検証に含める | `project.md` Mandated |
| C-10 | 新設ゲート・検証は失敗ケースを注入して実際に赤くなることを実証してから完成扱いにする | `org.md` Mandated（落ちる実証） |
| C-11 | 要求されていない後方互換レイヤー・移行シム・二重実装を追加しない | `org.md` Forbidden |
| C-12 | 実 FS・プロセスを使うテストは integration 層に置く | `cid:code-generation:fs-tests-integration-first` |
| C-13 | 検証結果を実行結果から導出しない構造（検証劇場）を作らない | `org.md` Forbidden |

## 本 intent 固有の制約（裁定由来）

| # | 制約 | 出典 |
|---|---|---|
| C-14 | U1（#1476）と U2（#1478）はユニットごとに別 PR で出荷する | Q1 裁定 A |
| C-15 | actas 移行が配送セマンティクスを壊す場合は、別 readiness 指標へ切り替える（撤去・中断はしない） | Q2 裁定 B |
| C-16 | 完了条件は「検証が実際に成功する」「起動時間が 5.87秒から短縮される」の両実測 + テスト構造の是正 | Q3 裁定 A |
| C-17 | **U1 の PR は待機設計の変更を必ず含む** | feasibility 総合判定（32.2秒/1メンバーの実測に基づく必須条件） |

## 数値制約（実測由来）

| # | 値 | 出典 |
|---|---|---|
| C-18 | 1メンバーの actas arming 実測 = **32.2秒**（コールドスタート含む） | 実験2 |
| C-19 | worktree 直列7個 = **7.39秒** / 並列度4 = **3.32秒** | U2 実験 |
| C-20 | 現行の起動時間ベースライン（3人構成）= **5.87秒 / exit 0** | 前 intent 260725-teamup-attach-latency の実測 |
| C-21 | 現行定数: `WATCHER_READY_TIMEOUT=90`（`:108`）、`WATCHER_RESEND_MAX=1`（`:114`） | 実ファイル直読 |
