# 再スキャン記録 — 260725-teamup-launch-hardening（Issue #1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/feasibility-assessment.md`

- `feasibility-assessment.md` — U1（actas 移行）の機序（`watch.sh:307` / `:300` / `:43`、ドライバテンプレート step 5d、SKILL.md の codex 向け二層構造、sentinel 出現 T+32.2 秒）と U2（worktree 並列化）の並列度別実測（7.39 / 4.88 / 4.03 / 3.32 / 7.55 秒）を引き継ぎ、file:line はすべて本 scan で独立に再実測して追認した。`CLAUDE_MONITOR_PROMPT` の参照4箇所も再列挙して一致を確認した。

## メタ

| 項目 | 値 |
| --- | --- |
| Base commit | `ec624022ff65cc8b3912001f768bd66ec41a0e39`（前 intent `260725-teamup-attach-latency` の observed） |
| Observed commit | `4a0f91ad07dbe17c6477b7fe9b52a0e9ab4532ba`（= 現 HEAD） |
| ブランチ | `feat/teamup-actas-migration-and-worktree-parallel` |
| 祖先性 / 距離 | `git merge-base --is-ancestor` exit 0 / `git rev-list --count` = **9** |
| 区間規模 | **65 files changed, 6516 insertions(+), 54 deletions(-)** |
| Scope | `amadeus-feature`、Depth Standard、Test Strategy Minimal、Brownfield、単一 repo |
| 方式 | 差分リフレッシュ（cid:reverse-engineering:c1）。フルスキャン不実施 |
| 測定 ref | 全 file:line・件数は observed `4a0f91ad0` の実ファイル直読。外部 agmsg スキルは `~/.agents/skills/agmsg/`（repo 外・非バージョン管理、読取 2026-07-25） |

## 区間の内訳

| コミット | 内容 |
| --- | --- |
| `dcadcce17` | 前 intent（#1449）inception checkpoint |
| `294df1281` | **fix(team-up): skip watcher arming verification for monitor-mode launches** — 実装本体 |
| `22829d0b8` / `a0febedd2` | 前 intent の construction 記録・phase check |
| `872919958` | **Merge PR #1477** |
| `c4c9531ee` | 前 intent の subagent audit shard |
| `5219bbd54` / `a3ab8dff4` / `4a0f91ad0` | 本 intent の ideation 記録（checkpoint / park / ideation 完了） |

実装面は `team-up.sh` **11 面 × +31/-8** と tests 2件のみ。残り約 6,400 行は record / audit。

## 実装面の変化

### PR #1477 — watcher 検証の適用可否ガード

`watcher_verification_applies`（team-up.sh:1092）に**初期プロンプトの形**を見る第3条件が加わった。

- `:1091` `WATCHER_SKIP_ANNOUNCED=0` — 新設。launch 経路が本関数を2回呼ぶ（`:1461` stale sentinel 除去前、`:1478` 検証前）ため advisory を run あたり1行に抑える one-shot ラッチ
- `:1093` verbatim: `  [ "$RUNTIME" = "claude" ] && [ "$MSG_BACKEND" = "agmsg" ] || return 1`
- `:1094-1096` verbatim: `  case "$CLAUDE_MONITOR_PROMPT" in` / `  *" actas "*) return 0 ;;` / `  esac`
- `:1097-1101` スキップ告知（stderr 1行、stdout 非汚染）。文言は `#1449` と `#1476` の両方を名指しする

**既存記号の削除・改名はゼロ。** `verify_watchers_armed`（:1174）ほか検証機構一式と予算定数（`:108` / `:114`）は保持され、t294 の FR-5 テスト（`:104`）がそれをピンする。

配布同期完了: `git ls-files '*tools/team-up.sh'` = **11 面**（正本1 + self-install 4 + dist 6）、全面で `grep -c WATCHER_SKIP_ANNOUNCED` = **3**。

### テスト

| ファイル | 変化 |
| --- | --- |
| `tests/integration/t294-team-up-watcher-applicability.test.ts` | 新規 **113 行 / 7 test** |
| `tests/integration/t-team-up-watcher-arming.test.ts` | +5/-2。`:196` の適用可否テストが prompt 軸を `'/agmsg actas leader'` にピン（monitor 形では適用されなくなったため） |

