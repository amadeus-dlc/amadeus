# Code Summary — U3-mirror-config

Integration spot-check: U3-CG-SPOT-001 — `packages/framework/core/tools/amadeus-mirror-config.ts`

## 実装結果

- `packages/framework/core/tools/amadeus-mirror-config.ts` を正本として追加した。
- `auto-mirror` boolean だけを受理し、未指定時は `{ autoMirror: false }` とする schema、型、3層 path 写像を定義した。
- global → space → intent の後勝ち merge を実装した。どの層かに invalid があれば部分設定を返さず、全 invalid 層と各層内の全 error を返す。
- JSON 構文破損、未知キー、型不整合、配列・null・primitive root を fail-closed で扱う。
- `ENOENT`（dangling symlink を含む）だけを absent とし、directory、`ENOTDIR`、その他 I/O 障害は path 付き invalid とする。
- `resolve(projectDir, space, intentDir, reader?)` は固定3面を各1回読むだけの read-only API とし、cursor 探索、cache、retry、書込 API、追加依存を導入していない。

## テスト

- Unit: `tests/unit/t257-amadeus-mirror-config.test.ts`
  - schema/default/path、parse の合法・不正入力、root 型拒否、複数違反全件列挙、3層 present/absent 全8組合せ、invalid 原子拒否、reader 回数と cache 不在を検証した。
- Integration: `tests/integration/t257-amadeus-mirror-config.integration.test.ts`
  - 実ファイル上の優先順位、各層 invalid、ENOENT、dangling symlink、directory、`ENOTDIR`、read-only を検証した。
- 対象テスト: 35 pass、0 fail、56 assertions。
- 全体 CI（coverage 付き）: 463 files、6693 assertions、0 fail。Claude substrate と live AWS のみ環境要因でスキップされた。
- lcov: `amadeus-mirror-config.ts` の実行対象行は 95/95 hit（対象テスト単独では 108/108 hit）。
- TypeScript typecheck、対象 Biome、`dist:check`、`promote:self:check` はすべて成功した。
- 全体 `lint:check` は終了コード 0。リポジトリ既存の complexity 等 250 warnings が表示されたが、新規 U3 3ファイルには warning がない。

## 配布

- core 正本から Claude、Codex、Cursor、Kiro、Kiro IDE、OpenCode の6 harnessへ生成し、全ファイルの byte 一致を確認した。
- project-local の Claude、Codex、Cursor、OpenCode 自己導入面も `promote:self` で同期した。

## 差分と逸脱

- `package.json`、lockfile、既存 `amadeus-settings.ts`、test runner、TypeScript/Biome 設定は変更していない。
- 計画からの機能的逸脱はない。
- TDD の赤状態は同一作業中に先行作成した assertion で契約を固定したが、最終成果物には失敗ログを保存していない。
