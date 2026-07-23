# Component Methods — チーム機能のコア昇格

> 上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## C1: 境界ガードテスト(新設)

| 関数/契約 | シグネチャ骨子 | 備考 |
|---|---|---|
| `scanDistributionTreeForScriptsRefs` | `(roots: string[], allowlist: RegExp[]) => Finding[]` | 純関数(パス列+ファイル内容を受け取り出現単位で判定)。実 FS 走査は integration 層、判定は unit 層(cid:fs-tests-integration-first) |
| Finding | `{ file: string; line: number; excerpt: string }` | 検出0件で green。allowlist は正当出現(docs の説明文等)を id 付きで列挙 |

## C2: 選挙エンジン(移動 — 公開契約は不変)

既存 export 面(conductor 正本直読実測 2026-07-23: verb 9種は amadeus-election.ts:50 の Usage 文 verbatim `<open|notify|vote|status|tally|render|verify|next|report>`、handler 群 :246 handleOpen〜:588 main は reviewer iteration 2 の独立再実測でも一致確認済み)を**変更しない**: CLI verb 9種(open/notify/vote/status/tally/render/verify/next/report)、handler 群(handleOpen :246 〜 main :588)、model/store/record/transport の相互 import 構造。変更は import 1行(election.ts:46 → `./amadeus-norm-metrics`)のみ。

## C3: 選挙スキル(移動+配線)

| 変更点 | 内容 |
|---|---|
| SKILL.md 参照 | `bun scripts/amadeus-election.ts <verb>` 全出現 → `bun {{HARNESS_DIR}}/tools/amadeus-election.ts <verb>` |
| compatibility 行 | 「Requires bun and this repository checkout」→「Requires bun(CLI は配布コピー {{HARNESS_DIR}}/tools/ に同梱)」 |
| claude 配線 | packages/framework/harness/claude/manifest.ts coreDirs へ 1 entry 追加(既存 :51-54 の4スキル行様式 — 正本直読実測 2026-07-23) |
| codex 配線 | packages/framework/harness/codex/emit.ts:338 の明示リストへ `"amadeus-election"` 追加(正本直読実測 2026-07-23) |

## C4: チーム起動系(移動+prerequisite 検査)

| 関数/契約 | 内容 |
|---|---|
| `require_prerequisites()`(team-up.sh 冒頭に新設、bash 関数) | herdr/agmsg の PATH 検査。不在→ stderr に不在ツール名+公式入手先+docs 参照を出力し `exit 1`(FR-3c)。`uname` が Darwin/Linux 以外→ 非対応 loud エラー `exit 1`(FR-3d) |
| パス導出の修正 | `SAFETY_WAIT_HELPER` 等の `$REPO/scripts/...` 前提(team-up.sh:57 — 正本直読実測)→ スクリプト自身のディレクトリ相対(`$(dirname "$0")`)へ(FR-3b) |
| 既存 env 契約 | `HERDR`/`AGMSG_ROOT`/`AGMSG_SEND`/`AGMSG_HISTORY`/`TEAM_MSG`/`TEAM_*` 全て不変(NFR-2、FR-8a/8b) |

## C5: doctor advisory(拡張)

| 契約 | 内容 |
|---|---|
| 表示 | `Team Mode prerequisites:` 節+ `herdr: <path>` or `herdr: not found (see docs/guide team mode)` / agmsg 同形の2行 |
| exit code | doctor の既存 exit 意味論に**影響なし**(advisory — FR-4a)。検出は `command -v` 相当の PATH 探索のみ |

## C6: クリーン環境 E2E(新設)

| テストケース | 検証内容 |
|---|---|
| happy path | fake herdr/agmsg+temp HOME+self-install ツリーで起動→送信→選挙1完走(verb 呼び出し列を fake のログで assert) |
| herdr 不在 | PATH から除外→ exit 1+メッセージに "herdr" を含む(FR-3c) |
| agmsg 不在 | 同上 "agmsg" |
| 非対応 OS | uname スタブで FR-3d 分岐(bash 関数の単体駆動) |
| doctor advisory | 不在構成で doctor 出力に advisory 行+exit code 不変(FR-4) |

## C7: docs(新設)

- 20-team-mode.md(en/ja): 章構成 = Overview / Prerequisites(公式入手先3リンク+動作確認バージョン)/ Setup / Running an election / Operating Modes contract / Platform support(Windows 対象外)
- harness-engineering への3層規約追記: scripts(開発専用)/ contrib(ドッグフード専用)/ packages/framework(配布正本)+昇格の作法(移動・二重実装禁止・境界ガード)
