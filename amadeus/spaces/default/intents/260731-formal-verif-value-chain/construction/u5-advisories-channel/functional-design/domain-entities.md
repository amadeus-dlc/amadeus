# Domain Entities — u5-advisories-channel

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## E1: Advisory(新規・唯一の新ドメイン型)

```
Advisory = {
  plugin: string                       // 発火元プラグイン名
  code: "changed" | "never-run"        // activation 判定の発火2値(current は生成されない)
  message: string                      // 既存 stderr 文面と同一
  stage: string                        // 発火点ステージ slug
}
```

所在: `amadeus-plugin-activation.ts`(生成側が型を所有)。directive 合成側(amadeus-orchestrate.ts)は型を import して消費する — 二重定義しない(canonical 1定義)。

## E2: 発火点集合(定数)

`ACTIVATION_ADVISORY_STAGES: ReadonlySet<string>` — {"requirements-analysis", "functional-design", "build-and-test"}(Q3=A 裁定)。所有: amadeus-orchestrate.ts(現 :1293 の置換)。消費は2経路: emitForSlug(主経路)と emitSingleRunStage(--single 経路 — services.md の stage-runner 面)。

## E3: ラッチレコード

キー (plugin, code) → 実体は machine-local runtime 配下のマーカーファイル(1 ラッチ = 1 ファイル、中身は emit 時刻の ISO 文字列のみ)。gitignored。degrade スコープ(requirements-analysis / functional-design が SKIP)では該当発火点に到達しないだけで、build-and-test 前の最終安全網が機能する(decisions.md 設計注記の fail-safe)。

## E4: 消費契約(下流)

- conductor(stage-protocol 規範): directive.advisories が非空なら各 Advisory をユーザーへ提示する。
- stderr 消費者(人間・ログ): 従来どおり1行文面を受け取る(後方互換)。
- 既存 directive parser: 未知フィールド無視の前提を棚卸しで実証してから追加する(BR-U5-1)。
