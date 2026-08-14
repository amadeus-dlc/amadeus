# Unit of Work Dependency — 260814-plugins-rename-drift

上流入力: `unit-of-work.md`(U1〜U3)、`application-design/component-dependency.md`(C 依存マトリクス — U 依存はその写像)、`decisions.md` ADR-3/ADR-4(settings と消費者の結合根拠)、`requirements.md` Constraints(同一 intent 要件)。`components.md` / `component-methods.md` / `services.md` の設計要素は unit-of-work.md の境界定義を経由して本 DAG へ写像済み。

## 依存 DAG(トポロジのみ — 順序決定は 2.8)

- U1 `rename-github-pr-convergence` — 依存なし(C1 は C2〜C5 と独立。component-dependency.md の依存マトリクスどおり)
- U2 `plugin-settings-core` — 依存なし
- U3 `git-drift-plugin` — **U2 に依存**(settings の実消費者。C5 → C2/C3/C4 依存の写像。先行着地禁止により同一 intent 内で U2 と揃う)

```yaml
units:
  - name: rename-github-pr-convergence
    kind: packaging
    depends_on: []
  - name: plugin-settings-core
    kind: library
    depends_on: []
  - name: git-drift-plugin
    kind: service
    depends_on: [plugin-settings-core]
```

## 統合点(Unit 間契約)

| 契約 | 提供 | 消費 | 形式 |
|---|---|---|---|
| settings 宣言形式(plugin.json `settings` キー) | U2(parseSettings) | U3(plugin.json で宣言) | JSON スキーマ(型・default・閉語彙 — component-methods.md C2) |
| 解決済み設定の受け渡し | U2(amadeus-sensor.ts fire の `--settings-json`) | U3(センサー CLI の argv) | 単一 JSON 引数(component-methods.md C4/C5) |
| `plugin.settings.<name>.<key>` config 名前空間 | U2(registry + parsePluginSettings) | U3(利用者が override を書く面) | amadeus/config.json 3 層 |
| `amadeus/config.json` の編集面 | U1(activation.names 要素 + scope-bindings 外側キー)/ U3(activation.names へ git-drift 追加) | — | **相互排他キー**だが同一ファイル — 並行実装時は直列化対象(共有ファイル競合) |

## 並行開発の機会

- **U1 ∥ U2**: 依存なし・所有ファイル非交差(例外: `amadeus/config.json` — U1 が触る。U2 は config.json を触らない(registry はコード側)ため実際は非交差)。並行可能。
- **U3 は U2 の後**: 契約 3 面を消費するため。U1 との間に依存はないが、`amadeus/config.json` の activation.names を両方が編集するため、同時マージは競合する(直列化推奨 — 判断は 2.8)。
- 有効なトポロジカル順序は複数存在する(U1→U2→U3 / U2→U1→U3 / U2→U3→U1 など)。選択は 2.8 の経済判断。
