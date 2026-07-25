# Scope Document — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/feasibility-assessment.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/constraint-register.md`

- `intent-statement.md` — 「達成したい状態」3項目と「スコープ」節（含む／含まない）を、下記 In / Out の骨格として引き継いだ。
- `feasibility-assessment.md` — 両ユニットの GO 判定、U1 の必須条件（待機設計の変更）、U2 の並列度上限の必要性を、In Scope の必須項目として確定した。
- `constraint-register.md` — C-1〜C-21 を Out of Scope の根拠と受け入れ基準の数値source として参照した。

測定 ref: HEAD `c4c9531ee`（feasibility 実験時）。数値はすべて feasibility の実測からの転記。

## 目的

前 intent（PR #1477、マージ済み `8729199589`）は watcher arming 検証を既定でスキップすることで起動を 200.85秒 → 5.87秒 に短縮した。本 intent はその上で、**(a) #1384 の保護を実際に機能させ、(b) 起動をさらに短縮し、(c) 欠陥を見逃したテスト構造を是正する**。

## In Scope

### U1: actas 移行と待機設計の変更（#1476）

| # | 項目 | 受け入れ基準の骨子 |
|---|---|---|
| U1-1 | 初期プロンプトを `/agmsg mode monitor` → `/agmsg actas <role>` へ移行 | 実 launch で ready sentinel が全メンバー分出現する |
| U1-2 | `CLAUDE_MONITOR_PROMPT` の per-member 化 | 定数の4参照点（`:104` 定義、`:861` init_prompt、`:1094` ガード、`:1202` 再送、`:1211` 回復ガイダンス）がすべて role を解決できる |
| U1-3 | **検証を `mux_attach` の後ろへ移す**（必須条件） | `mux_attach` までの経路に arming 待機が存在しない。起動時間が現行 5.87秒 から悪化しない |
| U1-4 | exit code の意味づけ再設計 | 検証結果が呼び出し元へ到達する経路が定義され、対話的アタッチに飲み込まれない |
| U1-5 | テスト構造の是正 | `t-team-up-watcher-arming.test.ts` が sentinel を自前で書く構造（`:42` / `:60` / `:87-91`）を解消し、agmsg の実挙動に対して検証する |

### U2: worktree 並列化（#1478）

| # | 項目 | 受け入れ基準の骨子 |
|---|---|---|
| U2-1 | `create_run` の `git worktree add` を並列化（**固定上限4**） | 7個の作成が直列 7.39秒 に対し 3.3秒前後 |
| U2-2 | 部分失敗時のロールバック | 並列実行下でも `CREATED_MEMBERS` 相当の成功集合が正しく集約され、`handle_exit` が巻き戻せる |
| U2-3 | 失敗メンバーの可視性 | どのメンバーの worktree 作成が失敗したかが loud に特定できる |

### 共通

| # | 項目 |
|---|---|
| S-1 | 正本 `packages/framework/core/tools/team-up.sh` を編集し、`dist/` 6面 + self-install 4面 = 計11コピーを同一変更で同期する（C-8） |
| S-2 | `bun run typecheck` / `lint` / `dist:check` / `promote:self:check` / `tests/run-tests.sh --ci` をマージ前検証に含める（C-9） |
| S-3 | 新設・変更したガードは落ちる実証を行う（C-10） |

## Out of Scope

| 項目 | 理由 |
|---|---|
| agmsg スキル（`~/.agents/skills/agmsg/`）の変更 | repo 外の外部依存。read-only で実測して合わせる（C-5） |
| インストール済み `SKILL.md` の actas 節が codex 向けである件 | 上流（agmsg）の課題（RAID I-1）。claude-code ドライバテンプレートが正しい挙動を規定しており、実測でもそちらに従う |
| `RUNTIME=codex` 経路の同型ギャップ | #1388 が別途扱う |
| `MSG_BACKEND=herdr` 経路 | monitor を持たないため対象外（`claude_member_cmd` が初期プロンプトを空にする） |
| Linux CI 上での並列度特性の最適化 | 実測は macOS のみ。並列度は上限として設計し環境差を吸収する（RAID R-6） |
| `WATCHER_READY_TIMEOUT` / `WATCHER_RESEND_MAX` の値そのものの再検討 | U1-3 で待機が `mux_attach` を妨げなくなるため、値の最適化は本 intent の目的（起動レイテンシ）に対して従属的。必要なら requirements で扱う |
| 起動時間の残余（herdr セッション生成・ペイン起動） | 実測で1秒未満。最適化の余地が小さい |

## 出荷方針（C-14 / intent-capture Q1 = A）

**ユニットごとに別 PR。** U1 と U2 は `team-up.sh` 内で非交差の関数を触る（U1 = 初期プロンプトと検証経路、U2 = `create_run`）。#1476 が P1/S2-CRITICAL、#1478 が P2 であり、U1 の着地が U2 の未検証事項に待たされない構成とする。

**U1 の PR は U1-3（待機設計の変更）を必ず含む**（C-17）。これを欠くと前 intent の成果（起動 5.87秒）を失う。

## 完了条件（C-16 / intent-capture Q3 = A）

両ユニットが main へ着地し、実 launch で次を実測できたとき。

1. **watcher arming 検証が実際に成功する**（sentinel が全メンバー分書かれ、検証が緑になる）
2. **起動時間が現行 5.87秒（3人構成）から短縮される**
3. **テストが sentinel を自前で書く構造を解消**し、agmsg の実挙動を検証する形になっている

## 成功指標

| 指標 | 現行 | 目標 | 出典 |
|---|---|---|---|
| アタッチ到達時間（3人構成） | 5.87秒 | 短縮（worktree 並列化分） | C-20 |
| worktree 作成（7個） | 7.39秒 | 3.3秒前後 | C-19 |
| watcher arming 検証 | 実行されない（スキップ） | 実行され成功する | feasibility 実験2 |
| sentinel 出現（1メンバー） | 出現しない | 32.2秒前後 | C-18 |

**注意**: 指標4（sentinel 出現 32.2秒）は `mux_attach` を**ブロックしない**位置で計測される値である。U1-3 により、この 32.2秒はアタッチ到達時間に加算されない。