## 本 intent が触る2面（HEAD 現行行番号）

**U1（#1476）— actas 移行**: `:104`（定数定義）/ `:861`（`init_prompt`）/ `:1094`（ガード case）/ `:1202`（再送実引数）/ `:1211`（復旧ガイダンス文言）/ `:876-878`（`delivery.sh set monitor`、前提充足済み）/ `:1478-1480`（検証の同期実行、`mux_attach` は `:1483`）

**U2（#1478）— worktree 並列化**: `:1267`（`create_run`、呼出は `:1427` 単一）/ `:1302-1310`（逐次ループ）/ `:1305`（`git worktree add`）/ `:1306`（`CREATED_MEMBERS` 追記）/ `:1392`（初期化）/ `:1244`（`rollback_prepared_run` のロールバック読み手。`handle_exit`（`:1253`）は `:1259` でこれを呼ぶ）

**非交差**（cid:code-generation:c6）: 同一ファイルだが行域・関数とも重ならない（U1 = `claude_member_cmd` + `watcher_verification_applies` + `verify_watchers_armed`、U2 = `create_run` + `handle_exit`）。worktree 隔離の並行実装が可能。

## 主要な発見

1. **#1384 の保護は現在まったく機能していない**（意図された暫定状態）。出荷既定 `CLAUDE_MONITOR_PROMPT="/agmsg mode monitor"` は `*" actas "*` に一致しないため、stale sentinel 除去（`:1461`）も検証（`:1479`）も両方スキップされる。watcher 未起動は無音で通過する。
2. **actas 移行は検証を自動的に再有効化する**。`*" actas "*` case に一致するため、PR #1477 以前の同期ブロッキング構造（最悪 180 秒、`mux_attach` の前）がそのまま復活する。プロンプト変更**だけ**では前 intent の成果（200.85 秒 → 5.87 秒）を失う。
3. **actas 化の前提は既に満たされている**。`claude_member_cmd:876-878` が pane 起動前に `delivery.sh set monitor` を実行するため、ドライバテンプレート step 5d（`template.md:143`）の mode 条件は充足済み。
7. **`mux_attach` は exit code を飲み込まない**（Architect 合成で追加検証）。`mux_attach`（`:513-515`）の実体は `open -na Ghostty --args -e ...` の非ブロッキング1行で、スクリプトは `:1483` の後も `:1484-1492` の記録書き出しを続け `:1497` の `exit "$watcher_status"` で終了する。feasibility Q1 の確定裁定 A（検証を `mux_attach` の後ろへ移す）は `:1474-1476` のコメント文言の更新を要するが、exit code の意味づけは壊さない。
4. **`:1094` は per-member 化できない**。ガードは member 文脈を持たないため、プロンプト値そのものではなく「actas 形を使う構成か」を判定する形への書き換えが要る。`:1211` のガイダンス文言も per-role 化しないと誤った復旧手順を案内する。
5. **worktree 並列化は上限が実装要件**。並列度4で 3.32 秒（直列 7.39 秒の 55% 短縮）だが、無制限（7）は 7.55 秒で**直列より遅い**。ロック競合による失敗は全並列度でゼロ。
6. **`CREATED_MEMBERS` の集約が並列化の制約**。`handle_exit`（`:1244`）のロールバック対象を決めるため、成功集合の集約と部分失敗時の等価性検証が必要。feasibility 実験では失敗が発生せず、**失敗注入は未実施**。

## 訂正した事項

| 対象 | 上流の記載 | 実測（`4a0f91ad0`） |
| --- | --- | --- |
| `git worktree add` の所在 | `team-up.sh:1282` | **`:1305`**。`:1282` は PR #1477 **前**（`ec624022f`）の行番号。同 PR が `:1071` 以降に 23 行を挿入したため、**1071 より下の全参照が +23 シフト** |
| `delivery.sh set monitor` の所在 | `:877-879` | **`:876-878`**（`:876` `if [ -f "$DELIVERY" ]` / `:877` 実行 / `:878` WARN） |
| `team-up.sh` 行数 | （前 intent 記録）1474 行 | **1497 行** |

