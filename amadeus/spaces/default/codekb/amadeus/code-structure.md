# Code Structure

> Reverse Engineering 成果物 — 分析対象: main @ 14c40c9c(現 HEAD e2c28731、2026-07-07 鮮度リフレッシュ)

## トップレベル構成

| パス | 役割 | 編集可否 |
|---|---|---|
| `core/` | ハーネス中立のソースオブトゥルース | **ここを編集する** |
| `harness/{claude,codex,kiro,kiro-ide}/` | ハーネス別表層(manifest.ts + SKILL.md + question-rendering.md、codex のみ emit.ts) | 編集可 |
| `scripts/` | `package.ts`(671行、配布ビルド)、`promote-self.ts`(264行、昇格) | 編集可 |
| `dist/{claude,codex,kiro,kiro-ide}/` | 生成物。コミットされ `--check` でドリフトガード | **手編集禁止** |
| `.claude/` `.codex/` `.agents/` | セルフインストール(promote:self の出力、38スキル) | 昇格で更新 |
| `amadeus/spaces/default/` | ワークスペース: `memory/`(手編集メソッド層)+ `intents/` + `codekb/` + `knowledge/` | memory は手編集ソース |
| `tests/` | 4層テスト(smoke 12 / unit 117 / integration 100 / e2e 64) | 編集可 |
| `docs/` | guide / harness-engineering / reference 00-17 | 編集可 |

## core/ の内部構成

| サブディレクトリ | 内容 |
|---|---|
| `core/tools/` | CLI ツール 27 本(TypeScript、bun 実行)。orchestrate / state / log / audit / directive / runtime / learnings / swarm / runner-gen / version 等 |
| `core/hooks/` | フック 11 本(stop / mint-presence / sensor-fire / セッションライフサイクル / 状態同期・検証 / サブエージェント追跡 / statusline) |
| `core/agents/` | ドメインエージェント 11 体(`amadeus-<role>-agent.md` フラットファイル) |
| `core/sensors/` | センサーマニフェスト 4 本(required-sections / upstream-coverage / linter / type-check) |
| `core/skills/` | read-only セッションスキル 3 本(session-cost / replay / outcomes-pack) |
| `core/amadeus-common/` | `conductor.md` + `protocols/` 4本(stage-protocol.md 1000行を含む)+ `stages/` 5フェーズ 32ステージ |
| `core/knowledge/` | エージェント別・共有の方法論リファレンス |
| `core/scopes/` | スコープ定義(1ファイル1スコープ)。composed scope(例: `amadeus-grilling-integration.md`)はランタイム動的登録で dist 生成物には含まれない |
| `core/memory/` `core/templates/` | メソッド層シード・テンプレート |

## ファイル分類とコードパターン

- **命名規約**: フレームワークファイルはすべて `amadeus-` プレフィックス(tools / hooks / agents / sensors)。テストは `tests/` 配下 `t<N>-*.test.ts`
- **実行規約**: tools / hooks はすべて `.ts` で bun 直接実行。実行ビット不要(クロスプラットフォーム規約)
- **トークン置換**: core 内の `{{HARNESS_DIR}}` がビルド時にハーネス別ディレクトリ名へ置換される。これが core→dist の唯一の変換(+ rules ディレクトリのリネーム: kiro=steering, codex=amadeus-rules)
- **生成 vs 手書き**: `stage-graph.json` / `scope-grid.json` / ステージランナースキルは dist のみに存在する compile 生成物。core には対応ソース(ステージ frontmatter)だけがある
- **スキル frontmatter パターン**(read-only): `name` / `description` / `argument-hint` / `user-invocable: true` / `classification: read-only`。grilling スキル新設時の参照実装
- **ワークフロー成果物の配置**: intent ごとに `amadeus/spaces/<space>/intents/<slug>-<id8>/` 配下、ステージ観察日誌は `<record>/<phase>/<stage>/memory.md`

## 変更フロー(鉄則)

1. `core/`(または `harness/<name>/`)を編集
2. `bun scripts/package.ts` で全 dist 再生成
3. `bun run promote:self` でセルフインストールへ昇格
4. 1〜3 を**同一コミット**に含める(`--check` / `promote:self:check` / runner-gen check / t68 の4種ドリフトガードが乖離を検出)
