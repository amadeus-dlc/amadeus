# Component Methods — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜6)、`../user-stories/stories.md`(US-1.1〜3.1)、codekb の architecture.md / component-inventory.md(RE 全数再検証済み台帳)、`../practices-discovery/team-practices.md`(既存実践)、components.md。

## 変更メソッド・シグネチャ(全て既存契約の値域拡張のみ)

- `HarnessName.parse(raw)`(harness.ts): 受理集合が6値へ — シグネチャ・Result 型・エラー形(InvalidHarnessName)不変
- `engineDirNameFor(harness)`(engine-layout.ts): 写像2エントリ追加 — fail-fast throw(:15-20)の既存安全網不変
- `allEngineDirNames()`: 返り値 4→5 要素(.opencode/.cursor 追加、.kiro は共有のまま)
- `renderHelp()` / invalid 文言: 文字列定数の列挙部のみ(mockups.md の置換後文字列と exact 一致させる)
- advisory 2面(C6): 配列 literal への2値追加のみ — 呼び出し契約・返り値型不変

## 新規メソッド

なし(FR-1 AC-1e — 追加ロジック禁止)。
