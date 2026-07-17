# Bolt Plan — opencode-plugins-hooks(Issue #1049)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜5)、`../application-design/components.md`(C1〜C5)、`../units-generation/unit-of-work.md`(U1)、`../units-generation/unit-of-work-dependency.md`(エッジなし DAG)、`../units-generation/unit-of-work-story-map.md`(FR→U1 全数)、`../practices-discovery/team-practices.md`(live 温存)。stories(user-stories)・mockups(rough/refined-mockups)は非実行(amadeus スコープ)につき requirements のトレース表を正とする。2026-07-17。

## Bolt シーケンス(全1 Bolt)

### Bolt 1: opencode-plugin-adapter(= U1、1:1)

- **含まれる Unit**: U1(opencode-plugin-adapter)のみ — C1〜C5 の全変更面(工程0 写像表+plugin 2ファイル+テスト2ファイル+manifest+docs 機能表+dist regen)
- **walking skeleton**: 非該当 — 既存 dist/opencode 配布経路への embedded なインクリメンタル追加(org.md の skeleton セレモニーは greenfield スコープ対象)。単一 Bolt につきラダープロンプト(Construction Autonomy Mode)も対象外
- **Definition of Done**:
  - 写像対応表(工程0)が3値(配線/⚠/未対応)で全行充足(AC-1a/1b)
  - 検証列全 green + exit code 記録: typecheck / lint / dist:check / promote:self:check / --ci / patch gate(AC-3d)、push 前ローカル lcov で diff 追加行未カバー 0
  - 落ちる実証は実行時消費行へ注入(AC-3b、E-PM7 M3)
  - deslop 実施+全検証再実行
  - PR 発行(`Fixes #1049`)・実装者以外レビュアーの READY・マージはユーザー承認後に leader 執行
- **confidence hypothesis**: 「opencode plugins フック → core hooks 11本(無改変)への配線が、実測写像表に基づき advisory 契約(非ブロッキング・phantom HUMAN_TURN なし)で機能する」。配線 0 件に終わった場合も「根拠付き未対応の確定+機能表更新」で Issue スコープ(1)(3)(4)を充足(AC-5b)— 仮説は反証可能な形で両側をカバーする
- **expected demo**: dist/opencode 配布ツリーに `.opencode/plugins/` が regen され、写像表・機能単位表が実測根拠付きで更新されていること(dist:check / promote:self:check green で drift ゼロを機械実証)

## 実行順序(Bolt 内)

component-dependency.md の直列: C3(工程0 実測・写像表凍結)→ C2(写像 lib)→ C1(entrypoint)→ C4(テスト)→ C5(manifest+docs+regen)。工程0 の実測結果が C2 以降の実装範囲を決めるため、この順序は変更不可。
