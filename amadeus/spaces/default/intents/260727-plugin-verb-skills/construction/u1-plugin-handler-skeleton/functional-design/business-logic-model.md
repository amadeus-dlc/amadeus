# Business Logic Model — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): unit-of-work.md(U1 境界)、unit-of-work-story-map.md(運用確認ジャーニー)、requirements.md(FR-2)、components.md(C2)、component-methods.md(C2 メソッド案)、services.md(入口契約・exit code 体系)

## 処理フロー(委譲の一本道)

```
/amadeus plugin <verb> [args...]
  → amadeus-utility.ts runUtilityMain switch(:5945)
    → case "plugin": handlePluginDelegate(rest, deps)
      → deps.spawn(["bun", join(TOOLS_DIR, "amadeus-plugin.ts"), ...rest])   ← 委譲コマンドの形は handleMigrate:5900-5929 に倣う
      → stdout/stderr をそのまま透過
      → 戻り exit code を返す(呼出し元が process.exit)
```

- **handleMigrate との意図的相違(申告)**: handleMigrate は spawn を直書きし seam を持たない(migrateToolArgs:5889 非 export、テストも integration 層のみ)。U1 は component-methods.md C2 の確約「unit(in-process、spawn は seam 注入)」に従い、**spawn を `PluginDelegateDeps.spawn` として注入可能にする** — 既習の同型 seam は `PluginCliDeps.recompile`(amadeus-plugin.ts:169/:276、spawnSync 直書きの代わりに注入)。倣うのは委譲コマンドの形・透過・exit 伝播の意味論であり、seam 有無は上流確約側を優先する(citation-semantics-check の明文照合)
- rest は**無加工透過**(FR-2c)。verb の妥当性判定・usage-error 生成は plugin CLI 側の既存責務(parsePluginCliArgs)に置いたまま — utility 側に verb 語彙を複製しない(canonical 1定義)
- 引数なし(`/amadeus plugin`)も透過し、plugin CLI の「no verb given」usage-error(exit 2)がそのまま返る

## 入出力契約

| 入力 | 出力 | exit |
|---|---|---|
| `plugin status` | plugin CLI の status 出力 verbatim | 透過(0) |
| `plugin doctor` | 同 doctor 出力 | 透過(0 / degraded 1) |
| `plugin compose/drop <name>` | 同出力 | 透過(0/1/2) |
| `plugin`(verb なし)/ 未知 verb | plugin CLI の usage-error(stderr) | 透過(2) |
| 将来 verb(install 等) | 透過(utility 側変更不要) | 透過 |

## エラーハンドリング

- spawn 自体の失敗(bun 不在等)は handleMigrate 同型の扱い(spawnSync 結果の exitCode 非 0 → そのまま伝播)。サイレント失敗経路なし
- utility 側で新しいエラー種別・メッセージを発明しない(委譲の透明性が契約)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T22:25:49Z
- **Iteration:** 2
- **Scope decision:** none

it.1 Major(C2 の spawn seam 確約の無音降格)を閉包 — PluginDelegateDeps{spawn} seam を3成果物で一貫設計し、handleMigrate との意図的相違を verbatim 引用付きで申告。PluginCliDeps.recompile(:169/:276)引用・handleMigrate 無 seam の両実測一致。残存指摘なし。

### Findings

- None
