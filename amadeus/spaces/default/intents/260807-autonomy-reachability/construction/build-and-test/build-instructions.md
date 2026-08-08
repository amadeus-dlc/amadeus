# Build Instructions — autonomy-reachability(#2378)

上流入力(consumes 全数): 6 unit の `code-generation-plan.md`(各 unit の検証コマンド宣言)と `code-summary.md`(実測 exit code と着地面) — u1-autonomy-core / u2-birth-declaration / u3-question-route-observability / u4-conduit-parity / u5-measurement-report / u6-plugin-docs-drift。

## 正本と生成物の境界

本 intent が触った実装面はすべて `packages/framework/core/` と `packages/framework/harness/<name>/` の**正本側**である(project.md Mandated)。`dist/` とセルフインストール面は追跡されない生成物であり、編集対象ではない — `bun run build` で再生成する。

| 面 | 触った unit | 備考 |
|---|---|---|
| `packages/framework/core/tools/amadeus-intent-autonomy-production.ts` | u1, u2 | autonomy 判定と state 投影の正本 |
| `packages/framework/core/tools/amadeus-utility.ts` | u2 | `--autonomy` の parse と birth 適用、help text |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | u2 | ラダー順序、launch chain、carry latch |
| `packages/framework/core/tools/amadeus-log.ts` | u3 | `QUESTION_ANSWERED` の派生属性と route 集計 |
| `packages/framework/core/tools/amadeus-audit.ts` / `otel/event-registry.ts` | u1 | 新設イベントの登録と mapping |
| `packages/framework/core/amadeus-common/protocols/stage-protocol.md` | u4 | semi の decide-question 手順 |
| `packages/framework/harness/*/skills/amadeus/SKILL.md` ほか導線8面 | u4 | ハーネス入口 |
| `docs/` / `README.md` / `README.ja.md` | u4, u6 | 対訳は同一変更で同期 |
| `tests/` | u1〜u4 | t481〜t483 / t488〜t492 ほか |

## ビルド手順

```sh
bun install --frozen-lockfile
bun run build
```

`bun run build` は manifest が**検出した全ハーネス**へ投影する(固定数や一部列挙で止めない — project.md `cid:build-and-test:bt-dist-regen-seven-harnesses`)。ビルド後に `git status --short` で**追跡ファイルが不変**であることを確認する。source-only 境界により生成ツリーは追跡されないため、差分が出た場合は正本と投影規則の不整合を意味する。

## 検証コマンドと exit code の捕捉

各コマンドは**個別に**実行して exit code を読む — `&&` 連鎖やパイプ越しの `$?` は対象の失敗を無音化する(`cid:code-generation:no-exit-capture-through-pipe` / `cid:code-generation:no-grep-count-mid-chain`)。シェル変数へコマンド全体を入れてループで回すことも禁止(zsh は展開結果を単語分割せず exit 127 の偽失敗になる)。

```sh
bun run typecheck
bun run lint
bun tests/complexity-gate.ts --check
bun tests/gen-coverage-registry.ts --check
bun run source-only:check
bash tests/run-tests.sh --ci
```

## Coverage の判定所在

Project Coverage Gate(固定絶対下限 **AND** merge-base 相対許容低下幅)と Patch Coverage Gate はいずれも **PR CI を正**とする(project.md `cid:code-generation:local-lcov-pre-push`)。push 前のローカル `coverage:ci` 完走は必須にしない。赤の場合は CI の LCOV artifact と失敗条件を根拠に in-process seam を追加して再 push する。

ローカルで coverage を回す場合は **branch ごとに単独所有者を決めて直列化する** — runner が起動時に coverageRoot を rmSync するため、並行実行は相互破壊して双方の verdict を信頼不能にする(`cid:code-generation:c1-coverage-single-owner`)。
