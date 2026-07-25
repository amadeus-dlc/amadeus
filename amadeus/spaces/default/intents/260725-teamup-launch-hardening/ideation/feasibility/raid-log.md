# RAID Log — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`

- `intent-statement.md` — 「リスク」表の4項目を起点とし、feasibility の実測で解消したもの・数値化したもの・新たに判明したものへ再分類した。

測定 ref: HEAD `c4c9531ee`。

## Risks（リスク）

| ID | 内容 | 状態 | 緩和 |
|---|---|---|---|
| R-1 | **actas 移行で検証が再有効化され、起動レイテンシが退行する** | **顕在化（実測済み・最重要）** | 1メンバーの arming に 32.2秒。待機設計の変更（`mux_attach` 後への移動 / バックグラウンド化 / タイムアウト縮小）を U1 の PR に必ず含める（C-17）。requirements で数値付きの受け入れ基準を置く |
| R-2 | actas 排他ロックが resume 経路を塞ぐ | **未検証** | ドライバ step 4 は `status=held` で abort と規定。7メンバー同時起動での競合と、異常終了後のロック残存を requirements/nfr で扱う |
| R-3 | actas の受信範囲制限（`<name>` 宛のみ）が配送を壊す | **未検証・低** | チームモードは1 worktree に1ロールのため実質同等と見込む。実装時に実測確認 |
| R-4 | 並列 worktree の部分失敗でロールバックが壊れる | **未検証** | 実験では失敗ゼロだったため未観測。失敗注入での検証を build-and-test に含める |
| R-5 | 並列化の効果が期待より小さい | **顕在化（実測済み）** | 実測 7.39秒 → 3.32秒（2.2倍）。intent-statement の「1〜2秒」見込みは過大だった。requirements の期待値を 3.3秒前後へ訂正する |
| R-6 | Linux CI 上での並列度特性が macOS と異なる | **未検証・低** | 実測は macOS/APFS のみ。並列度は定数ではなく上限として設計し、環境依存を吸収する |

## Assumptions（前提）

| ID | 内容 | 検証状態 |
|---|---|---|
| A-1 | `team-up.sh` は既に `delivery.sh set monitor` を実行している（`:877-879`） | **実測確認済み** — これにより actas 移行の前提条件 C-1 は既に満たされる |
| A-2 | 初期プロンプトを actas 形にすれば PR #1477 の適用可否ガードが自動的に真を返す | **実測確認済み** — ガードは ` actas ` を含む形で真。`codex_member_cmd` の `\$agmsg actas $role` が実在の対照 |
| A-3 | agmsg は本 intent で変更しない | 設計方針（C-5） |
| A-4 | `ROLE_RESUME` は codex 専用経路であり claude 経路の actas 移行に影響しない | 起草時実測（`:1018` が `codex` を第1引数に渡す）。実装時に再確認 |

## Issues（課題）

| ID | 内容 | 状態 |
|---|---|---|
| I-1 | インストール済み `SKILL.md` の actas セクションが codex 向け記述で、claude-code の watcher 起動を規定していない | **上流（agmsg）の課題**。本 intent では変更しない。claude-code ドライバテンプレート側が正しい挙動を規定しており、実測でもそちらに従う挙動を確認した |
| I-2 | `t-team-up-watcher-arming.test.ts` が sentinel をテスト自身で書く構造 | 本 intent の完了条件に含む（C-16 / Q3 裁定 A） |

## Dependencies（依存）

| ID | 内容 |
|---|---|
| D-1 | agmsg スキル（`~/.agents/skills/agmsg/`）— read-only。特に `watch.sh` / `delivery.sh` / `lib/actas-lock.sh` / `drivers/types/claude-code/template.md` |
| D-2 | herdr — pane 生成・送信 |
| D-3 | git — worktree 作成の並列特性 |
| D-4 | 前 intent `260725-teamup-attach-latency`（PR #1477、マージ済み `8729199589`）の適用可否ガード。U1 はこのガードの分岐を「真」側へ倒す変更である |
