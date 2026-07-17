# External Dependency Map — opencode-plugins-hooks(Issue #1049)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(AC-1a/1c)、`../application-design/components.md`(C2/C3)、`../units-generation/unit-of-work.md`(U1)、`../units-generation/unit-of-work-dependency.md`(エッジなし)、`../units-generation/unit-of-work-story-map.md`(FR-1→U1)、`../practices-discovery/team-practices.md`(external-seam-vocab-measurement / saas-undocumented-source-read)。stories(user-stories)・mockups(rough/refined-mockups)は非実行(amadeus スコープ)。2026-07-17。

## ゲート型外部依存(owner / lead time / blocks / mitigation)

**なし** — 外部チームのハンドオフ・承認リードタイム・データ提供窓・外部 API 到達性のいずれも本 intent の Bolt をブロックしない。完全に AI-contained + リポジトリ内で完結する。

## 非ゲート型の外部参照(記録のみ — Bolt 1 内の実装時条件)

| 参照 | 種別 | 扱い |
|---|---|---|
| `@opencode-ai/plugin` 一次ソース(packages/plugin/src/index.ts) | 外部パッケージの型定義・フック語彙 | ゲートではない。conductor 提供の外部実測(scan-notes:156-165)を高確度候補とし、**実装時の in-tree 再実測が確定条件**(AC-1c 既決)。再実測で不一致なら該当行を ⚠→未対応へ降格するだけで、Bolt は停止しない(AC-5b) |
| opencode 公式 docs(`.opencode/plugins/` レイアウト) | 配布レイアウト根拠 | docs 単数/複数の齟齬は実装時に dist レイアウトで再実測(AC-4b 既決)。ブロックなし |

いずれも「実測で確定する条件」として requirements に固定済みであり、外部者の行動を待つ項目ではない — external-dependency-map として管理すべき残余はゼロ。
