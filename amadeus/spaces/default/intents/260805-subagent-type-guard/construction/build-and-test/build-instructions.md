# Build Instructions — Issue #2279 (subagent 型規律ガード + model 属性)

**上流入力**: 全 3 Unit の `code-generation-plan.md` / `code-summary.md`
(U1 detection-skeleton / U2 model-attribution / U3 subagent-stats)

本書は本 Intent の変更を**ビルドできる状態にする手順**である。対象リポジトリは
Bun 専用の TypeScript monorepo で、常駐サービス・Web サーバ・DB を持たない。
成果物は短命な CLI 実行と、ハーネス面への投影(`dist/` → 各 `.claude` 等)である。

## 依存関係の導入

```bash
bun install --frozen-lockfile
```

- **bun**: 1.3.13 で実測。`bun` が PATH に無い場合は
  `export PATH="$HOME/.bun/bin:$PATH"`。
- **追加ランタイムなし**: 本 Intent の変更(U1〜U3)は node builtins と
  リポジトリ内モジュールのみに依存する。U1 の `amadeus-subagent-observability.ts`
  は `amadeus-lib.ts` を import しない(依存方向の固定 — business-logic-model)。
- **任意**: 複雑度ゲートは Python `lizard==1.23.0` を使う
  (`pip install lizard`)。未導入でもテストは skip して緑になる。

## 環境変数・設定

本 Intent の変更に**必須の環境変数は無い**。関連する任意の変数は以下。

| 変数 | 用途 | 既定 |
|---|---|---|
| `AMADEUS_NSD_TRUSTED_BASE_SHA` | no-silent-drop ゲートのベース revision | 未設定(check モードは要求する) |
| `AMADEUS_COMPLEXITY_ROOTS` / `AMADEUS_COMPLEXITY_BASELINE` | 複雑度ゲートの測定根と baseline の差し替え | リポジトリ既定 |

## ビルドコマンド

```bash
bun run build       # = bun run dist && bun run promote:self
```

- `bun run dist` — `scripts/package.ts` が 8 ハーネス面を再生成する
  (claude / codex / cursor / kimi / kiro / kiro-ide / opencode / pi)。
- `bun run promote:self` — 生成物をプロジェクトローカルの自己インストール面へ反映。

**重要(NFR-1 / U1 逸脱2 に対応)**: `packages/framework/core/` を編集したら
**必ず `bun run build` を実行する**。テストの多くは `dist/claude/.claude/tools/...`
を import しており、再生成前の dist を読むと変更が反映されず赤になる。
U1 の記録にも同じ落とし穴が逸脱として残っている。

## ビルド検証

```bash
bun run typecheck   # tsc --noEmit(本体 + tests の 2 プロジェクト)
bun run lint        # biome check(tests/ packages/setup/ packages/framework/core/ scripts/ plugins/)
```

- `lint` は **cognitive-complexity 警告を出したまま exit 0** になるのが正常な
  ベースラインであり、回帰ではない(AGENTS.md 明記)。エラー 0 が合格条件。
- 追加の受入ゲート:

```bash
bun tests/complexity-gate.ts --check      # ratchet(下げる方向のみ許容)
bun tests/gen-coverage-registry.ts --check
bun tests/callsite-guard.ts --check
bun run source-only:check                 # 生成物が Git 境界を越えていないか
```

## 実測結果(本ステージ実行時)

| コマンド | 結果 |
|---|---|
| `bun run build` | **exit 0** — 8 ハーネス面の再生成 + promote-self 同期 |
| `bun run typecheck` | **exit 0** |
| `bun run lint` | **exit 0**(warning 426 — 既存ベースライン、エラー 0) |
| `bun tests/complexity-gate.ts --check` | **OK** — 0 new violations / 0 regressions |
| `bun run source-only:check` | **clean** |

## よくあるビルド上の問題

- **テストは赤いがコードは正しい** → `bun run build` を忘れている。dist を再生成する。
- **`bun: command not found`(非対話シェル)** → Claude Code / Codex は `~/.zshrc` を
  読まない。`~/.zshenv`(zsh)または `~/.bashrc`(bash)に PATH を書く。
- **複雑度ゲートが RATCHET_REGRESSION** → 既存関数に分岐を足した。分岐をヘルパー
  関数へ退避すれば CCN は元に戻る(本 Intent でも `buildTree` 23→24 を同手法で解消)。
- **`dist/` の差分がコミットに現れる** → `dist/` は使い捨てのビルド出力。コミット
  しない(`source-only:check` が Git 境界を守る)。
