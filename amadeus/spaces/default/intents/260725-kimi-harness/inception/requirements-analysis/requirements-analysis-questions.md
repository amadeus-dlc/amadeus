# Requirements Analysis 質問 — 260725-kimi-harness

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 全2問ともユーザー本人の HUMAN_TURN 直接回答 — Guide me 対話。両問とも初回回答からユーザー修正で確定)。合意サマリのユーザー承認タイムスタンプ: 2026-07-25T08:04:28Z(「1」= 確認OK)
> モード: Guide me(対話式)
> 事前整理済みの裁定(質問対象外。承認済みゲートの決定を転記):
> - 成功指標 = dogfood完結(intent-capture Q1)。Must M1-M10 / Won't W1-W6(scope-document)
> - hook 配線 = managed block 冪等マージ + ユーザー明示承認 + 手動 fallback(intent-capture Q2、feasibility Q1)
> - バージョンフロア = 実測版 0.28.1(feasibility Q3)。実機配線・probe/journey のクレジット許容(feasibility Q1/Q2)
> - swarm 有効化(subagent フロア)(scope-definition Q1)。セッションスキル全量(Q2)
> - walking skeleton あり(最初の Bolt = M1 + package.ts kimi + --check)(practices-discovery Q1)

## Q1. Windows 対応の検証範囲

事実(自己調査): codex は「works identically on macOS, Linux, and native Windows PowerShell」(AGENTS.md)を謳い、hook は TypeScript を bun で実行する構成で実行ビット不要。本マシンは macOS で、Windows 実機はない。tests/e2e/windows/ は存在する(subagent 報告)。

- A. 設計上の互換は Must・実機検証は macOS のみ(推奨): adapter・managed block マージはパス区切り・改行コード・シェル差を考慮した設計にし、実機検証・live journey は macOS で実施。Windows 検証は CI の決定的テスト範囲に留める
- B. Windows も検証: Windows 実機または CI 上の Windows ランナーで live 検証まで行う
- C. 対象外: macOS/Linux のみサポートと明記する
- X. Other (please specify)

[Answer]: 既存ハーネスと同等の Windows 考慮に倣う — 既存 adapter/hook の実装パターン(bun 実行・実行ビット不要・ポータブルなパス処理)を踏襲し、専用の Windows 検証プログラムは設けない。実機検証は macOS、Windows 面の検証は CI の既存決定的テスト範囲(2026-07-25, Guide me。回答経緯: 初回 A → ユーザー「Windowsは検証環境なので対象外でいいです」→ 明確化対話 → 最終「既存レベルと同等として。完全対象外にする必要ない」で確定)

## Q2. hook マージの提示 UX(セットアップ CLI がユーザーの明示承認を取る方式)

事実(自己調査): feasibility Q2 で「managed block をユーザーの明示承認付きでマージ + 手動 fallback 併設」は決定済み。残るのは承認の取り方の UX 契約(ユーザー可視契約は requirements で固定する既定 requirements-analysis:c3)。

- A. 対話プロンプト(推奨): install/upgrade 時に「`~/.kimi-code/config.toml` に managed block を追加してよいか」を対話で確認し、No なら手動手順を表示する。dry-run で差分を事前表示する
- B. フラグ必須: 既定は dry-run 表示のみで、`--apply-hooks` 等のフラグ明示時のみ書き込む
- C. 両方: 対話プロンプト + 非対話環境ではフラグ必須(CI 検出で切替)
- X. Other (please specify)

[Answer]: 既存インストーラの流儀に準拠(kimi 独自 UX は新設しない) — plan report(FR-007)で managed block 変更を事前表示し、wizard の confirm() で承認を取る。非対話環境の扱いも既存 install/upgrade と同じ規則に従う(2026-07-25, Guide me。回答経緯: 初回 A(対話プロンプト)→ ユーザー「既存インストーラの流儀に合わせろ。kimiだけ特殊仕様を入れるな」で確定。既存流儀の実測: packages/setup/src/cli.ts:190 plan report 常時表示、:194/:296 confirm()、ports/tty.ts:7-9 select/input/confirm、reporter.ts:101-104 BR-I18 拒否時は変更なし中断)
