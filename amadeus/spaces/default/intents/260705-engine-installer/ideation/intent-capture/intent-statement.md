# Intent Statement — Engine Installer（260705-engine-installer）

対象 Issue: [#451 エンジンの copy 配布を成立させるインストーラを設計・実装する](https://github.com/amadeus-dlc/amadeus/issues/451)
上流確定判断: [grilling session 転記コメント](https://github.com/amadeus-dlc/amadeus/issues/451#issuecomment-4887231697)（Maintainer + leader、2026-07-06、設計論点 6 件確定）

## Problem Statement

配布前提（単一公開入口と skill 一式という配布契約、host 中立の `.agents/amadeus/` への移設 = CD009）は既存文書で確立しているが、利用者の workspace へエンジンを配る正準手順が存在しない（Q1 = E の主課題）。

素朴な手動コピーでは壊れる要素がある。`.claude/` 配下の 7 entry は `.agents/amadeus/` への相対 symlink であり、コピー時の symlink の扱いで結果が変わる。`settings.json` の hooks 配線、skills の 2 系統（`.claude/skills` と `.agents/skills`）も配布対象である。

従課題として、#441（OTel 計装基盤）の受け入れ条件「copy 配布した workspace（node_modules なし、bun cache 冷、オフライン）で全ツールと全 hook が動作する」が、正準手順の不在により再現可能な形で検証できない。本 Intent を #441 より先に解決する。

## Target Customer

主要な利用者は、Amadeus を自分の workspace へ導入する利用者（Claude または Codex ハーネスで使う開発者）である（Q2 = A）。

- Claude 利用者: symlink 配線 + settings.json マージまで含めて導入できる。
- Codex 利用者: `.agents/` 配置のみで成立する（追加配線なし。grilling 確定 2）。
- 二次利用者: 本体開発者と CI は、専用 eval（`test:all` 組み込み）を通じて配布の成立を継続検証する。

## Success Metrics

Issue #451 受け入れ条件（案）の 4 点を採用する（Q3 = A、B、C、D）。

1. 正準のインストール手順が 1 コマンドで実行できる（`bun run <script> --target <workspace>`）。
2. インストール先 workspace（node_modules なし、bun cache 冷、オフライン）で、全ツールと全 hook が module load 時に落ちずに動作する。
3. インストールを再実行しても壊れない（上書き更新型 + `aidlc/` 不可侵）。
4. README に利用者向けの導入手順が記載される。

## Initiative Trigger

配布前提（配布契約、CD009 の host 中立移設）が整った一方、配る正準手順が存在しないギャップが起点である（Q4 = A)。#441 の先行依存は優先順位の根拠である。

## Initial Scope Signal

scope は **feature**（Standard 深度）である。配布単位はフルセット（Q5 = A、grilling 確定 1）。

- エンジン `.agents/amadeus/` 一式（7 dir: agents、amadeus-common、hooks、knowledge、scopes、sensors、tools）
- amadeus* skills 2 系統（`.claude/skills/amadeus*`、`.agents/skills/amadeus*`）
- `.claude/` symlink 配線 7 entry（symlink 再作成方式）
- `settings.json` の hooks 配線（冪等マージ、利用者の他設定に触れない）
- `AMADEUS.md`
- 除外: `.agents/rules/`（本体開発向け）

導入形態はリポジトリ内 TS スクリプト、検証は 3 層分担（インストーラの軽量スモーク / 専用 eval / README の doctor + validator 手順）である（grilling 確定 4・6）。

## 技術文脈（architect 視点の補足）

- エンジンの正は `.agents/amadeus/` の 1 箇所であり、`.claude/` 側は相対 symlink で参照する。インストーラは symlink をコピーで保持せず張り直す（grilling 確定 3。Windows 対応は必要になったら後続 Issue）。
- `aidlc/` はインストーラの不可侵領域である。作成も変更もしない（birth はエンジンの仕事。grilling 確定 5）。
- 並行 Intent との接触面: engineer1 の #428（上流同期 = エンジンファイル更新）と engineer3 の bug Intent（エンジン tools + validator 変更）が並行中。インストーラはエンジンレイアウトを読むだけで書き換えないため並行可能だが、`package.json` の scripts 追記と eval 追加は追記型接触（union 解消可能）である。両 Intent の merge でエンジンレイアウトが変わったら追従する（ディスパッチの申し送り）。
