# U1 detection-skeleton — Domain Entities

**上流入力(consumes 全数)**: `unit-of-work`(U1 の範囲 = C-1/C-2/C-4 + completed 配線)/ `unit-of-work-story-map`(検出ジャーニーの価値)/ `requirements`(FR-1/FR-2 の語彙)/ `components`(C の責務境界)/ `component-methods`(シグネチャ正本 — 本書は型の意味論を精密化)/ `services`(fail-open 契約)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`。スタイル: functional-domain-modeling-ts(判別 union・parse-don't-validate・class-free)。

## エンティティ(型)一覧

### TypeVerdict(判別 union — 照合結果)

```ts
export type TypeVerdict = "persona" | "builtin" | "unknown-type" | "outside-allowed-set";
```

- `persona`: `.claude/agents/*.md` の frontmatter `name:` に完全一致
- `builtin`: `BUILTIN_AGENT_TYPES` 台帳に完全一致
- `unknown-type`: 値が逐語 `"unknown"`(`normalizeAgentType` の fallback 産物 = 型未指定)
- `outside-allowed-set`: 上記いずれでもない(ad-hoc 名 — 検出の本丸)
- **警告対象**は `unknown-type | outside-allowed-set` の2値(FR-2b)。この分類は values の全域関数で、どの入力にも必ず1値が定まる(無効状態の表現不能)

### AllowedSetResolution(許可集合の解決結果)

```ts
export interface AllowedSetResolution {
  readonly allowed: ReadonlySet<string>;   // persona ∪ builtin(完全一致照合用)
  readonly personaCount: number;           // 集計出力の測定 ref 用
  readonly warnings: readonly string[];    // dir 読取失敗等 — 呼び手が stderr へ流す(fail-open)
}
```

- component-methods.md のシグネチャ正本(3フィールド)と**逐語一致** — フィールドの追加なし。verdict の `persona` / `builtin` の区別(story-map の「persona 経由か否かの即時シグナル」)は、フィールド追加でなく**判定順**で実現する: `BUILTIN_AGENT_TYPES` は同モジュールの sibling export(C-4)なので builtin を先に台帳照合し、`allowed` に残る一致を persona とみなす(BR-U1-1 参照。§12a iteration 1 の BLOCKER 是正 — canonical シグネチャを保存する代替設計へ変更)
- 読取失敗時: `allowed = BUILTIN_AGENT_TYPES のみ`、`personaCount = 0`、`warnings` に理由 — **throw しない**(NFR-3)

### BUILTIN_AGENT_TYPES(台帳 — count-free)

component-methods.md の逐語7エントリを正本とする(`default` / `coder` / `explore` / `worker` / `general-purpose` / `Explore` / `Plan`)。`unknown` の不収載は意図的(requirements AC-3 訂正注記)。

## 不変条件

1. `classifyAgentType` は純関数 — 同一入力に同一 verdict(audit の決定性)
2. `"unknown"` の verdict は台帳・persona の内容に依存せず常に `unknown-type`(台帳に `unknown` を誤収載しても先勝ちで警告対象 — 判定順で保証)
3. ケーシングは完全一致 — `Explore` と `explore` は別値として独立に判定(ADR-2)
4. 空文字は本層に到達しない(`normalizeAgentType` が先に `"unknown"` へ正規化済み — 前段の既存契約)
5. persona が組込型と同名(例: `Explore` という name の persona)の場合、判定順により `builtin` が勝つ — 許可集合の内側での分類差であり警告発火には影響しない(どちらでも非警告)

## 既存エンティティとの関係

- `normalizeAgentType`(`amadeus-lib.ts:4082-4084`)— **不変**。本 Unit の型はその出力(非空 string)を受ける後段
- audit イベント属性 `Type Verdict` — TypeVerdict の4値がそのまま属性値になる(registry optional、C-6 の U1 半面)
