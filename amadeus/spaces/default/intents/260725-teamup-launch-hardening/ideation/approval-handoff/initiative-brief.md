# Initiative Brief — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/scope-definition/scope-document.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/scope-definition/intent-backlog.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/feasibility-assessment.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/constraint-register.md`

- `intent-statement.md` — 「解きたい問題」2件と「達成したい状態」3項目を、本 brief の目的・成果定義として引き継いだ。
- `scope-document.md` — In/Out 境界、出荷方針（2 PR）、完了条件、成功指標をそのまま採用した。
- `intent-backlog.md` — Bolt 1（B-1〜B-5）/ Bolt 2（B-6〜B-8）の項目と依存関係を、下記の実行計画へ写した。
- `feasibility-assessment.md` — 両ユニットの GO 判定と U1 の必須条件を、承認の根拠として引いた。
- `constraint-register.md` — C-1〜C-21 を制約セクションの根拠とした。

測定 ref: HEAD `c4c9531ee`（feasibility 実験時）。

## 一言でいうと

前 intent が「検証を止める」ことで達成した起動高速化（200.85秒 → 5.87秒）の上に、**検証を実際に機能させ、かつ起動をさらに速くする**。

## 背景

`team-up.sh` の watcher arming 検証は、agmsg の actas モードの watcher だけが書く sentinel を待っていた。しかし起動は monitor モードだったため sentinel は構造的に生成されず、検証は導入以来一度も成功していなかった（#1449 / PR #1477 で確定）。PR #1477 は適用可否ガードを入れて既定でスキップさせ、起動を 5.87秒 にしたが、**#1384 の保護は不在のまま**である。

同時に、起動時間の支配項が worktree の直列作成（7人構成で 7.39秒）へ移った。

## 何をするか

| ユニット | 内容 | Issue |
|---|---|---|
| **U1** | 初期プロンプトを `/agmsg actas <role>` へ移行して検証を実際に機能させ、**同時に検証を `mux_attach` の後ろへ移して**起動を妨げないようにする。テストが sentinel を自前で書く構造も是正する | #1476（P1 / S2-CRITICAL） |
| **U2** | `create_run` の `git worktree add` を**並列度4**で並列化する | #1478（P2） |

**ユニットごとに別 PR**（intent-capture Q1 = A）。U1 と U2 は `team-up.sh` 内で非交差の関数を触る。

## 実現可能性（feasibility で実測済み）

| ユニット | 判定 | 実測根拠 |
|---|---|---|
| U1 | **GO（条件付き）** | 実 launch で `delivery mode = monitor` + `/agmsg actas leader` により sentinel が **T+32.2秒** に出現。ペインに「受信: leader 宛メッセージのみに制限(monitor モードでリアルタイム受信中)」を確認 |
| U2 | **GO** | 7個の作成が直列 7.39秒 → **並列度4 で 3.32秒**（再現性 3.32/3.72/3.61）。全並列度で失敗ゼロ・stderr 0 bytes |

**U1 の条件**: sentinel 出現に 32.2秒/1メンバーを要するため、検証を `mux_attach` 前に置いたままでは前 intent の成果を失う。**待機設計の変更（B-3）は U1 の必須構成要素**である（C-17）。

**U2 の注意**: 並列度7（無制限）は 7.55秒 で直列より遅い。上限設計そのものが要件である（C-6）。

## 成果の見込み

| 指標 | 現行 | 目標 |
|---|---|---|
| アタッチ到達時間（3人構成） | 5.87秒 | 短縮（worktree 並列化分） |
| worktree 作成（7個） | 7.39秒 | 3.3秒前後 |
| watcher arming 検証 | 実行されない | 実行され成功する |

## 制約

- agmsg（`~/.agents/skills/agmsg/`）は **read-only**。修正は `team-up.sh` 側に閉じる（C-5）
- 正本 + dist 6面 + self-install 4面 = **11コピーを同一変更で同期**（C-8）
- 検証5コマンド（typecheck / lint / dist:check / promote:self:check / tests --ci）の通過（C-9）
- 新設・変更したガードは**落ちる実証**（C-10）
- 要求されていない後方互換レイヤー・移行シムを追加しない（C-11）

## 主要リスク

| ID | 内容 | 状態 |
|---|---|---|
| R-1 | 検証再有効化による起動レイテンシ退行 | **実測済み（32.2秒/1メンバー）**。B-3 で構造的に封じる |
| R-2 | actas 排他ロックが7メンバー同時起動・resume で競合 | **未検証**。inception で扱う |
| R-4 | 並列 worktree の部分失敗時のロールバック | **未検証**（実験で失敗ゼロのため未観測）。B-7 で失敗注入により実証 |
| B-4 | `mux_attach` 後へ移した検証の exit code をどう返すか | **未確定**。requirements で最初に潰す |

## 実行計画

**Bolt 1（U1、#1476）**: B-3（待機設計の変更）→ B-1（プロンプトの per-member 化）→ B-2（actas 移行）→ B-4（exit code 再設計）→ B-5（テスト構造の是正）。B-3 を先に着手し、退行を構造的に防ぐ。

**Bolt 2（U2、#1478）**: B-6（並列化）→ B-7（ロールバック）→ B-8（可視性）。

Bolt 1 と Bolt 2 は独立に着地できる。

## 体制

ソロモード（`AMADEUS_OPERATING_MODE` 未設定）。conductor が全工程を担い、設計判断・スコープ判断・マージ承認はユーザー本人が行う。エージェント選挙・定足数・クロスレビュー2名は非適用。独立検証は §12a reviewer subagent が担う。

**Team Formation は SKIP** されており、named mob や Construction schedule は本 brief では確約しない。ユニットと依存が確定した後、Delivery Planning で staffing と schedule を承認する。
