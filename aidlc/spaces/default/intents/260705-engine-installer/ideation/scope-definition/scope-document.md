# Scope Document — Engine Installer（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)

## スコープ内

1. **インストーラ本体**（リポジトリ内 TS スクリプト、`bun run <script> --target <workspace>`）
   - フルセット配置: エンジン `.agents/amadeus/` 一式（7 dir）、amadeus* skills 2 系統、`AMADEUS.md`
   - `.claude/` symlink 配線 7 entry の再作成
   - `settings.json` の hooks 配線の冪等マージ（利用者の他設定に触れない）
   - 配置直後の軽量スモーク（doctor 相当）の自動実行
   - 冪等な再実行（上書き更新型 + `aidlc/` 不可侵）
2. **専用 eval**: 一時ディレクトリへ実インストール → node_modules なし・bun cache 冷・オフライン相当で全 tools + 全 hooks の module load を駆動。`test:all` へ組み込み
3. **README の利用者向け導入手順**（doctor + amadeus-validator の検証手順を含む）
4. **AMADEUS.md の扱いの確定**: 利用者向け再構成の程度は残実装判断（Inception で確定）

## スコープ外

| 項目 | 理由 | 行き先 |
|---|---|---|
| bunx / npm レジストリ公開、dist 生成物方式 | 未リリースのため範囲外 | 将来 Issue（本スクリプトを中核に再利用） |
| Windows の symlink 対応 | 現時点で対象環境にない | 必要になったら後続 Issue（grilling 確定 3） |
| OTel 計装（#441） | 本 Intent の成果に依存する後続 | Issue #441 |
| `.agents/rules/` の配布 | 本体開発向け | 対象外（grilling 確定 1） |
| エンジン本体・validator の変更 | 並行 Intent（#428、bug 束ね）の担当範囲 | 各 Intent |
| `aidlc/` の作成・初期化 | birth はエンジンの仕事 | エンジン（CON-1） |

## 受け入れ条件（Issue #451 の 4 点）

1. 正準のインストール手順が 1 コマンドで実行できる。
2. インストール先 workspace（node_modules なし、bun cache 冷、オフライン）で、全ツールと全 hook が module load 時に落ちずに動作する。
3. インストールを再実行しても壊れない。
4. README に利用者向けの導入手順が記載される。

## 段階分割

単一 PR を既定とする（feature scope の 1 Intent。インストーラ + eval + README は分割するとどれも単独で受け入れ条件を検証できないため不可分）。Bolt 分割は delivery-planning で確定する。
