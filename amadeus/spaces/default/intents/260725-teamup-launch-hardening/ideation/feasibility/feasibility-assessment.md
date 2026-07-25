# Feasibility Assessment — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`

- `intent-statement.md` — 「アプローチ（未確定 — feasibility で実測する）」節が挙げた2つの未検証前提（actas 移行の配送セマンティクス影響、並列 `git worktree add` のロック競合）を、本ステージの実験対象としてそのまま引き継いだ。同節の「リスク」表の最終行（検証再有効化による起動レイテンシ退行）も U1 の実測で数値化した。

測定 ref: HEAD `c4c9531ee`。実験はいずれも隔離環境で実施し、実施後に完全撤去した（`git worktree list` が実験前後とも 31件で一致、agmsg team 登録・sentinel・herdr セッションとも残存 0）。

## 判定サマリ

| ユニット | 判定 | 根拠 |
|---|---|---|
| U1: actas 移行（#1476） | **GO（条件付き）** | 実 launch で sentinel の出現を実証。ただし待機設計の見直しが必須条件 |
| U2: worktree 並列化（#1478） | **GO** | 並列度4で 7.39秒 → 3.32秒。失敗・ロック競合ゼロ |

---

## U1: actas 移行（#1476）

### 実験1 — actas プロンプト単体では sentinel が出ない

herdr ペインで Claude Code を初期プロンプト `/agmsg actas leader` で起動し、`ready.amadeus-probe__leader` の出現を180秒ポーリングした。

**結果: sentinel 未出現。**

ペインの実出力:

```
受信モード変更 — 現在 off。リアルタイム受信するなら /agmsg mode monitor
```

`/agmsg actas <role>` は**送信側の identity を設定するだけ**で、受信 watcher を起動しない。

### 原因 — actas は delivery mode に従属する

claude-code ドライバの actas フロー（`~/.agents/skills/agmsg/scripts/drivers/types/claude-code/template.md:144-148`）step 5d が条件を明示している（verbatim）:

> **Only if the project's delivery mode is `monitor` or `both`** (check via `delivery.sh status claude-code "$(pwd)"`), invoke a fresh Monitor, regardless of whether step b or c applied:
> - command: `~/.agents/skills/__SKILL_NAME__/scripts/watch.sh $CLAUDE_CODE_SESSION_ID "$(pwd)" claude-code <name>`
>
> Otherwise (mode `turn` or `off`), leave it stopped — `actas` must not start automatic delivery a project wasn't configured for.

`:148`（verbatim）: `The 4th argument to `watch.sh` restricts the subscription to messages addressed to `<name>` only`

すなわち **actas が actas モードの watcher（第4引数 = `ACTIVE_NAME`）を起動するのは、delivery mode が既に `monitor` または `both` のときだけ**である。実験1では `delivery.sh set monitor` を実行していなかったため mode が `off` で、step 5d が発動しなかった。

なお、インストール済み `~/.agents/skills/agmsg/SKILL.md:110-114` の actas セクションは **codex 向け**の記述（`identities.sh "$(pwd)" codex` をハードコードし「Codex has no Monitor tool」と述べる）であり、watcher 起動の指示を含まない。claude-code の actas 挙動はドライバテンプレート側が規定する。

### 実験2 — delivery mode = monitor を先に設定すると sentinel が出る

`bash delivery.sh set monitor claude-code <wt>`（`team-up.sh:877-879` が既に実行しているのと同じ操作）を先に行い、同じプローブを再実行した。

**結果: sentinel 出現、T+32.2秒。**

```
★★ sentinel 出現: T+32.154416000 秒
内容(session_id): 9f9ae93e-cc67-4546-85cb-8465620b531b.76342
```

ペインの実出力:

```
受信: leader 宛メッセージのみに制限(monitor モードでリアルタイム受信中)
✻ Worked for 33s · 1 monitor still running
```

**U1 は実現可能**。`team-up.sh` は既に `claude_member_cmd`（`:877-879`）で `delivery.sh set monitor` を実行しているため、**初期プロンプトを `/agmsg actas <role>` へ変えるだけで前提条件は満たされる**。

### 重大な含意 — 待機設計の見直しが必須条件

sentinel 出現までの実測は **1メンバーで32.2秒**（Claude Code のコールドスタート + skill 解釈 + watcher 起動を含む）。

