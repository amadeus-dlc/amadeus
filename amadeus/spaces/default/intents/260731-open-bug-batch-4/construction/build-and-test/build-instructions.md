# Build Instructions — 260731-open-bug-batch-4

上流入力(consumes 全数): code-generation-plan.md — 4 unit(fix-1811-supervisor-orphans / fix-1800-t224-diagnostics / fix-1797-t259-interleave / fix-1816-mirror-terminal-status)の実装計画から検証対象面(テスト3面+正本2面)を導出した。code-summary.md — 各 unit の変更ファイル一覧と検証コマンド実績を本書のビルド手順の根拠とした。

## ビルド構成

本リポジトリはトランスパイル成果物を持たない Bun 直接実行(TypeScript/ESM)。ビルドに相当する検証は以下の4段。

1. 型検査: `bun run typecheck`(`tsc --noEmit`)
2. リント: `bun run lint`(Biome、フォーマッタ無効)
3. 配布物同期: `bun run dist:check`(7ハーネス dist ドリフトガード)
4. セルフインストール同期: `bun run promote:self:check`

## 本 intent の対象面

- fix-1816(PR #1823)のみ正本接触(`amadeus-mirror-presentation.ts` / `amadeus-mirror-lifecycle.ts`)— dist 14面+self-install 10面の再生成を同 PR で同期済み(code-summary.md 基準4)。
- fix-1811 / fix-1800 / fix-1797 はテストファイルのみの変更で dist 非接触(各 code-summary.md で dist:check 0 を裏取り済み)。

## 実行結果(main worktree、HEAD 9008141df = PR #1823 着地後)

| コマンド | exit code |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
