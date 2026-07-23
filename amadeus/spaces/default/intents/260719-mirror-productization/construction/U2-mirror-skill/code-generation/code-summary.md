# Code Summary — U2-mirror-skill

Integration spot-check: U2-CG-SPOT-001 — `packages/framework/core/skills/amadeus-mirror/SKILL.md`
Integration spot-check: U2-CG-SPOT-002 — `packages/framework/core/skills/amadeus-mirror/SKILL.md`

## 実装結果

- `packages/framework/core/skills/amadeus-mirror/SKILL.md` を唯一の正本として追加した。
- Step 1 を status の単一診断入口とし、exit 0 / 1 / 2、process起動失敗、未知exit、構造不正を区別した。
- exit 1 は stdout の全非空行が U1 の検証済み finding kind で始まる場合だけ diverged と分類する。未知kind、空出力、構造不正、起動／実行失敗は loud stop とした。
- 分類に使える情報を `mirror-missing` / `stale-status-line` / `issue-drifted` のkindだけに限定した。detail と stderr は表示専用で、解析・評価・shell展開・verb抽出・実行を禁止した。
- `mirror-missing`→create、`issue-drifted`→sync、stale→sync/close両候補を固定し、syncの更新動作とcloseのfail-closed landing checkを説明した。人間が最終verbを明示選択するまで実行しない。
- executable bash fenceから`[--intent <dirName>]`を除去した。任意intent指定は実在directoryの正確なbasenameを検証し、shell commandを構築せず単一argvで渡す別手順とした。
- 実行入口を `bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts <fixed-verb>` に限定し、直接のGitHub CLI呼出、state操作、retry、別verbへの自動切替を追加していない。
- create / close は conductor から実行する運用合意であり機械強制ではないこと、team.mdを正本参照すること、close-after-landing検証はtool側にあることを明記した。

## 配布

- Claude、Kiro、Kiro IDE、Cursor は manifest `coreDirs` から投影した。
- Codex、OpenCode は既存 session-skill emit 経路へ追加した。Codex には既存規約どおり implicit-invocation guard も生成した。
- 6 harness の生成済み SKILL と Claude / Codex / Cursor / OpenCode の自己導入面を同期した。
- 既存 skill 集合、Codex件数、OpenCode emit、Cursor manifest の固定期待を新しい5 session-skill構成へ更新した。

## ドキュメント

- `docs/guide/17-skills.md` と `docs/guide/17-skills.ja.md` に対応する Mirror workflow 節を追加した。
- 両言語で4 verb、exit 0 / 1 / 2、3 finding、人間の最終選択、自由文非実行、運用注記を同期した。
- 両言語でstaleの両候補と任意intentのbasename・単一引数境界を同期した。

## テスト結果

- U2対象 unit / integration / E2E相当: 3ファイル、51 tests、166 assertions、0 fail。
- U1 mirror、既存 session skills、skill conformance、Codex packaging回帰: 7ファイル、423 tests、622 assertions、0 fail。
- 全CI: 465 files、6736 assertions、0 fail。
- `bun run typecheck`: green。
- 対象 Biome: green。全体 `lint:check` は終了コード0で、既存 complexity等250 warningsを報告した。
- `bun run dist:check` / `bun run promote:self:check`: 6 harness と自己導入面すべて green。
- coverage付き対象テストと coverage付き全CIを実行した。U2は文書成果物のため、契約カバレッジをunit / integration / E2Eの全決定表ケースで固定した。

## Reviewer Iteration 1 是正検証

- stale-status-lineのdetailに含まれる状態値を一切解析せず、kindだけでsync/close両候補を提示する契約へ変更した。
- executable bash fenceを引数なし固定4行へ変更し、任意intentを実在directoryの正確なbasenameとして検証後に単一argvで渡す境界を追加した。
- placeholderがexecutable lineへ混入しないこと、intent値をshell commandへ補間・分割・展開しないことをunit/E2E相当で固定した。
- 再生成後にU2対象テスト、typecheck、対象Biome、`dist:check`、`promote:self:check`がすべてgreen。

## 差分と逸脱

- `package.json`、lockfile、test runner、TypeScript / Biome設定、U1 tool本体は変更していない。
- 機能設計の「6 harness coreDirs」という概括に対し、現行packagerの正規経路に合わせて Codex / OpenCode は emit列挙を使用した。6面投影結果と単一正本は維持している。
- 初回全CIで OpenCode / Cursor の旧固定集合と test-size purity の3回帰を検出し、対応する期待値更新とBun text loaderによるSmall unit test化で解消した。
- 未解決事項はない。
