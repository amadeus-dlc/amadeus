# Intent Capture 質問 — 260725-kimi-harness

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 全4問ともユーザー本人の HUMAN_TURN 直接回答 — Guide me 対話で1問ずつ回答を受領。Q3 はユーザー指摘により設計導出可能な事項として撤回し事前裁定へ移動)。合意サマリのユーザー承認タイムスタンプ: 2026-07-25T05:59:22Z(「1」= 確認OK)
> モード: Guide me(対話式 — 質問は提示済みの全4問)
> 事前整理済みの裁定(承認済みプランより。前提知識として質問対象外):
> - ハーネス名 `kimi`、harnessDir `.kimi-code`(Kimi ネイティブのプロジェクト dir と一致)
> - 移植手順は `docs/harness-engineering/09-porting-to-a-new-harness.md` に従う(manifest + hook adapter + tests。packager が自動検出)
> - レイアウトは emit なし・デフォルト runner-gen(`.kimi-code/skills/`)、`rulesRename: null`、core agents → `.kimi-code/agents/`
> - Kimi plugin (`kimi.plugin.json`) 経由の配布は不採用(per-user・全プロジェクト適用で、バージョンをプロジェクト固定する思想と不合。将来の追加チャネル候補)
> - swarm は `subagent` フロアのみ(ultra ドライバは将来)
> - Kimi Code の拡張サーフェス(hooks 16イベント・Claude 型 payload、`.kimi-code/{skills,agents}/` 自動検出、AskUserQuestion 実在)は公式 docs で確認済み
> - ゲート・質問のレンダリング方針は harness 固有の `question-rendering.md` annex に書かれる設計事項(ユーザー判断ではない)。Kimi は AskUserQuestion + PostToolUse 観測が成立するため claude 型 annex(構造化質問 + 質問ツールの PostToolUse で presence mint)を採用する。プローズ回答は UserPromptSubmit 経由の fallback として許容(当初 Q3 として提示したが設計導出可能なため撤回し本項へ移動)

## Q1. 本intentの成功指標(何をもって完了とするか)

事実(自己調査): 既存ハーネス(claude/codex/cursor/kiro/kiro-ide/opencode)は `dist/<name>/` コミット + `package.ts --check` の byte-parity guard + t145 packaging parity でカバーされる。doctor・live journey はハーネスごとに実装度が異なる(opencode は hooks 未配線で doctor は advisory 降格)。

- A. dogfood完結(推奨): `dist/kimi/` 生成・`--check` パス・決定的テスト green に加え、このリポジトリへのセルフインストール(promote-self)と実機セッションでの `/skill:amadeus` 起動・hook 発火・doctor パスまでを完了条件とする
- B. 機構の設置のみ: dist 生成・parity・決定的テスト green まで。実機 dogfood は後続intentに委ねる
- C. 配布完結: A に加え、npm インストーラ経由の外部プロジェクト導入(setup CLI での kimi 選択・配置・hook マージ)まで実機検証する
- X. Other (please specify)

[Answer]: A — dogfood完結(dist生成・--check・決定的テスト green に加え、promote-self セルフインストールと実機 /skill:amadeus 起動・hook発火・doctor パスまで)(2026-07-25, Guide me)

## Q2. ユーザー `~/.kimi-code/config.toml` への hook 配線マージの扱い

事実(自己調査): Kimi にはプロジェクトレベルの config.toml が存在せず(公式 overrides 明記)、`[[hooks]]`・`[[permission.rules]]` はユーザーレベルのみ。codex は `$CODEX_HOME/config.toml` への trust 登録を doctor が検査する先例。ユーザー全体設定への書き込みは不可逆性のある外部境界(org/team ルール P4: 人間の明示承認を置く)。

- A. インストーラ冪等マージ(推奨): setup CLI が managed block(マーカーコメント囲み・冪等)をユーザーの明示承認付きでマージし、doctor が検査する。手動手順の fallback 表示も併設
- B. doctor 手順表示のみ: 自動マージは実装せず、doctor/onboarding doc が提示するブロックをユーザーが手動で貼る
- C. マージ + dry-run 既定: A に加え、既定は dry-run 表示で `--apply` 明示時のみ書き込む
- X. Other (please specify)

[Answer]: A — インストーラ冪等マージ(managed block・マーカー囲み・ユーザー明示承認付き。doctor 検査 + 手動 fallback 表示併設)(2026-07-25, Guide me)

## Q3. (撤回) Kimi 上のゲート・質問のレンダリング形式

ユーザー指摘により撤回: レンダリング方針は harness annex(`question-rendering.md`)の設計事項であり、ユーザー判断事項ではない。claude 型 annex 採用を事前裁定へ移動(ヘッダ参照)。提示済みの DECISION_RECORDED は監査に残るが回答は収集しない。

## Q4. live e2e journey(kimi バイナリ駆動テスト)の扱い

事実(自己調査・file:line 実測済み): tests/harness/ に `sdk-drive.ts` / `tui-drive.ts` / `kiro-acp-drive.ts` / `kiro-ide-driver.ts` が実在。e2e journey は tests/e2e/ の `t-exec-codex-*.serial.test.ts`(例: t-exec-codex-status.serial.test.ts:64-65 で `AMADEUS_CODEX_EXEC_LIVE !== "1"` なら skipReason 文字列を返す)、`t-tui-kiro-*` / `t-acp-kiro-*` / `t-ide-kiro-*` が同型ゲート。kimi 用には新規 driver(公式 docs 確認済みの `kimi -p` 非対話モード等)の作成が必要。

- A. driver 作成 + journey 実装(推奨): kimi 用 live driver を作成し、少なくとも1本の journey(起動→`/skill:amadeus --status` 等)を `AMADEUS_KIMI_*_LIVE=1` ゲートで実装。ローカルで実走してからマージ
- B. 決定的テスト + 手動 dogfood まで: driver は作らず、adapter 契約テスト(live-capture payload)と手動セッション検証に留める。driver は将来intent
- X. Other (please specify)

[Answer]: A — driver作成+journey実装(kimi -p 非対話駆動 driver を新規作成し AMADEUS_KIMI_*_LIVE=1 ゲートで1本以上実装。ローカル実走後マージ)(2026-07-25, Guide me)