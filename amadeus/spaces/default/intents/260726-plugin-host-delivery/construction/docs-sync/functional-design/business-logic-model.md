# Business Logic Model — U8 docs-sync

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> unit-of-work.md U8 行(components.md C8 の責務行「docs/guide/19-plugins{,.ja}.md を実装後の install / doctor / drop 手順へ更新」が本フローの契約)。story-map ジャーニー 2「手順を確認する」の実体。services.md どおり常駐なし — 文書更新+既存 docs ゲートの単発実行。

## フロー: 実装からの転記による更新

```
1. 対象語彙(plugin / compose / doctor / drop / marketplace / --single)の repo 全域 grep で
   更新対象 docs を全数棚卸し(DocsTarget の追加要否確定 — docs/ 起点でなく語彙起点)
2. 各節を実装成果(U1-U6 の着地物)から転記:
   コマンドは実際に実行し、出力を確認したものだけを記載
3. 日英ペアを同一変更で更新(内容差ゼロ)
4. 既存 docs 参照整合ゲート(t174 系 legacy-refs / 言語切替リンク検査)を実行し green を確認
```

## 順序制約(bolt-plan Bolt 8)

U7(適合テスト)着地後に実施 — テストで固定された挙動だけを手順化する(実装と一致しない手順書の先行公開 = 偽装文書化の防止。requirements FR-9 / story-map リリース順 6)。

## 検証

- 記載コマンドの実行可能性: 記載どおりに実行して期待出力を得る(手動確認+可能な範囲で docs 内コマンドの smoke)
- 参照整合: 既存 docs ゲートの green(requirements FR-9 合否)
- component-methods.md C1-C6 の契約表と docs 記載の一致(乖離があれば docs でなく実装側の逸脱として扱い、修正は裁定へ)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:28:35Z
- **Iteration:** 1
- **Scope decision:** none

FR-9 被覆・転記のみ・語彙起点・逸脱扱い・正準 literal は整合。Major 1: components が 3 成果物とも装飾トークン。Minor 1: DocsSection 転記元表に claude 面(U2 着地)の欠落 — U3/U4 は残面 Unit のため claude 手順の転記元が特定不能。

### Findings

- [Major] components の装飾トークン化(3 成果物本文で実参照 0 件)
- [Minor] DocsSection 転記元に U2(claude 面)の欠落

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:30:43Z
- **Iteration:** 2
- **Scope decision:** none

両 iteration 1 指摘は閉包。components.md C8 責務行の逐語引用+BR-U8-0 新設、DocsSection へ U2(claude 面)追加。ADR-4 literal・FR-9 trace 維持。

### Findings

- None