### Architect 合成段の独立再検証で追加訂正した事項

| 対象 | Developer 段の記載 | 実測（`4a0f91ad0` / agmsg 読取 2026-07-25） |
| --- | --- | --- |
| ドライバテンプレート step 5d | `template.md:144` | **`:143`**（`:144` は step 5d 配下の `- command:` 行）。`grep -n "Only if the project.s delivery mode"` = 143 / 159（159 は drop 経路の対称ブロック） |
| `CREATED_MEMBERS` の読み手 | `handle_exit`（`:1244`） | **`rollback_prepared_run`（`:1241-1251`）の `:1244`**。`handle_exit`（`:1253`）は `:1259` で呼ぶ側 |
| agmsg `SKILL.md` の actas 節 | `:110-114` | **`:110-115`**（`:115` の告知行まで。`:114` が FROM 設定に留まる点の指摘自体は正） |

追認できた事項（相違なし）: `watch.sh:307` / `:300` / `:43`、`delivery.sh:301`、`template.md:147-148`、`spawn.sh:565-568` / `:572` / `:358`、`lib/actas-lock.sh:69`、`CLAUDE_MONITOR_PROMPT` の `:104` 定義と参照4箇所（`:861` / `:1094` / `:1202` / `:1211`）、`WATCHER_READY_TIMEOUT=90`（`:108`）× `WATCHER_RESEND_MAX+1=2` ラウンド、U2 の並列度別実測値。

### 列挙完全性・対称性の独立レビュー（Architect 段）

- **`CLAUDE_MONITOR_PROMPT` の全数**（`cid:requirements-analysis:enumeration-completeness-review`）: `grep -c` = **5**（定義 `:104` + 参照 `:861` / `:1094` / `:1202` / `:1211`）。「参照4箇所」は追認。repo 全域（dist / self-install 除く）の追加出現は tests 2件（`t294-team-up-watcher-applicability.test.ts:53,55,61,75,97` と `t-team-up-watcher-arming.test.ts:172,207`）で、いずれも lib を source して**再代入する側**であり本番参照点ではない。あわせて `:104` は `${VAR:-default}` 形を取らない**環境変数から上書き不能なハード定数**である（`:108` / `:114` とは非対称）ことを確認した。
- **対称性**（`cid:requirements-analysis:symmetric-pair-review`）: sentinel 生成（`watch.sh:307`）⇔ 削除（`watch.sh` cleanup `:144-154` + `session-start.sh:194` GC）、actas ロック claim（`actas-claim.sh` / `lib/actas-lock.sh:140`）⇔ release（`:186` / `:198`、呼び手は `actas-claim.sh` / `reset.sh` / `despawn.sh` / `session-end.sh` の4本）、worktree 作成（`team-up.sh:1305`）⇔ 除去（`:1247`）— **3対とも揃っている**。ただし worktree の対は「add 成功 ⇒ `CREATED_MEMBERS` 登録」が同一シェルの連続2行であることに依存しており、U2 の並列化はこの含意を維持する機構（成功集合の親への回収、または worktree 実在走査によるロールバック対象の再導出）を新たな設計要求として持つ。

## センサー

RE ステージの宣言センサー3種（required-sections / upstream-coverage / answer-evidence）は codekb 出力パスが sensor filter（`**/{amadeus-docs,intents}/**` と `**/*-questions.md`）に構造的に不適合で発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない**。代替として以下を直接検証した。

- H2 構成: 更新した全成果物で `grep -c '^## '` ≥ 2 を機械確認
- 上流入力参照: 冒頭の consumes 全数行が本文の実参照から導出されていること（装飾トークンなし）
- file:line: 確約級の引用に verbatim 断片を併記し、起草時に実測確認

## Delivery boundary

codekb 9成果物 + 本記録のみ更新。実装・テスト・state・audit・生成配布物・commit・PR 操作は未実施。ブランチ切替・破壊操作なし（`git branch --show-current` = `feat/teamup-actas-migration-and-worktree-parallel`、開始時・終了時とも同一）。
