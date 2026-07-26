# 技術スタック決定 — U4 hook-wiring-remaining

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 決定: 既存フックスタックのみ・runtime dependency 追加ゼロ

`technology-stack.md` の本 intent 差分リフレッシュは「新規外部パッケージもゼロ」「TypeScript / ESM / Bun 直接実行の構成は不変」と実測しており、U4 の配線はこの実測所見どおり新規外部依存を導入しない。`requirements.md` NFR-3(Bun-only、runtime dependency 追加禁止)を継承する。各面のフック起動先は `technology-stack.md` が面別に実測した既存機構を使う。

- ランタイム: Bun(TypeScript ESM)。フックアダプタから bun スクリプトを起動(`requirements.md` A-1「全 7 ハーネスのフックアダプタから bun スクリプトを起動できる」)
- フック起動面(既存機構、`technology-stack.md` / `business-logic-model.md` フロー 1 の実測):
  - Claude Code: core hooks の起動環境
  - Codex: project 内 exact `.codex/hooks.json`(technology-stack.md 履歴「Codex は project 内の exact `.codex/hooks.json` を発見する」)
  - Kimi Code: `~/.kimi-code/config.toml` の marker-fenced managed block(TOML)
  - cursor / kiro / kiro-ide: `harness/<name>/hooks/` アダプタ
  - opencode: `plugin/amadeus-opencode-plugin.ts`
- 配線内容: HookInvocation 追加 1 点のみ(`business-rules.md` BR-U4-1)。合成ロジックは既存 `scripts/plugin-composition.ts` へ委譲し、フック側に複製しない

## 決定: core/harness 境界の維持

`requirements.md` NFR-4 と project.md Mandated のとおり、harness 専用のフック配線物は `harness/<name>/` へ置き、`packages/framework/core/tools/` へ harness 固有ロジックを漏出させない(全6ハーネス manifest の coreDirs が tools を投影するため — project.md harness-tools-placement)。

- 合否: 新規 runtime dependency ゼロ(`package.json` / `bun.lock` の diff が空 — `technology-stack.md` 実測手順の再現)
- 合否: フック配線の正本変更は同一変更で全ハーネス dist / self-install を再生成(`business-rules.md` BR-U4-7)、drift ガード green

## 代替案と却下理由

- 却下: フック側に軽量な合成/判定ロジックを持たせる — `business-rules.md` BR-U4-1(呼び出し 1 点)違反。CLI 経由と engine 直呼びの結果乖離を生み、独自合成が検証困難になる
- 却下: 共通フックランタイムの新設(汎用 tracker / スケジューラ等)— project.md Forbidden「NEVER add a backward-compatibility shim, generic tracker transport, scheduler, daemon, or unrelated large-module refactor」。既存フック機構への 1 点配線で足りる
