# 比較分析 — Engine Installer（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 比較対象（配布・導入方式の類型）

| 方式 | 代表例 | 特徴 | 本 Intent への適合 |
|---|---|---|---|
| dist 生成物方式 | 上流 awslabs/aidlc-workflows（`dist/<harness>` のハーネス別ツリー） | ビルド時にハーネス別の配置を確定し、利用者はコピーするだけ | 不採用。未リリースの本リポジトリでは dist の生成・維持コストが先行し、symlink 配線と settings.json マージは結局スクリプトが必要（grilling 確定 4） |
| パッケージレジストリ方式 | bunx / npm create 系インストーラ | レジストリ公開により clone 不要で導入できる | 不採用（現時点）。未リリースのため範囲外。将来 bunx 化する場合も本スクリプトを中核に再利用する（grilling 確定 4） |
| 手動コピー手順書方式 | README のコピー手順だけを整備 | 実装コストが最小 | 不採用。`.claude/` の相対 symlink 7 entry、settings.json の hooks 配線、skills 2 系統で壊れる要素が実在する（Issue #451 背景） |
| リポジトリ内スクリプト方式 | clone したリポジトリから `bun run <script> --target <workspace>` | 配布元 = 本リポジトリ。TS で配置・配線・検証を一体化できる | **採用**（grilling 確定 4） |

## 採用方式の根拠

- 配布物の正は `.agents/amadeus/`（CD009 で host 中立化済み）の 1 箇所であり、リポジトリ内スクリプトは追加のビルド工程なしにこの正を直接読める。
- dev-scripts ルール（Bun + TypeScript、TDD）にそのまま適合し、専用 eval を `test:all` へ組み込める（grilling 確定 6）。
