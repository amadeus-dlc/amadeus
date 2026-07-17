# Risk and Sequencing Rationale — opencode-plugins-hooks(Issue #1049)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜5・AC-3c)、`../application-design/components.md`(C1〜C5)、`../units-generation/unit-of-work.md`(U1・分割しない判断)、`../units-generation/unit-of-work-dependency.md`(エッジなし DAG)、`../units-generation/unit-of-work-story-map.md`(orphan なし)、`../practices-discovery/team-practices.md`(偽グリーン排除ほか)。stories(user-stories)・mockups(rough/refined-mockups)は非実行(amadeus スコープ)。2026-07-17。

## シーケンシングの結論

**Bolt 間の順序判断は存在しない**(全1 Bolt)。units-generation の依存 DAG はエッジなし単一ノードで、トポロジカル順からの逸脱もない。WSJF(Reinertsen / SAFe)は比較対象となる複数ジョブが存在しないため不採用。walking-skeleton-first も非該当(既存 dist/opencode 配布経路への embedded なインクリメンタル追加で、証明すべき新規アーキテクチャ層がない)。

## Bolt 内順序の根拠(risk-first)

Bolt 1 内は component-dependency.md の直列(C3→C2→C1→C4→C5)に従う。これは risk-first の適用である:

1. **最大リスク = 写像可否の不確実性**(opencode フック語彙 → core hook stdin JSON の写像が成立するか)。工程0(C3: 写像対応表の実測凍結)を最先頭に置くことで、実装着手前に配線範囲が確定し、「実測前に凍結できない仕様」を跨ぐ手戻りを排除する
2. **第2リスク = phantom HUMAN_TURN**(AC-3c: chat.message 写像で machine 注入マーカーが判別不能なら mint 配線を見送り)。これも工程0 の実測で判定され、fail-open を構造的に禁止する
3. 配線 0 件という結果もリスクではなく正常系(AC-5b: 根拠付き表更新のみで Issue スコープ充足)— 仮説の両側が受け入れ可能

## 逸脱申告

トポロジカル順からの逸脱: なし(単一ノード)。stage prose の WSJF/skeleton 質問は N/A 回答として delivery-planning-questions.md に記録済み(E-OC1 選挙不要判定・leader 承認 2026-07-16T23:31:34Z)。
