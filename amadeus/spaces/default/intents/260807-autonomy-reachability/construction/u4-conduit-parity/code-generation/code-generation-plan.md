# Code Generation Plan — u4-conduit-parity

上流入力(consumes 全数): functional-design/business-logic-model.md(導線追記の対象面と手順)、functional-design/business-rules.md(パリティ規則)、functional-design/domain-entities.md(導線エンティティ)、nfr-design/security-design.md(認可境界の不変)、nfr-design/logical-components.md(テスト配置)。補助参照: inception/requirements-analysis/requirements.md(FR-5a〜5e)。

本 plan は invoke-swarm 経路のディスパッチブリーフを正本とした conductor 事後作成である(cid:code-generation:swarm-unit-artifact-backfill)。

## 受け入れ基準(requirements.md FR-5 逐語)

- **FR-5a**: 対象8面 — `packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md` + `packages/framework/harness/{cursor,opencode}/commands/amadeus.md` — へ `--autonomy` 起動宣言の導線を追記する(finding 8: 現状全面0件)
- **FR-5b**: `amadeus-utility.ts` の help text、`README.md`、`docs/reference/24-intent-autonomy.md`/`.ja.md`(日英対訳同時)へ `--autonomy` を追記する
- **FR-5c**: `stage-protocol.md` に semi の decide-question 操作手順を新設する(:131 の契約宣言に対応する操作段落 — 現状 :135 は full 限定、finding 9)。あわせて claude `SKILL.md:248`「AUTONOMY IS NEVER INFERRED」を「エンジンに記録された mode による自動裁定は推論ではない」旨と整合するよう改訂
- **FR-5d**: 導線パリティ回帰テスト — 上記の全面に `--autonomy` の記載が存在することを機械検査する blocking テストを新設する(落ちる実証: いずれか1面から記載を除去して赤を実測)
- **FR-5e**: 順序制約 — FR-5 は FR-1 と同一 intent 内で着地する。FR-1 は u2 として着地済み(PR #2524)であり、導線が「書いてあるのに動かない」状態にはならない

## 実装方針

- **正本のみ編集**: `packages/framework/harness/...` を編集し、`dist/` とセルフインストール面は `bun run build` で再生成。追跡ファイルの不変を `git status --short` で確認
- **対訳同期**: `docs/reference/24-intent-autonomy.md` と `.ja.md` は同一変更で更新する
- **count-free**(cid:functional-design:c3-adjacent-enum-numerals): 隣接列挙のない散文に件数語を書かない。パリティテストの対象面集合も列挙から導出し、件数のマジックナンバーを置かない
- **落ちる実証は1セット**(cid:code-generation:falling-proof-injection-one-set): 除去 → 赤の実測 → 復元 → 残渣ゼロの機械確認を不可分に行い、復元は `git checkout <fix-sha> -- <path>` で行う
- **文言は実挙動に一致させる**: u2 の実装(`applyBirthAutonomyDeclaration` / `applyLaunchAutonomyDeclaration`)を読み、`none|semi` は birth 同時適用・`full` は儀式手順を印字して停止、という実際のラダーに合わせる

## テスト番号予約

`t492`(integration)/ `t493`(unit、必要な場合)。

## 検証コマンド(exit code を個別捕捉)

`bun run typecheck` / `bun run lint` / `complexity-gate --check` / `gen-coverage-registry --check` / `source-only:check` / 対象テスト(path 実在の機械確認+`Ran ... across M files` 照合)/ `bash tests/run-tests.sh --ci` / `bun run build` → `git status --short`。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-08T10:25:33Z
- **Iteration:** 1
- **Scope decision:** none

FR-5a〜5e の全主張(ハーネス入口8面・help/README/docs 対訳・stage-protocol の semi 手順・パリティテストの vacuity guard・落ちる実証・u2 実装との文言一致)をレビュアーが独立実測で裏取りし、無申告逸脱と認可境界の緩和は無し。MINOR 1件(semi 段落で parked が fail-closed 3値と同一括り)は是正済み。

### Findings

- NIT | packages/framework/core/amadeus-common/protocols/stage-protocol.md:137 — semi 段落が parked を human-required/conflict/aborted と同一括りにしており、:135 が明示分離している用語区別の伝播に失敗していた。parked を独立句(the hard stop on parked)へ分離して是正済み。
