# Wireframes(ターミナル UX モックアップ)— インストーラの実装

> ステージ: rough-mockups (Ideation) / 作成: 2026-07-07
> 上流入力: `../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`
> 方針の出典: `rough-mockups-questions.md`(英語デフォルト + `--lang ja`、標準ウィザード、ミニマル出力 + 差分テーブル)

CLI プロダクトのため、ワイヤーフレームはターミナル入出力のモックアップとして表現する。表示は初期案であり、文言・レイアウトは construction で調整される。

**アクセシビリティ方針(CLI 向け)**: GUI 向けの見出し・ランドマーク規約は適用外とし、次の3点を全画面共通の規約とする — (1) 状態は色のみに依存せず必ず記号+文言で併記(`done` / `failed` / `user-owned`)、(2) 出力は行単位のプレーンテキストでスクリーンリーダーの読み上げ順=表示順、(3) 操作はすべてキーボードのみで完結(矢印選択には番号入力の代替を用意)。

## M1: init — 対話式ウィザード(標準 2〜3 ステップ)

```
$ bunx @amadeus-dlc/setup

Amadeus Setup v0.7.0

? Which harness do you want to install?
  > claude     (Claude Code)
    codex      (Codex CLI)
    kiro       (Kiro CLI)
    kiro-ide   (Kiro IDE)

? Install into: /path/to/your-project  (current directory)  [Y/n]

  Plan:
    harness   claude
    version   v0.7.0 (latest)
    target    /path/to/your-project

? Proceed? [Y/n]

  Downloading v0.7.0 from GitHub... done
  Installing .claude/ (142 files)... done
  Installing amadeus/ workspace... done

  Done in 24s. Next steps:
    1. Open your project with Claude Code
    2. Run /amadeus and describe what you want to build
```

<!-- Text fallback: initコマンドは「ハーネス選択→導入先確認→実行前サマリー確認」の3ステップの後、取得・展開の進行を1行ずつ表示し、完了時にネクストステップ2件を案内する -->
<!-- アクセシビリティ注記: ハーネス選択は矢印キーに加え番号入力(1-4)でも選択可能。進行表示は行単位テキストで読み上げ順=表示順 -->

## M2: init — 非対話モード(CI・スクリプト用)

```
$ bunx @amadeus-dlc/setup --harness claude --target ./my-project --yes

  Amadeus Setup v0.7.0
  Downloading v0.7.0 from GitHub... done
  Installing .claude/ (142 files)... done
  Installing amadeus/ workspace... done
  Done in 21s.
```

<!-- Text fallback: 非対話モードはフラグ(--harness/--target/--yes)ですべての質問を省略し、同じ進行表示のみを出す -->
<!-- アクセシビリティ注記: 対話要素ゼロのためCIログ・支援技術で完全に再現可能な行単位出力 -->

## M3: upgrade — 差分レポート(適用前・ファイルレベル)

```
$ bunx @amadeus-dlc/setup upgrade

  Amadeus Setup v0.7.0
  Detected installation: claude harness, v0.6.9 -> v0.7.0

  Changes to apply:

  | Action  | Files | Examples                                  |
  |---------|-------|-------------------------------------------|
  | add     |     4 | .claude/skills/amadeus-compose/SKILL.md   |
  | update  |    23 | .claude/tools/amadeus-orchestrate.ts      |
  | skip    |     7 | .claude/settings.json (user-owned)        |

  Framework files (amadeus-*) will be updated. User files are never touched.
  Use --force to overwrite everything. Use --details for the full file list.

? Apply upgrade? [Y/n]

  Upgrading... done (27 files changed)
  Done in 18s.
```

<!-- Text fallback: upgradeは導入済みバージョンを検出し、add/update/skipの3行テーブルで適用前サマリーを表示。非破壊マージの説明と--force/--detailsの案内を添え、確認後に適用する -->
<!-- アクセシビリティ注記: 差分テーブルはASCII罫線のみ・1行1ファイル種別で読み上げ順が保たれる。skip理由(user-owned)は文言で明示 -->

## M3a: upgrade — 非対話モード(CI・スクリプト用)

