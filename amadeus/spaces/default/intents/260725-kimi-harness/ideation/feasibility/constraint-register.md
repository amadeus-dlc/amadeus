上流入力(consumes 全数): intent-statement

# Constraint Register — 260725-kimi-harness

## 技術的制約

| ID | 制約 | 根拠(実測) | 設計への影響 |
|---|---|---|---|
| TC-1 | Kimi にプロジェクトレベルの config.toml が存在しない。`[[hooks]]`・`[[permission.rules]]` はユーザーレベル `~/.kimi-code/config.toml` にのみ書ける | 公式 overrides「The CLI currently reads a single user-level config file and has no project-level config file mechanism」 | インストーラが managed block を冪等マージする機構が必要。codex の trust-seed と同じ「マシン-wide の一手」 |
| TC-2 | ユーザーの実 config に既存 `[[hooks]]` が14件ある | `grep -c '^\[\[hooks\]\]' ~/.kimi-code/config.toml` = 14 | managed block はマーカーコメントで囲み、既存ブロックを保持・共存。削除は managed block のみ |
| TC-3 | harnessDir は `.kimi-code`(`.kimi` ではない) | 0.28.1 バイナリ実測・現行 en docs・このマシンの実在の3系統 | manifest の `harnessDir: ".kimi-code"`。レガシー `~/.kimi` 検出時は doctor が `kimi migrate` を案内する余地 |
| TC-4 | kimi バージョンフロアは実測値を下限とする | Q3=A(ユーザー承認)。実機検証は 0.28.1 | doctor は `kimi --version` を semver 比較し、下限未満を「未検証」として警告/失敗にする |
| TC-5 | bun が PATH 上で非対話シェルからも解決できること | 全ハーネス共通の前提(AGENTS.md) | onboarding doc の前提条件に明記 |
| TC-6 | hook コマンドの cwd はセッションのプロジェクト dir | 公式 hooks docs | adapter は cwd から `.kimi-code/hooks/…` を相対解決できる。未インストールのプロジェクトでは fail-open で無害 |
| TC-7 | Kimi は fast-moving(0.19→0.29 が約1ヶ月) | changelog 実測 | adapter は fail-open 設計、doctor は機能 probe も検査。payload の未知フィールドは寛容に扱う |

## 組織的制約

| ID | 制約 | 根拠 | 設計への影響 |
|---|---|---|---|
| OC-1 | ユーザーグローバル config への書き込みは外部境界。明示承認・バックアップ・マーカー囲み・除去手順を必須とする | team.md P4 + Q1=A(ユーザー承認) | インストーラのマージ機構の仕様として固定。開発中の live 配線テストも同手順に従う |
| OC-2 | 正本は `packages/framework/{core,harness}/` を編集し、`dist/`・セルフインストールは生成物として同期する | project.md Way of Working | `dist/kimi/`・ルート `.kimi-code/` は手編集しない。`package.ts` / `promote:self` で生成 |

## 規制・コンプライアンス制約

該当なし(開発用 CLI ツールの配布。個人情報・決済・医療データを扱わない)。なお認証情報は amadeus 側で保持せず、Kimi 側の credential store に委譲する(既存の gh-scripts-boundary 規則と同型の方針)。

## コスト制約

| ID | 制約 | 根拠 |
|---|---|---|
| CC-1 | live 検証(kimi 実機セッション・journey 実走)はモデル呼出しクレジットを消費する。許容範囲は「開発中の payload probe + journey のローカル実走(マージ前1回以上)」まで | Q2=A(ユーザー承認) |
