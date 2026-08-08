# Business Rules — u3-question-route-observability

上流入力(consumes 全数): requirements.md(FR-3 の規則化)、components.md(C4 境界)、component-methods.md(拡張契約)、unit-of-work.md(境界)、unit-of-work-story-map.md(物語の保証条件)、services.md(属性後方互換契約)。

## 規則

- **BR-U3-1(経路は導出属性)**: `Resolution Route` は入力ではなく `Decision Id` の有無から導出する(`ladder` iff decision-id 実在、else `human`)。新しい必須入力・入力拒否経路を作らない — 既存呼び出し元(stage-protocol.md:18,:351,:484 / practices-discovery.md:95,121)は無変更で動作する(Review iteration 1 BLOCKER 是正)
- **BR-U3-2(導出の同時性)**: `Route = ladder ⇔ Decision Id 実在` は導出規則として構造的に常成立(入力検査でなく導出の定義)。decision-id を渡した場合のみ形式検査(`auto-decision-` 形)を行い、不正形は loud error
- **BR-U3-3(観測のみ)**: 回答の受理可否・checkpoint guard の挙動は不変。対照テストで変更前後の guard 分岐同一性を固定
- **BR-U3-4(後方互換)**: 属性追加のみ。既存 shard の読取(集計・replay)は新属性欠落行を「経路不明(pre-u3)」として扱い、エラーにしない
- **BR-U3-5(集計述語の固定)**: 迂回述語(human × semi/full)を integration テストで固定し、実測済み違反 fixture の検出+Route 書換の対照(検出 0 件)の両側を実証
- **BR-U3-6(sensor 不採用の記録)**: リアルタイム sensor 化は不採用 — 理由(Stop hook 複雑化に利得が見合わない・集計述語で受け入れ基準充足)を本 FD に記録(AD の明示委譲への回答 — domain-entities.md 検出ビュー節)

## 受け入れ基準への写像

| BR | FR | 検証形 |
|---|---|---|
| BR-U3-1/2 | FR-3a | unit(入力検証は純関数化)+integration(CLI 経由) |
| BR-U3-3/4 | FR-3a/3c | 対照テスト(前後 guard 同一)+旧形 shard fixture |
| BR-U3-5 | FR-3b | integration(fixture 検出+対照 0 件) |
