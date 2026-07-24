# User Flow (System Interaction) — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md

## N/A(UI ユーザーフロー)

視覚的なユーザーフローは N/A とする。代わりにシステム相互作用フローを示す(cid:requirements-analysis:ui-less-mockups-as-output-contract)。

## Interaction Flow: ステージ実行時のハーネス記録

```
[ステージ実行開始]
       |
       v
[ハーネス検出ロジック起動] --- 環境変数実測 (例: CLAUDECODE, CODEX_THREAD_ID) --->
       |
       +-- 検出成功 --> [amadeus-state.md / memory.md へ harness id を記録] --> [ステージ続行]
       |
       +-- 検出不能 --> [unknown/manual フィールド値を記録] --> [ステージ続行(非致命)]
```

## Interaction Flow: 手動記入フォールバック(Cursor/OpenCode/Kiro 等)

```
[自動検出が unknown を返す]
       |
       v
[conductor が手動でハーネス種別を記入する経路を提供(design 段階で確定)]
       |
       v
[amadeus-state.md / memory.md へ記録]
```

## Information Architecture(記録先の階層)

- `amadeus-state.md`
  - Project Information(既存)
    - + Harness(新規フィールド、intent 全体の代表ハーネス、または最新ステージのハーネス)
- 各ステージ `memory.md`
  - フロントマター相当(新規、そのステージを実行したハーネス)
