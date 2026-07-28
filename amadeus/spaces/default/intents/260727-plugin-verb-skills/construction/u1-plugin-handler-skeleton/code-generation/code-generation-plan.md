# Code Generation Plan — U1 u1-plugin-handler-skeleton(Bolt 1 / walking skeleton)

上流入力(consumes 全数): business-logic-model.md(委譲一本道と PluginDelegateDeps)、business-rules.md(BR-U1-1〜5)、domain-entities.md(seam の型)、performance-design.md(追加機構ゼロ)、security-design.md(argument array 固定)、unit-of-work.md(U1 境界)、requirements.md(FR-2)

## 実装計画(builder ディスパッチ内容の記録)

1. `packages/framework/core/tools/amadeus-utility.ts`: `PluginDelegateDeps`/`defaultPluginDelegateDeps`/`handlePluginDelegate(rest, deps)`(business-logic-model.md のフロー、domain-entities.md の型)+ `case "plugin":` 1文(business-rules.md BR-U1-3 の薄い dispatch、security-design.md の配列リテラル構成)
2. usage 三重同期(business-rules.md BR-U1-2): default die・HELP_TEXT_TAIL・実在 pin テストを同一コミットで
3. テスト(business-rules.md BR-U1-4): unit = fake spawn(配列・透過・exit 3系)/ integration = 実 spawn 縦断1本(performance-design.md の追加機構ゼロと整合)
4. dist×7+self-install 再生成、検証コマンド全実行(unit-of-work.md の完了条件、requirements.md FR-2d)

## 隔離と規律

worktree `bolt-u1-plugin-handler`(base origin/main 4f8607f05)。builder は state 変更禁止・逸脱は実装前停止・同期完遂(ディスパッチプロンプトに明記済み)。base 前進(#1593 着地)による行番号ずれは builder 側で grep 再解決を指示。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T23:35:33Z
- **Iteration:** 1
- **Scope decision:** none

実装は FD/BR と1:1一致(薄い dispatch・注入 seam・rawArgs verbatim 透過)、dist/self-install 12面バイト同一、検証コマンドを reviewer が独立再実行し全 exit 0。申告2適応は妥当、シム/slop なし。Minor 1件(code-summary の t226 pin 記述過大)は受領後に精密化済み。

### Findings

- [Minor] code-summary の t226 前方一致を pin と記述 → 非 pin(固定 prefix)へ精密化済み
