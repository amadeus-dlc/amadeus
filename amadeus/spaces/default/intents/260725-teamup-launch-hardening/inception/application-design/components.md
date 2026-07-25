# Components — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/component-inventory.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — FR-1〜FR-8 / NFR-1〜NFR-8 を各コンポーネントの責務と受け入れ基準へ写した。
- `architecture.md` — launch シーケンス上の位置関係（検証と `mux_attach` の順序、sentinel の生成条件）を引き、変更するコンポーネントの境界を確定した。
- `component-inventory.md` — 現行の正本16コンポーネント・配布11面・外部 agmsg 7要素の登録を引き、新設ではなく既存の改変で足りる範囲を判定した。
- `team-practices.md` — canonical 1定義原則・配布同期・テスト配置の実務を引き、設計制約とした。

測定 ref: HEAD `0b0c6e20a`。対象は bash スクリプト `packages/framework/core/tools/team-up.sh`（1497行、`#!/usr/bin/env bash` + `set -euo pipefail`、配列・`local`・`[[ ]]`・`$RANDOM` を使用）であり、**コンポーネント = シェル関数**として扱う。

## 設計方針

**新規モジュールを作らない。** 既存関数の改変と、1つの導出関数の新設に閉じる（`org.md` Forbidden の要求外機構の追加を避ける）。U1 と U2 は非交差の関数群を触るため、2 PR に分割しても互いの設計に影響しない。

## U1: actas 移行と待機設計（#1476）

| コンポーネント | 現在地 | 種別 | 責務 | 対応要件 |
|---|---|---|---|---|
| `member_bootstrap_prompt`（**新設**） | — | 純関数 | member 名 → 初期プロンプト文字列の**単一の導出関数**。`member_role` を内部で呼び、`/agmsg actas <role>` を返す。`MSG_BACKEND=herdr` では空文字を返す | FR-2 |
| `CLAUDE_MONITOR_PROMPT` | `:104` | 定数 → **廃止** | 引数を持たない定数では role を含められない。参照4点をすべて `member_bootstrap_prompt` 経由へ移す | FR-2 |
| `claude_member_cmd` | `:860-894` | コマンド組立 | `init_prompt` を `member_bootstrap_prompt "$m"` から得る。`delivery.sh set monitor`（`:876-879`（`if [ -f "$DELIVERY" ]` 〜 `fi`、実行行は `:877`））の呼び出しは**維持**（actas が watcher を起動する前提条件） | FR-1 |
| `watcher_verification_applies` | `:1092-1102` | 述語 | 判定入力を定数から `member_bootstrap_prompt` の出力へ移す。member 文脈を持たないため、**代表 role で導出した文字列**を判定に使う | FR-2 |
| `resend_monitor_prompt` の呼び出し | `:1202` | 再送 | ループ変数 `$m` から role を解決し、per-member のプロンプトを再送する | FR-1, FR-2 |
| 回復ガイダンス出力 | `:1210-1211` | 診断 | **2行とも改修対象**。`:1210` は `The initial '/agmsg mode monitor' prompt was dropped` をリテラルで含み、actas 移行後は事実と異なる。`:1211` は unarmed メンバーごとに、そのメンバーが実行すべき actas プロンプトを表示する | FR-1, FR-2 |
| 検証の呼び出し位置 | `:1478-1480` → `:1483` の後 | 制御フロー | `mux_attach` の**後ろ**へ移す。`clear_stale_watcher_sentinels`（`:1461-1463`）はペイン起動前のまま維持 | FR-3 |
| `WATCHER_READY_TIMEOUT` | `:108` | 定数 | 90 → 実測 32.2秒 に接地した値へ縮小。マージンの根拠をコメントに記す | NFR-2 |
| `:1473-1476` のコメント | `:1473-1476` | ドキュメント | 「an interactive attach would swallow it」は現行実装で不成立。事実に合わせて更新 | FR-4 |
| `t-team-up-watcher-arming.test.ts` | 268行 | テスト | モード差（monitor では書かれない / actas では書かれる）を検証する構造へ是正。あわせて **`:172` の `expect(err).toContain("/agmsg mode monitor")`（診断メッセージのリテラル依存）と `:207` の env 駆動**を新実装に合わせる | FR-2, FR-5 |
| `t294-team-up-watcher-applicability.test.ts` | 113行 | テスト | **`CLAUDE_MONITOR_PROMPT` の廃止で全項目が構造的に破綻する**。同テストは env で定数を上書きして `watcher_verification_applies` を駆動し（`:61` / `:75` / `:97`）、既定値 `/agmsg mode monitor` をリテラル固定検証する（`:53`）。判定入力が `member_bootstrap_prompt` へ移るため、駆動方法を関数の再定義または `MSG_BACKEND` 経由へ移す | FR-2, FR-5 |

## U2: worktree 並列化（#1478）

| コンポーネント | 現在地 | 種別 | 責務 | 対応要件 |
|---|---|---|---|---|
| `create_run` の worktree 生成ループ | `:1305-1306` を含む `:1267-1311` | 制御フロー | `git worktree add` を**並列度4上限**で並列実行する。`CREATED_MEMBERS` への逐次追記（`:1306`）は廃止 | FR-6 |
| `rollback_prepared_run` | `:1241-1251` | 巻き戻し | 対象を `CREATED_MEMBERS`（`:1244`）ではなく **`RUN_ROOT` 配下の worktree 実在走査**で再導出する | FR-7 |
| `CREATED_MEMBERS` | `:1306` 追記 / `:1244` 読取 / `:1392` 初期化 | 状態 | **廃止**。並列化でサブシェル境界を越えられず、実在走査が代替する | FR-7 |
| worktree 失敗の報告 | 新規 | 診断 | 並列実行で stderr が交錯するため、どのメンバーが失敗したかを一意に特定できる形で出力する | FR-8 |

## 変更しないもの

| コンポーネント | 理由 |
|---|---|
| `verify_watchers_armed` 本体（`:1174-1213`） | ポーリングと再送のロジックは正しい。変えるのは呼び出し位置（FR-3）と再送プロンプトの導出（FR-2）のみ |
| `clear_stale_watcher_sentinels` と その呼び出し位置 | ペイン起動前のクリアは正しい（起動後だと本物の sentinel を消す） |
| `WATCHER_RESEND_MAX`（`:114`） | #1384 の prompt 脱落回復に最低1回の再送が要る（前 intent の裁定） |
| agmsg 側すべて | repo 外・read-only |
| `codex_member_cmd` | 既に `\$agmsg actas $role` を使用。#1388 が別途扱う |
| `handle_exit`（`:1253`） | `rollback_prepared_run` を呼ぶ側。呼ばれる側の対象決定ロジックのみ変える |

## 配布面

正本 `packages/framework/core/tools/team-up.sh` の変更は、`dist/` 6面 + self-install 4面 = 計11コピーへ `bun scripts/package.ts` と `bun run promote:self` で伝播させる（NFR-4）。**U1 と U2 の唯一の交差点はこの配布同期**であり、後着 PR 側で再生成が要る。
