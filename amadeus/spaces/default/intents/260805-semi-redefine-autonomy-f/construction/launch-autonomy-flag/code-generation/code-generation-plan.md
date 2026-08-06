# Code Generation Plan — `launch-autonomy-flag`(#2253、swarm batch 1 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

swarm 経路のため本 plan は finalize 後の事後作成(`cid:code-generation:swarm-unit-artifact-backfill`)であり、実績 = builder report(worktree agent-a17a5f5d231bc34b6、最終 HEAD `bbce197c3e5e79d2b0a035efb3854ffd44655d5a`)からの転記である。

## 実装ステップ(実績)

1. **t449 失敗テスト先行(TDD Red)** — parse 面(FR-CLI-1: 3 値とも `flags.intent` 非混入+値なし検出)。Red 実測: `Export named 'parseNextFlags' not found` / exit 1 → C12 実装で Green(7 pass)。
2. **t450 失敗テスト先行(TDD Red)** — apply 面(判定 0〜8 網羅+H9 = `READ_ONLY_FLAGS` 非追加の in-process assert)。Red: `Export named 'applyLaunchAutonomyDeclaration' not found` → C13 実装で Green(16 pass)。
3. **C13 実装** — `readLaunchAutonomyContext`(projection 1 read、unreadable → 拒否側 — ADR-12)+ `applyLaunchAutonomyDeclaration`(判定 0〜8、error は既存 `errorDirective` 様式)。適用は `applyProductionAutonomyMode` への委譲のみ(直接書込 API 0 hit を機械確認)。呼び出しは Branch 4 直後・birth 前の新 Branch。`directive.intent_autonomy_mode` 非搬送(C-3)。
4. **裁定適用(E-SRA-CG1 の機械的執行 = A)** — §C12 逐語の ladder 内 2 分岐が `parseNextFlags` CCN 29→32 で shrink-only ratchet と両立不能 → ladder 前の named pre-pass `takeAutonomyFlag`(while ループ・last-wins 意味論保存・CCN 5)へ構造変更。t449 へ複数回出現 last-wins の assert 3 ケース追加。
5. **落ちる実証 4 点** — consume 除去 / grant 判定無条件化 / declared 無条件化 / fail-closed 反転 → 各赤を実測、復元後残渣ゼロ(復元 ref 固定 SHA)。
