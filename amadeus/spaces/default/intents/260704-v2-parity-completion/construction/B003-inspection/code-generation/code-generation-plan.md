# Code Generation Plan：B003 検査整備

対象 Unit: U005（validator 新契約追従）+ U006（パリティ検査機械化）。

## 変更内容と順序

| # | 変更 | 対象 | 検証方法 |
|---|---|---|---|
| 1 | 互換対象の先行登録 | `docs/backward-compatibility.md` を新規作成し、旧形式 record（完了済み 2 件 + 進行中の 260704 hybrid record）を対象、理由、終了条件つきで登録する（backward-compatibility rules の「実装前に記録」に従う） | 文書が存在し 3 対象が登録されている |
| 2 | validator の旧形式除外と v2 契約対応 | AmadeusValidator に (a) backward-compatibility.md 記載 record の扱い（現行の旧形式検査を維持）、(b) 未記載の新規 record への v2 契約検査（必須成果物を `.claude/aidlc-common/stages/` の frontmatter produces から導出、phase-check と audit shard の存在検査）を追加。TDD（先に fail する検証を書く） | `test:it:amadeus-validator` green + 新規テストが v2 record 判定を検証 |
| 3 | パリティ基準 manifest の生成 | `dev-scripts/generate-parity-baseline.ts`（新規）で上流 clone（fde1e1af）から skill 一覧とエンジンファイル hash 一覧を抽出し、`dev-scripts/data/parity-baseline.json` としてコミット | 基準 commit が manifest に記録されている |
| 4 | パリティ検査の実装 | `dev-scripts/parity-check.ts` + `parity-map.json`（名前写像 aidlc-* ↔ amadeus-*、除外リストと理由）。TDD。検査: (a) 上流 38 skill ↔ amadeus-* skill の 1 対 1、(b) エンジンディレクトリの hash 一致、(c) 除外外の予期しない差分ゼロ | `npm run parity:check` green |
| 5 | npm script 配線 | `parity:check` を package.json に追加し、`test:ci:mock` 連鎖へ組み込む | `npm run test:all` green |

## 除外リストの初期内容（parity-map.json）

- 名前写像: aidlc-<x> → amadeus-<x>（入口 aidlc → amadeus）
- 除外（理由つき）: 上流 aidlc/ seed と .mcp.json と CLAUDE.md（既存実データと開発環境を正とする）、settings.json の hooks 以外（C001）、rules/aidlc.md の配置（symlink 化。実体は .agents/rules/）、question-rendering.md の references/ 移設、SKILL.md の適応差分（改名 + bridge 段落）、独自 3 skill、B004 まで残置の旧 skill 群
