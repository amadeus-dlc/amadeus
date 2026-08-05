# U2 model-attribution — Logical Components

**上流入力(consumes 全数)**: `business-logic-model`(モジュール構成の増分・面ごとの入力差 — 本書の目録の導出元)。条件解決で除外された consumes(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は nfr-requirements SKIP による設計上の不在(directive の `consumes_absent` expected: true)。

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 論理コンポーネント目録(U1 からの増分)

| コンポーネント | 実体 | 障害ドメイン | blast radius |
|---|---|---|---|
| model 解決(C-3) | `amadeus-subagent-observability.ts` += `resolveEffectiveModel`(純関数)/ `resolvePersonaPin`(node:fs) | プロセス内・hook 発火単位 | 当該発火の `Model`/`Model Source` 属性のみ(unresolved なら属性なし) |
| started 面配線(C-5 残り) | `core/tools/amadeus-lib.ts` の `subagentStartFields` 差し込み | hook プロセス | SUBAGENT_STARTED 行1件(Claude Code では #2303/#2297 未修正のため休眠 — CON-2、live 発火は kimi 経路) |
| completed 面配線 | `core/hooks/amadeus-log-subagent.ts` の U1 差し込み点に追加 | hook プロセス | SUBAGENT_COMPLETED 行1件 |
| registry 宣言(C-6 残り) | `event-registry.ts` optional 追加(実装時に U1 着地を実測して差分確定 — 内訳: U2 固有は Model/Model Source の対×両イベント。STARTED の `Type Verdict` は U1 が completed 側のみ追加済みなら U2 が拾う3件目、U1 が両面追加済みなら不要) | compile 時 | ゼロ(optional は非破壊) |
| 型宣言 | `ClaudeCodeHookInput` += `model?: string`(FR-3c) | compile 時 | ゼロ(index signature 済みで非破壊) |

## 分離戦略と共有資源

- **依存方向**: U1 と同一 — 新設(observability)が下位、`amadeus-lib.ts` / hook が上位(lib → observability の一方向 import)
- **関心の分離**: pin 読取は C-1(許可集合解決)を拡張せず独立ヘルパ — U1 の照合と U2 の model 解決は同一モジュール内でも関数境界で分離(変更理由の分離)。1発火あたり FS 走査最大2回はこの分離の意図的コスト(BR 申告済み)
- **休眠面の隔離**(CON-2): started 面の配線は Claude Code では発火しないが、コードとしては kimi 経路(role-start)で live — 「発火しない面」をテストは payload 形状で駆動し、live 検証の責務は U3 の集計と #2303/#2297 修正後の実測へ委譲(検証面の書き分け — `verdict-names-unverified-facets`)

## 障害ドメインの遮断点

1. **pin 読取の失敗** → `PersonaPinResolution.warnings` へ縮退(契約層)— 解決は `pin: undefined` で続行
2. **解決層の予期せぬ throw** → 外周 catch(防御層)で吸収 — `Model`/`Model Source` スキップ、emit 継続。**catch は配線点数と1:1**(blast radius 表の2配線点 = started 面 `subagentStartFields` / completed 面 `amadeus-log-subagent.ts` に各1つ — 片面のみの catch は不成立)
3. **emit 層**は不変 — U1 と同一の一方向遮断。保証範囲は「各配線点の catch スコープ内で throw された例外」に限る(catch ハンドラ自身の失敗・emit 後の失敗・プロセス級異常は対象外 — 層別の保証機構を混同しない)

## インフラ設計への橋渡し

U1 と同一 — インフラ資源なし、新配布面なし(既存 `bun run build` 投影)。Infrastructure Design 段への引き継ぎ事項なし。
