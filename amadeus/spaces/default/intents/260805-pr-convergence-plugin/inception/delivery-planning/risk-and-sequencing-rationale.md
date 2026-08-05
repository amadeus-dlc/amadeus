# Risk and Sequencing Rationale

上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map

## 採用ヒューリスティック: walking-skeleton-first + risk-first のハイブリッド

- **Bolt 1(walking-skeleton-first)**: U1 seam-bridge は requirements A-2 が「critical path — FR-2a 不成立時は実装前停止して人間へ escalate」と固定した唯一の engine 拡張点。最大の技術リスク(実 frontmatter への seam 接続が成立するか)を最小スライスで最初に潰す。Cohn の walking skeleton 論の教科書的適用であり、org.md(greenfield 要素は skeleton 先行)・project.md(self-feature は最初の Bolt に walking-skeleton gate 維持)の既定とも一致
- **Bolt 2(risk-first)**: U2 の主リスクは外部 seam(GraphQL 語彙 — A-1)。Bolt 1 の人間ゲート待ちと独立に着手可能な構成(U1∥U2 非交差)だが、walking-skeleton 単独ゲートの既定に従い Bolt 1 承認後に開始する。topology 上の並行可能性は保存されており、ラダープロンプトで自律継続が選ばれた場合も Bolt 2 は単独 batch として走る
- **Bolt 3(dependency 制約)**: U3 は U1+U2 の統合点であり選択の余地なく最後

2.7 の topological order(U1∥U2 → U3)からの逸脱はない — walking-skeleton 引数は並行可能な U1/U2 の「どちらを先の batch に置くか」を決めただけで、依存順序は保存されている。

## Bolt 内順序のリスク制御(intra-bolt-order-as-risk-control)

- **Bolt 1**: FR-2a の成立確認(parse 受理拡張の spike 的最初のテスト)を Bolt 冒頭に置く — 不成立が判明した時点で残作業に着手せず escalate する(A-2)。TDD の最初の Red がこの確認を兼ねる
- **Bolt 3**: C8(センサー manifest)の core 着地を plugin stage frontmatter の `sensors:` 宣言より先のコミットに置く — compile の未知 id loud 拒否(ADR-5)により逆順は compile 赤になる

## リスク台帳(RAID 抜粋)

| リスク | 影響 | 緩和 |
|---|---|---|
| FR-2a 不成立(seam 接続が予想外に困難) | intent 全体の空文化 | Bolt 1 冒頭で確認・即 escalate(A-2)。walking-skeleton 単独ゲートで人間が確認 |
| GraphQL 語彙の実測乖離(A-1) | U2 の述語・台帳の手戻り | 実装前に実 PR で実測して fixture 化。fixture が契約テストの正本 |
| serializer のバイト保存欠陥 | 全ステージファイル破損(compose 時) | byte-identity 往復テスト+対象外フィールド不変テスト(ADR-1)。install は fixture workspace で先に E2E |
| GitHub 不達で収束不能 | batch 前進停止 | park 既定+記録付き override(FR-7、ADR-3)— 恒久停止しない |
| 並行 intent との共有台帳衝突(tNNN・docs 章番号) | CI 赤・改番作業 | tNNN は t444+ 予約(NFR-5)。PR 発行直前に origin/main 実測(shared-ledger 系既定) |
