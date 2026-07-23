# Requirements Analysis 質問ファイル — チーム機能のコア昇格

> 判定: ユーザー直接回答(intent-capture ヘッダの判定を継承)。
> 承認: ユーザー直接回答方式を承認(アンカー = WORKFLOW_STARTED 監査行 2026-07-22T22:24:58Z)
> 上流入力(consumes 全数): intent-statement、scope-document、business-overview、architecture、code-structure、team-practices

## 承認系譜(approval-lineage-citation)

本 intent はスコープ境界が intent-capture 内で拡大した: 当初壁打ち裁定(選挙エンジン単独昇格+team-up.sh 非配布、2026-07-23 セッション前半)→ ユーザー逆質問「A,Bだけ提供して何になるのか — ユーザー体験から逆算すべき」(IC Q3)→ **チーム機能一式(起動/メッセージング/選挙/docs)へ拡大確定**(IC Q3=C、ユーザー直接裁定)。詳細は decision-log.md(D-3)と intent-capture-questions.md Q3 [Answer] 行を参照。本 requirements はこの拡大後スコープを正とする。

## Q0. 回答モードの選択

このステージの質問(見積り4〜6問: CLI 呼び出し契約、依存検出の loud エラー形、E2E 受け入れ基準の具体形、docs 受け入れ基準等 — ユーザー可視契約のテスト可能な固定)をどのモードで回答するか。

- A. Guide me(対話的)
- B. Grill me(1問ずつ深掘り・推奨付き)
- C. I'll edit the file(ファイル直接編集)
- D. Chat(自由議論から抽出)

[Answer]: B — Grill me(2026-07-23 ユーザー回答)

## 質問(グリル進行中 — 動的追記)

### Q1. 選挙 CLI の利用者向け呼び出し契約

昇格後、利用者が選挙をどう起動するかの契約。実測: 既存の配布ツール(orchestrate/state 等)は「bun {{HARNESS_DIR}}/tools/<tool>.ts + スキル包装」が確立パターンで、選挙スキル(/amadeus-election)も指令転送ループとして既にこの形。推奨は既存パターン踏襲 — SKILL.md の参照書き換えだけで契約が完成し、no-canonical-direct-execution(配布コピー経由の実行)とも整合する。

- A. 既存パターン踏襲: bun {{HARNESS_DIR}}/tools/amadeus-election.ts 直叩き+/amadeus-election スキル包装(推奨)
- B. /amadeus 本体への verb 統合(/amadeus election ...)まで行う
- X. その他(補足)

[Answer]: A(2026-07-23 ユーザー回答。既存パターン踏襲)

### Q2. チーム起動(team-up.sh)の配布形態とコマンド契約

クリーン環境 E2E は「利用者のワークスペースにチーム起動手段が配布されていること」を要求する(scripts/ は配布されないため現物は届かない)。requirements-analysis:c3 によりユーザー可視の CLI 契約は requirements で固定する。実測: team-up.sh は bash 1271行・macOS/Linux 限定は Q2(feasibility)で確定済み・配布ツリーの既存ツールは全て bun/TS だが、bash を dist へ投影する技術的障害は package.ts に見当たらない(コピー投影)。推奨は「bash のまま配布」— TS 化は挙動同値の再実装リスク(1271行)に対し利益が薄く、macOS/Linux 限定裁定と整合。呼び出し契約は bash {{HARNESS_DIR}}/tools/team-up.sh(名称は設計で最終化可)。

- A. bash のまま配布(呼び出し契約 = bash {{HARNESS_DIR}}/tools/team-up.sh 形、実装言語は不変)(推奨)
- B. TypeScript へ書き換えて他ツールと同形(bun 直実行)にする
- C. 「1コマンドでチーム起動可能」の契約のみ固定し、配布形態・言語は設計段で決める
- X. その他(補足)

[Answer]: A(2026-07-23 ユーザー回答。bash のまま配布、呼び出し契約 = bash {{HARNESS_DIR}}/tools/team-up.sh 形)

### Q3. 依存(herdr / agmsg)不在時の挙動契約と doctor 統合

prerequisite モデル(feasibility Q1)の検出面の契約。実測: /amadeus --doctor はセットアップ検証の既存の一枚扉(bun 検出等)。推奨は「チーム起動時の loud エラー(exit 1+不在ツール名+インストール案内)を Must とし、加えて doctor へ advisory 行(チーム機能 prerequisite の PATH 検出結果表示 — 不在でも doctor 全体は fail しない: チーム機能はオプトイン機能のため)を追加」— 利用者が E2E 手順の最初で環境不足を発見できる二層検出になり、コストは小さい。

- A. 起動時 loud エラー(Must)+ doctor に advisory 行を追加(Must、不在でも doctor は fail しない)(推奨)
- B. 起動時 loud エラーのみ(doctor は触らない)
- X. その他(補足)

[Answer]: A(2026-07-23 ユーザー回答。起動時 loud エラー Must+doctor advisory 行 Must、doctor は fail しない)

### 合意サマリ確認(C-4)

- A. 確認した — requirements.md 起草へ進む(推奨)
- B. 修正したい

[Answer]: A(2026-07-23 ユーザー確認)— ただし完全性分析で未決1件を検出し Q4 として追加

### Q4(follow-up). スキル面の配布ハーネス範囲

完全性分析で検出した未決事項(intent-capture のグリルでは未質問のまま流れた論点)。CLI 本体(core/tools)は構造上全6ハーネス dist へ投影される(cid:harness-tools-placement)。一方スキル包装(/amadeus-election、チーム起動の案内面)はハーネス別表層で、現行 contrib 投影は .claude/skills+.agents/skills(= claude+codex)の2面。推奨は「CLI=全6面(構造どおり)、スキル面=claude+codex」— チームモードの動作実績がある2ハーネスに限定し、他ハーネスのスキル機構差異の吸収は需要実測後の後続 intent へ。

- A. CLI = 全6面(構造どおり)、スキル面 = claude + codex(現行 contrib 投影と同範囲)(推奨)
- B. スキル面も全6ハーネスへ配布(各ハーネスのスキル機構差異の吸収コストを本 intent で払う)
- C. スキル面の範囲は設計段で決める(要件は「最低 claude+codex」の下限のみ固定)
- X. その他(補足)

[Answer]: A(2026-07-23 ユーザー回答。CLI=全6面、スキル面=claude+codex)

### Q5(reviewer Critical 1 起点). agmsg の公開入手経路

§12a レビューが FR-7c(agmsg 入手経路の未決を FR 条件節へ埋没)を Critical と判定。docs の prerequisite 節に「agmsg をどこからどうインストールするか」を書くための確定が必要。herdr は公式配布あり(https://herdr.dev、curl/brew/nix)。agmsg の実測: ~/.agents/skills/agmsg v1.1.6、git リポジトリでなく LICENSE 不在 — 公開配布物を自己調査で発見できず。

- A. 入手経路を指定する(URL / リポジトリ / 配布手段を補足で明示 — docs にそのまま記載)
- B. 現時点で未公開 — docs の prerequisite 節は「agmsg(入手方法は準備中/別途案内)」等の暫定表現とし、公開整備は別 intent/Issue として起票する
- X. その他(補足)

[Answer]: X — 「公式の入手経路でよい。agmsg は利用者がインストールする前提であり、我々が考慮することではない」(2026-07-23 ユーザー回答 verbatim 要旨)。裁定: agmsg には公式入手経路が存在し、インストールは bun/herdr と同格の利用者責務。docs の prerequisite 節は各ツールの公式入手先を参照するのみで、amadeus 側で経路の保証・整備・同梱はしない
