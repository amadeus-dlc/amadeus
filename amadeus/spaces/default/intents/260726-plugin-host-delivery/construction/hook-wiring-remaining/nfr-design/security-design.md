# セキュリティ設計 — U4 hook-wiring-remaining

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## SEC-U4-1 への設計: フックにロジックを置かない(1 点配線の形状固定)

`security-requirements.md` SEC-U4-1(BR-U4-1)の設計は、各面の配線 diff を **HookInvocation 1 点の宣言追加**に形状固定することで担保する:

- 配線内容は「`bun <harnessDir>/tools/amadeus-plugin.ts compose --if-stale` を argument-array で起動する」宣言のみ(component-methods.md C4 の共通形)。trust 判定・path 解決・合成ロジックは既存 engine(`scripts/plugin-composition.ts` の公開面)へ全委譲し、フック配布物に複製しない
- 面別の挿入点(`business-logic-model.md` フロー 1: codex/cursor/kimi/kiro/kiro-ide = `harness/<name>/hooks/` アダプタ、opencode = `plugin/amadeus-opencode-plugin.ts`)はいずれも**既存フック機構の既存拡張点**であり、新規のフックランタイム・シェル評価を導入しない。kimi の `~/.kimi-code/config.toml` は marker-fenced managed block(既存機構)内の 1 エントリ追加に限る
- 検証設計: (a) 各面の diff 検分 — HookInvocation 1 点のみで合成・判定コードを含まない (b) CLI 経由と フック経由の compose 結果一致テスト(engine 直呼びとの byte 比較 — 独自合成不在の実証)

## SEC-U4-2 への設計: 失敗時継続の stderr 設計

`security-requirements.md` SEC-U4-2(fail-safe)の stderr 契約を面共通形で設計する:

```
失敗時: stderr へ 1 行警告「amadeus: plugin compose failed (session continues): <reason 1 行>」→ exit 0(セッション継続)
```

- **1 行固定**: 生 stack を出さず reason 要約のみ(呼出し点は面ごとに 1 箇所のため run 単位ラッチは不要 — guard-announcement-callsite-count の呼び出し点数確認を設計時に実施済み: HookInvocation は面あたり 1 点)
- **exit 0 の意味論**: フックアダプタへ失敗を伝播させない(ハーネス側がフック失敗でセッションを止める実装でも継続する)。失敗の可観測性は stderr 警告+次回 doctor の drift 検出(U5)が担い、無音化しない(`reliability-requirements.md` REL-U4-2 と同一契約)
- 検証設計: compose 失敗 fixture で「セッション起動成功 + 警告 1 行出力」の両立を assert

## SEC-U4-3 への設計: 認可・監査面の維持

`security-requirements.md` SEC-U4-3 のとおり、U4 は認可判定・監査発行の新経路を作らない(SEC-U4-1 の全委譲の帰結)。検証は既存認可テスト群(directive contract / state transition / audit invariant / race / team-mode regression / harness drift)の green 維持。`business-logic-model.md` フロー 2 の DropsRecord advisory 記録は compose 経路(既存の書き手)が行い、フック側は書かない — 監査の書き手を増やさない。

## 非該当カテゴリ

N/A — `security-requirements.md` 非該当カテゴリ(credential / ネットワーク入力)の N/A を参照継承。`performance-requirements.md` の no-op 高速路・`scalability-requirements.md` の面数加算は本設計の 1 点配線形状を前提とし、フック側ロジック追加を将来も禁じる境界として機能する。
