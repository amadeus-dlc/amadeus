# Build vs Buy 判断 — Engine Installer（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 判断

**Build（リポジトリ内 TS スクリプトを自作）** とする（grilling 確定 4 の追認）。

| 選択肢 | 評価 | 判断 |
|---|---|---|
| 汎用インストーラ・dotfiles 管理ツールの流用（stow、chezmoi 等） | symlink 配線は可能だが、settings.json の hooks 冪等マージと `aidlc/` 不可侵という固有規則は結局自作になり、外部依存だけが増える | 却下 |
| 上流 dist 方式の移植 | 適応コピー（改名・結線）を含む本リポジトリでは dist 生成の維持コストが先行し、未リリース段階では過剰 | 却下 |
| 手順書のみ（Buy でも Build でもない） | 壊れる要素（symlink 7 entry、settings.json、skills 2 系統）が実在し、1 コマンド導入の受け入れ条件を満たせない | 却下 |
| **Build（採用）** | 配置・配線・スモーク検証を 1 スクリプトに閉じ、dev-scripts ルール（Bun + TS、TDD）と専用 eval にそのまま載る | 採用 |

## 自作範囲と流用範囲

- **流用**: 検証層の既存資産（doctor 相当の起動チェック、amadeus-validator、`test:all` の eval 基盤）。エンジン本体（コピー元）は変更しない。
- **自作**: インストーラ本体（フルセット配置、symlink 再作成、settings.json hooks 冪等マージ、スモーク実行）と専用 eval（一時ディレクトリへ実インストール → cold cache + オフライン相当で全 tools + 全 hooks の module load 駆動）。

## リスクと緩和

| リスク | 緩和 |
|---|---|
| 並行 Intent（#428 上流同期、bug 束ね）によるエンジンレイアウト変更 | インストーラはレイアウトを読むだけで書き換えない設計とし、レイアウトの列挙を 1 箇所に集約して追従を容易にする |
| 利用者 workspace の既存設定の破壊 | settings.json は hooks 配線のみ冪等マージ、`aidlc/` は不可侵（grilling 確定 5） |
| Windows 環境の symlink 制約 | 現時点では対象外。必要になったら後続 Issue（grilling 確定 3） |
