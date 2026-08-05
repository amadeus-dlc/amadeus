# Intent Backlog: PR 収束 opt-in プラグイン

上流入力(consumes 全数): intent-statement

## プロト Unit(MoSCoW 優先度付き)

intent-statement の Initial Scope Signal(3要素の役割分担+要拡張1点)から導出。粒度は Units Generation で確定する。

| # | プロト Unit | MoSCoW | 依存 | 根拠 |
|---|---|---|---|---|
| P1 | compose overlay 拡張 — 既存ステージ produces への overlay 追記能力(walking-skeleton 対象) | Must | なし(engine 側の唯一の要拡張点) | ガードのデータ点火が成立しないと全体が空文化(Issue 却下案 (c) の教訓) |
| P2 | 収束述語の単一定義+thread 台帳生成器(GraphQL 機械導出) | Must | なし(P1 と独立に実装可) | 受け入れ目安 2・3 |
| P3 | 収束 CLI+収束ループ工程のステージ本文断片(工程(0)-(5)+トリアージ基準) | Must | P2(述語・台帳を消費) | プラグイン出荷形の中核 |
| P4 | センサー manifest(advisory 可視化)+plugin manifest 同梱・frontmatter 宣言 | Must | P3(可視化対象の様式) | 3要素構成の一部。compile の未知 id loud 拒否と結線 |
| P5 | 対実証 — install 済み batch 前進拒否(落ちる実証)/ 未 install produces 不変 / `replied-unresolved` fixture 赤 | Must | P1-P4 | 受け入れ目安 1・2 の実証面 |

Should / Could は置かない — Issue の受け入れ目安3項目がすべて Must 面を指名しており、公開契約を完結させる最小集合が上記5点(intent-statement の非対象宣言により、それ以外は Won't として厳格に除外)。

## 依存グラフ(テキスト)

- P1(engine 拡張)→ P5(対実証の install 面)
- P2(述語+台帳)→ P3(工程)→ P4(センサー)→ P5(実証)
- P1 と P2 は並行可能。P1 を walking-skeleton Bolt として単独・ゲート付きで先行する(self-feature スコープの org.md 既定)

## シーケンシング

risk-first + dependency-first(scope-document の方針を継承): P1 → (P2 ∥ 残作業) → P3 → P4 → P5。ハードデッドラインなし。
