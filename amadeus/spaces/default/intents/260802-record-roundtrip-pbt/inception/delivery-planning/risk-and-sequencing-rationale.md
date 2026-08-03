# Risk & Sequencing Rationale — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): unit-of-work-dependency.md(エッジと直列化 — 順序の一次根拠)、unit-of-work.md(統合裁定 U1+U2)、requirements.md(A-3/A-4 の前提リスク・C-3)、unit-of-work-story-map.md(価値順との整合)、components.md(U4 の allowlist 初期値 33/18・U5 の再 baseline コストの転記元)

## リスク先行の順序(scope-definition Q1=A の実施形)

1. **Bolt 1 = election-readpath を最初に置く理由**: 実害最大の穴(#1459 硬化の読み戻し素通り — 現行で露出中)を最初に閉じる。同時に、本 intent で唯一のコア改修を最初の Bolt に隔離することで、dist 7面再生成・coverage patch・t258 という投影リスクの全てを walking skeleton の1 PR で実証し、以降の Bolt をテスト・CI・文書のみの低リスク帯に保つ。
2. **リスク封じ込めの窓**: Bolt 1 の PR には fail-closed 化と PBT が同乗する(unit-of-work.md の統合裁定)ため、「fail-closed 化だけが着地して検証面が無い」中間状態はコミット単位でも発生しない。
3. **Bolt 5→6 の直列**: ci.yml と formal-verif-ci-baseline fixture の共有資源競合(textual conflict + baseline 二重計算)を、エッジによる直列化で構造的に回避(unit-of-work-dependency.md の是正済み裁定)。
4. **Bolt 4(Could)を後段の任意枠に置く理由**: 価値は開発面のみ(story map 段6)で、失敗しても他 Bolt に影響しない。余力判断は construction 時に行い、非実施でも intent 完了(FR-7a)。

## 主要リスクと緩和

| リスク | 影響 | 緩和 |
|---|---|---|
| allowlist 初期値(33/18)の変動 | Bolt 5 の台帳書き直し | Bolt 1 着地後に `--update` の実出力から採取(将来値を断定しない — E-RRP-ADS13 追補)。coverage-patch-allowlist の行ピン2件(amadeus-election-store.ts)は Bolt 1 の挿入位置次第で機械 remap+直読照合(cid:code-generation:c1-allowlist-mechanical-remap / cg-allowlist-straddle-swell) |
| fail-closed 化による既存 fixture の破損 | Bolt 1 の想定外赤 | AD 段の実読確認済み(t236/t262/t235 は硬化に耐える — decisions.md ADR-4 リスク実測)。想定外の赤は cid:code-generation:local-ci-red-assertion-verbatim で assertion 実文まで読んで帰属 |
| PBT の flake(seed 依存) | CI 不安定化 | PBT_SEED 固定で決定的(FR-4c)。深掘りは非ブロッキング枠(FR-5b) |
| ci.yml 編集の baseline 赤 | Bolt 5/6 の CI 赤 | 再 baseline 手順は先行3例で確立済み(services.md)。Bolt 5/6 直列で二重計算を回避 |
| 並行 Bolt の tNNN 採番衝突 | テスト番号重複 | Bolt 着手時に番号予約+再接地時に固定 base SHA で再確認(unit-of-work.md 共通制約) |

## 逸脱時の運用

builder が要件・設計からの逸脱の必要に気づいたら実装前に停止し conductor へ報告(deviation-stop-before-implement をディスパッチプロンプトに明記)。仕様変更に当たる場合はユーザーエスカレーション(正準リスト(4))。
