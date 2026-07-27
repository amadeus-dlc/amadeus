# Scalability Design — solo-election-surface (U2)

上流入力(consumes 全数): performance-requirements.md(U2-PERF)、security-requirements.md(U2-SEC)、scalability-requirements.md(U2-SCALE)、reliability-requirements.md(U2-REL)、tech-stack-decisions.md(prose+integration 層の決定)、business-logic-model.md(ソロ手順・降格・ノルム改定の設計正本)。

## 設計

- U2-SCALE-01(選挙非依存): 内挿文はテンプレ変数以外の固有値(選挙 id・日付・特定 slug)を含まない — テンプレ検査テストが固有値パターン(`260[0-9]{3}`、E-[A-Z]+ 等)の不在を assert。
- U2-SCALE-02(面数非依存): テストは canonical 1面のみ検査し、投影面の同期は既存 dist:check / promote:self:check に委ねる(面数ハードコードなし)。

## 検証配線

上記2 assert は U2-SEC-01 のテンプレ検査テストへ同居させる(1ファイル・同一 fixture — テスト分裂を避ける)。