```
$ bunx @amadeus-dlc/setup upgrade --yes

  Amadeus Setup v0.7.0
  Detected installation: claude harness, v0.6.9 -> v0.7.0
  Changes: 4 added, 23 updated, 7 skipped (user-owned)
  Upgrading... done (27 files changed)
  Done in 17s.
```

`--yes` は差分レポートの確認プロンプトを自動承認する(レポート自体は1行サマリーで表示)。非破壊マージの保証は対話モードと同一。

<!-- Text fallback: upgrade --yesは確認プロンプトを省略し、差分を1行サマリーに圧縮して自動適用する。非破壊マージは変わらない -->
<!-- アクセシビリティ注記: 非対話出力は完全な行単位テキストでCIログ・スクリーンリーダーの両方に適する -->

## M3b: upgrade --force — 完全上書き(破壊的操作の安全策)

```
$ bunx @amadeus-dlc/setup upgrade --force

  Amadeus Setup v0.7.0
  Detected installation: claude harness, v0.6.9 -> v0.7.0

  WARNING: --force overwrites ALL framework-managed paths,
  INCLUDING files you may have customized:

  | Action    | Files | Examples                                |
  |-----------|-------|------------------------------------------|
  | add       |     4 | .claude/skills/amadeus-compose/SKILL.md  |
  | update    |    23 | .claude/tools/amadeus-orchestrate.ts     |
  | OVERWRITE |     7 | .claude/settings.json (was user-owned)   |

? Type "force" to confirm, anything else to abort: _

  Upgrading (force)... done (34 files changed)
  Done in 19s.
```

安全策: (1) `--force` は通常の Y/n ではなく `force` の明示入力を要求する二段階確認、(2) 上書き対象となるユーザー所有ファイルを OVERWRITE 行で事前列挙、(3) 非対話で使う場合は `--force --yes` の両指定を必須とする(`--force` 単独では確認プロンプトが出る)。

<!-- Text fallback: --forceは警告文と上書き対象(ユーザー所有ファイル含む)を事前表示し、"force"の明示入力による二段階確認を経てから完全上書きする。非対話では--force --yesの両指定が必要 -->
<!-- アクセシビリティ注記: 警告はWARNING文言で明示(色に依存しない)。確認は文字列入力のためキーボードのみで完結 -->

## M4: エラー表示(ネットワーク失敗、feasibility R2 の緩和)

```
$ bunx @amadeus-dlc/setup

  Amadeus Setup v0.7.0
  Downloading v0.7.0 from GitHub... failed

  Error: could not reach github.com (network timeout)
  - Check your network or proxy settings
  - Retry with: bunx @amadeus-dlc/setup
```

<!-- Text fallback: ネットワーク失敗時は原因と対処(ネットワーク確認・リトライコマンド)を明示する -->
<!-- アクセシビリティ注記: エラーは "Error:" 接頭辞の文言で明示し、対処法を箇条書きで直後に置く -->

## M5: upgrade — 未導入エラー(user-flow フロー2の Z1)

```
$ bunx @amadeus-dlc/setup upgrade

  Amadeus Setup v0.7.0

  Error: no Amadeus installation detected in /path/to/project
  - To install for the first time, run: bunx @amadeus-dlc/setup
```

<!-- Text fallback: 未導入プロジェクトでupgradeを実行すると、未検出エラーとinitコマンドの案内を表示する -->
<!-- アクセシビリティ注記: M4と同一のエラー表示規約(Error:接頭辞+箇条書きの対処) -->

## init を既存導入済みディレクトリへ実行した場合(仕様注記)

既存導入の自動検出・マイグレーションは初回スコープ外(intent-backlog W4)だが、init は盲目的に上書きしない: 展開先に既存ファイルがある場合は upgrade と同じ非破壊マージ規則(フレームワーク所有ファイルのみ更新、ユーザーファイルはスキップ)を適用し、実行前サマリーに skip 件数を表示する。専用の検出メッセージ(「導入済みのようです。upgrade をお使いください」等)は将来拡張とする。

## 日本語表示(--lang ja)

すべてのメッセージは `--lang ja` で日本語化される(例: `? どのハーネスをインストールしますか?`)。メッセージカタログの構造は construction で設計する。
