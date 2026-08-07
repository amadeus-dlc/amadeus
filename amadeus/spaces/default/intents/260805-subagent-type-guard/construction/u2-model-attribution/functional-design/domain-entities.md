# U2 model-attribution — Domain Entities

**上流入力(consumes 全数)**: `unit-of-work`(U2 の範囲 = C-3 + C-6 残り + C-5 model/started 配線)/ `unit-of-work-story-map`(実効 model ジャーニー)/ `requirements`(FR-3・AC-4/AC-5 の語彙)/ `components`(C-3 の責務)/ `component-methods`(ModelResolution シグネチャ正本)/ `services`(fail-open 契約)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`。スタイル: functional-domain-modeling-ts。

## エンティティ(型)一覧

### ModelSource(判別ラベル — 解決元)

```ts
export type ModelSource = "harness" | "request" | "pin";
```

- `harness`: payload の `model`(ハーネス供給の観測値 — Codex fixture 実測)
- `request`: `tool_input.model`(明示指定の要求値 — Claude Code live 実測で明示時のみ)
- `pin`: 解決済み persona の frontmatter `model:`(宣言値)

### ModelResolution(判別 union — parse-don't-validate)

```ts
export type ModelResolution =
  | { readonly kind: "resolved"; readonly model: string; readonly source: ModelSource }
  | { readonly kind: "unresolved" };
```

- `resolved` は非空 model と source を必ず対で運ぶ(source なしの model は表現不能)
- `unresolved` は「属性を書かない」ことの型表現(ADR-5 — "unknown" の捏造をしない)

### ModelResolutionInput

```ts
export interface ModelResolutionInput {
  readonly harnessModel: string | undefined;   // payload.model
  readonly requestedModel: string | undefined; // tool_input.model(completed 面では常に undefined)
  readonly personaPin: string | undefined;     // verdict が "persona" のときのみ供給
}
```

空白のみの文字列は undefined と同義に扱う(`normalizeAgentType` と同じ trim 規約)。

### PersonaPinResolution(pin 読取の結果 — §12a iteration 1 BLOCKER の是正で追加)

```ts
export interface PersonaPinResolution {
  readonly pin: string | undefined;      // frontmatter model: の値(無ければ undefined)
  readonly warnings: readonly string[];  // 読取失敗・parse 不能の理由 — 呼び手が stderr へ流す(fail-open)
}
```

- **引き当て規則(§12a iteration 2 BLOCKER の是正)**: `agentsDir` を走査し、**frontmatter `name:` が `agentType` に完全一致する定義ファイル**の `model:` を採る — ファイル basename からの決め打ち(`${agentsDir}/${agentType}.md`)は**しない**。persona 集合の導出原理は FR-1a(requirements)が定める「frontmatter `name:` からの機械導出」であり、pin の引き当ても同一原理に揃える(basename と `name:` の一致は保証されていないため、決め打ちは live で pin 恒久 undefined の偽 green を作る)。`name:` 重複時は走査順の先勝ち + warnings 1件
- `resolvePersonaPin(agentType, agentsDir): PersonaPinResolution` は **throw しない** — dir 読取失敗・frontmatter parse 不能は `pin: undefined` + warnings 1件で返す(NFR-3「警告付き fail-open」/ services の「無音で握りつぶさない」への準拠。C-1 の `warnings` チャネルと同型)。`name:` 一致ファイルが無い場合も `pin: undefined` + warnings 1件(persona verdict 済みの型が引き当て不能 = 環境差の兆候)
- 「frontmatter に model 無し」は正当な状態 — `pin: undefined` + warnings 空(欠陥扱いしない)
- 本ヘルパは FD 新設(AD の component-methods には未収載の C-3 補助)— シグネチャの正本は本書とする。AD 内の2表現(components の `personaPins` 写像 / component-methods の `ModelResolutionInput.personaPin` 単数)のうち **component-methods(シグネチャ正本)の単数形を採る** — 写像の事前構築でなく verdict が `persona` のときだけ1名分を引き当てる(不要な全件読みを避ける)

## 不変条件

1. `resolveEffectiveModel` は純関数 — 3入力が同じなら同じ解決(audit の決定性)
2. 優先順は **harness > request > pin**(ADR-3)。source 併記により順序変更後も過去行の解釈が保存される(情報非損失)
3. 3入力すべて undefined/空白 → `unresolved`。部分的に空でも先勝ちで最初の非空を採る
4. `personaPin` の供給条件は U1 の `TypeVerdict === "persona"` — persona 以外の spawn にピンを誤帰属しない(集合の意味論を model 解決へ持ち込む唯一の結合点)

## 既存エンティティとの関係

- `ClaudeCodeHookInput`(`amadeus-lib.ts:4687-4707`)へ `model?: string` を型宣言(FR-3c — `[key: string]: unknown` により非破壊)
- audit 属性 `Model` / `Model Source` — resolved のときのみ両方を書く(片方だけの中間状態は作らない — ADR-5 代替案 (b) の却下理由)
- registry: `SUBAGENT_STARTED`(`:612-623`)/ `SUBAGENT_COMPLETED`(`:624-632`)の optional へ `"Model"` / `"Model Source"` を追加、STARTED 側には `"Type Verdict"` も追加する想定(C-6 の残り半面)。**U1 の着地状態は実装着手時に `event-registry.ts` を実測して差分を確定する**(BR-U2-4 の留保と同一 — 断定しない)