現行の `verify_watchers_armed` は全メンバーの sentinel を共有ポーリングし、`WATCHER_READY_TIMEOUT=90`（`:108`）× `WATCHER_RESEND_MAX+1=2` ラウンドで待つ。actas 移行で検証が再有効化されると、**`mux_attach` の前に最も遅いメンバーの arming 完了まで（実測ベースで数十秒規模）ブロックする**構造が復活する。

これは直前の intent `260725-teamup-attach-latency`（PR #1477）が 200.85秒 → 5.87秒として解消した当の問題である。**U1 は待機設計の変更とセットでなければ、起動レイテンシの明確な退行になる。**

想定される選択肢（requirements で確定する）:
1. 検証を `mux_attach` の後ろへ移す（アタッチを妨げない。exit code の意味づけ再設計が必要）
2. 検証をバックグラウンド化し、結果を別経路で通知する
3. 検証は残すがタイムアウトを実測ベース（例: 32.2秒に余裕を見た値）へ縮める

### 未検証のまま残る事項（requirements / nfr で扱う）

- **actas 排他ロック**（`watch.sh:185` `actas_lock_state` / `:203` `actas_lock_claim`）が resume（`-c`）経路で前セッションのロックを保持していた場合の挙動。ドライバテンプレート step 4 は `status=held` のとき **abort** すると規定しており、7メンバー同時起動での競合とロック残存が起動失敗を招く可能性がある。
- **受信範囲の変化**: actas は「`<name>` 宛のみ」へ制限する（`:148`）。現行 monitor モードは当該プロジェクトの全登録ロール宛を受信する。チームモードでは1 worktree に1ロールしか登録しないため実質同等と見込まれるが、未実測。
- `despawn.sh` / `session-end.sh` の sentinel 削除経路は、sentinel が生成されるようになって初めて実際に走る。

---

## U2: worktree 並列化（#1478）

### 実験 — 並列度別の実測

同一リポジトリ（tracked 11,051ファイル、`.git` 166M）で7個の `git worktree add` を並列度を変えて実行した。

| 並列度 | 所要時間 | 成功 | 失敗 | stderr |
|---|---|---|---|---|
| 1（直列） | **7.39秒** | 7/7 | 0 | 0 bytes |
| 2 | 4.88秒 | 7/7 | 0 | 0 bytes |
| 3 | 4.03秒 | 7/7 | 0 | 0 bytes |
| **4** | **3.32秒** | 7/7 | 0 | 0 bytes |
| 7（無制限） | **7.55秒** | 7/7 | 0 | 0 bytes |

再現性（並列度4を3回）: 3.32 / 3.72 / 3.61 秒。

### 判定

**U2 は実現可能。ただし並列度に上限が必要。**

- **`.git` 設定ロック競合による失敗は全並列度でゼロ**（stderr 0 bytes、成功 7/7）。git が内部でロックを直列化しており、失敗にはならない。
- **並列度4が最適**（7.39秒 → 3.32秒、**55%短縮 / 2.2倍**）。
- **並列度7（無制限）は 7.55秒で直列より遅い**。全メンバーが同一の object DB / index ロックを奪い合い、スループットが劣化する。「全部同時に投げる」実装は改善にならないどころか退行する。

intent-statement が挙げた「約1〜2秒まで短縮」という見込みは**過大**だった。実測に基づく期待値は **3.3秒前後**（7人構成で約4秒の短縮）。

### 未検証のまま残る事項（requirements / nfr で扱う）

- **部分失敗時のロールバック**: 現行は `CREATED_MEMBERS` に逐次追記し `handle_exit` トラップで巻き戻す。並列化すると成功集合の集約が必要。本実験では失敗が発生しなかったため、失敗注入での検証が未実施。
- **エラーの可視性**: 並列実行では stderr が交錯する。どのメンバーが失敗したかの特定手段。
- 本実験は macOS（APFS）での測定。Linux CI 上での並列度特性は未測定。

---

## 総合判定

両ユニットとも **GO**。ただし U1 は「待機設計の変更とセット」が実現の必須条件であり、これを欠くと前 intent の成果を失う。U1 と U2 は Q1 裁定 A により別 PR として出荷するが、**U1 の PR は待機設計の変更を必ず含む**こと。
