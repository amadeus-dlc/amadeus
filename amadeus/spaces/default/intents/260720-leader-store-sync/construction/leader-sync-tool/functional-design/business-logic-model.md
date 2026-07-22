# Business Logic Model — leader-sync-tool(U1)

上流入力(consumes 全数): requirements, components, component-methods, services, unit-of-work, unit-of-work-story-map — フローは component-methods.md M1〜M8 と components.md C6 dispatch、verb 契約は services.md と unit-of-work-story-map.md のジャーニー3段、AC は requirements.md、U1 閉包は unit-of-work.md に依拠

## 制御フロー(verb 別・相互排他)

- `status`: resolveOwnedSet(M1)→ syncStatus(M7)→ 構造化出力(exit 0。clone-id 不在は err(M1)→ exit 1 loud)。
- `plan`: M1 → 抽出予定一覧+checkExclusions(M3)のドライラン判定 → 出力(書込なし・git 状態非変更。違反があれば一覧表示+exit 1 — 実行前可視化)。
- `create`: M1 → ブランチ生成(main 起点)→ 対象 copy/commit → restoreMemoryLayer(M4)→ M3 再判定(**restore 後に violation 残存なら abort+ブランチ破棄 = fail-closed**)→ selfCheck(M5)→ composePr(M6、レポート機械転記)→ PR URL 出力。
- 順序不変条件: M4(memory 復元)は M3 最終判定の**前**、M5 は commit 済みツリーに対して実行(検査対象 = 実際に PR に載る面 — injection-surface-verify の設計適用)。

## エラー経路

全 verb: gh/git 実行失敗 = `git-failed`/`gh-failed` で exit 1(無音続行なし — NFR-3)。引数不正 = usage exit 2(M8 dispatch)。判定不能を成功扱いする分岐は存在しない(検証劇場 Forbidden)。
