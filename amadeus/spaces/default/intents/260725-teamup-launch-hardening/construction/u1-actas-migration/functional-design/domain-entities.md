# Domain Entities — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-methods.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/services.md`

- `unit-of-work.md` — U1 の作業項目から、扱う概念（プロンプト・role・sentinel・検証状態）を抽出した。
- `unit-of-work-story-map.md` — US-1〜US-4 に現れる利用者視点の概念（armed / 未 armed）を引いた。
- `requirements.md` — FR-1〜FR-5 が言及する実体（定数・関数・sentinel）を列挙の起点とした。
- `components.md` — 新設 / 改変 / 廃止のコンポーネントを、実体のライフサイクルへ対応づけた。
- `component-methods.md` — `member_bootstrap_prompt` の入出力契約を、実体の型と値域へ落とした。
- `services.md` — agmsg が所有する実体（sentinel・actas ロック）と、こちらが所有する実体の境界を引いた。

測定 ref: HEAD `d0287bb87`。

## 前置き

本ユニットに業務ドメインは存在しない。ここで「エンティティ」と呼ぶのは、**起動オーケストレーションが扱う実体**である。所有者（本リポジトリ / 外部 agmsg）の境界を明示することが本書の主目的である。

## 実体の一覧

| 実体 | 型 / 値域 | 所有者 | ライフサイクル |
|---|---|---|---|
| **member** | `leader` / `engineer-1`〜`engineer-6` | team-up.sh | `members_for "$TEAM_SIZE"` が列挙。run の生存期間 |
| **role** | `leader` / `e1`〜`e6` | team-up.sh | `member_role(member)` が導出。member から純粋に決まる |
| **bootstrap prompt** | `/agmsg actas <role>` または空文字 | team-up.sh（**U1 で新設**） | `member_bootstrap_prompt(member)` が導出。状態を持たない |
| **team name** | `amadeus` / `amadeus-<instance>` | team-up.sh | `resolve_instance` が決定。run の生存期間 |
| **delivery mode** | `monitor` / `turn` / `off` / `both` | **agmsg** | `delivery.sh set monitor` が設定。プロジェクト（worktree）単位で永続 |
| **watcher** | actas モード / monitor モード | **agmsg** | 初期プロンプトの形で決まる。Claude Code セッションの生存期間 |
| **ready sentinel** | `ready.<team>__<role>`（ファイル） | **agmsg** | actas モードの watcher が生成（`watch.sh:307`）、cleanup で削除。**存在 ⇔ そのロールの live watcher が受信中** |
| **actas ロック** | `status=ok` / `held` / `not_registered` | **agmsg** | `actas-claim.sh` が事前クレーム。セッションの生存期間 |
| **watcher_status** | 0 / 非ゼロ | team-up.sh | 検証の結果。スクリプトの exit code になる |

## 所有境界

```
team-up.sh が所有                    agmsg が所有
─────────────────────                ─────────────────────
member                               delivery mode
role                                 watcher（モードを含む）
bootstrap prompt        ──起動──>    ready sentinel
team name                            actas ロック
watcher_status          <──観測──
```

**本ユニットが変えるのは左側だけ**である（BR-20）。右側は agmsg が所有し、こちらは (a) `delivery.sh set monitor` で mode を設定し、(b) 起動プロンプトの形で watcher のモードを決め、(c) sentinel をファイルとして観測する — という3点でのみ関わる。

## 廃止される実体

| 実体 | 現在地 | 廃止理由 |
|---|---|---|
| `CLAUDE_MONITOR_PROMPT`（定数） | `:104` | 引数を持たないため role を含められない。**bootstrap prompt（導出関数）へ置換**（ADR-1、BR-17） |

互換のための別名・フォールバックは残さない（NFR-8）。

## 実体間の不変条件

| ID | 不変条件 | 対応ルール |
|---|---|---|
| INV-1 | role は member から純粋に決まり、run の生存期間中に変わらない | BR-1 |
| INV-2 | bootstrap prompt は member と `MSG_BACKEND` から純粋に決まる。同一入力で同一出力 | BR-4 |
| INV-3 | bootstrap prompt が `" actas "` を含むか否かは、role に依存しない | BR-5、ADR-2 |
| INV-4 | ready sentinel が存在する ⇔ そのロールの watcher が actas モードで受信中 | agmsg の契約（`lib/actas-lock.sh:62-67`） |
| INV-5 | delivery mode が `monitor` または `both` でなければ、actas プロンプトを送っても watcher は起動しない | agmsg の契約（`template.md:143` step 5d）、BR-19 |

**INV-3 は ADR-2 の代表 role 判定の根拠**であり、破れると検証の適用可否が壊れる。テストで固定する。

**INV-5 は本ユニットの成立条件**であり、`delivery.sh set monitor` の呼び出しを維持することで満たす（BR-19）。feasibility の実験1（未設定 → sentinel 出ず）と実験2（設定済み → T+32.2秒 で出現）がこの不変条件の実証である。

## 値の永続性

| 実体 | 永続先 | 本ユニットでの変化 |
|---|---|---|
| delivery mode | 各 worktree の `.claude/settings.local.json`（SessionStart / SessionEnd フック） | 変化なし |
| ready sentinel | `~/.agents/skills/agmsg/run/` | **新規に生成されるようになる**（現行は0件） |
| actas ロック | `~/.agents/skills/agmsg/run/actas.*.session` | **新規に取得されるようになる**（R-2 の検証対象） |
| run record | `$RUN_RECORD/` | 変化なし |
