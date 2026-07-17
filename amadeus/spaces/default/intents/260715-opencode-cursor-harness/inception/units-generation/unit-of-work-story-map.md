# Unit of Work Story Map — opencode / Cursor harness 対応

> 上流入力: unit-of-work.md、intent-statement(Target Customer)、scope-document(In 7項)、application-design の components.md / component-methods.md / services.md(機能単位表)/ component-dependency.md / decisions.md、requirements.md。user-stories ステージはスコープ SKIP のため、story map は intent-statement の受益者2類+保守チームの3視点で構成する(e2 の units-generation 先例と同型 — ストーリー成果物なしでも受け入れ条件×Unit のトレースは全数成立)。2026-07-16。

## 視点1: opencode 利用開発チーム

| 価値 | 実現 Unit | 受け入れ条件トレース |
| --- | --- | --- |
| dist/opencode/ を配置して --version / --doctor が動く | U1 | AC-1a/1d/2a、AC-6b(手動配置検証) |
| `$amadeus` 相当から workflow を開始できる | U2 | AC-2b |
| 権限モデル差(既定全許可)を理解して安全に導入できる | U2+U4 | AC-7a(R-4 緩和) |

## 視点2: Cursor 利用開発チーム

| 価値 | 実現 Unit | 受け入れ条件トレース |
| --- | --- | --- |
| dist/cursor/ を配置して --version / --doctor / workflow start が動く | U3 | AC-3a/3b、AC-6b |
| hooks で session/prompt/tool ライフサイクルが(実測確定の範囲で)機能する | U3 | AC-3c/3d(語彙実測が確定条件 — ⚠ の解消 or 降格) |
| 「何が動き何が動かないか」を導入前に把握できる | U4 | AC-3c 留保 ii(機能単位表)、AC-7a/7b |

## 視点3: Amadeus 保守チーム

| 価値 | 実現 Unit | 受け入れ条件トレース |
| --- | --- | --- |
| 新ハーネスが manifest 1組で増える open-set の実証 | U1 | AC-1a(core 編集ゼロ)、AC-4d(neutrality grep — U1〜U4 の各 PR で反復、横断制約) |
| 既存4ハーネスの無回帰 | U1〜U4 | AC-4a/4b(CI 基準 exit 0) |
| 新 dist が drift ガードの宇宙に入る | U1+U4 | AC-5a/5b |
| installer 対応の後続 Issue が正確な台帳付きで起票される | U4 | AC-6a(留保 i/ii) |

## トレース全数確認

FR-1(U1/U2)、FR-2(U1/U2)、FR-3(U3)、FR-4(全 Unit 横断+U1 の AC-4d 検証開始)、FR-5(U1 自動編入+U4 smoke)、FR-6(U4 起票+AC-6b は U1〜U3 の実測記録)、FR-7(U4)— **7 FR すべてがいずれかの Unit に割当済み、orphan なし**。
