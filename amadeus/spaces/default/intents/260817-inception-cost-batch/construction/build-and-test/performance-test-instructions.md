# Performance Test Instructions — 260817-inception-cost-batch

## 適用可能な NFR が存在しないという判定

本 intent の requirements(NFR-1〜4)に性能の数値目標は宣言されていない。合否を決める数値目標が要件にないテスト種別は体裁のために実体を作らない(project.md `cid:build-and-test:c2-no-test-theatre-for-absent-nfr` — 目標なきベンチマークは検証劇場)。よって性能テストは**生成しない**。

- **根拠**: `requirements.md` § 非機能要件の全数実読 — 性能・レイテンシ・スループットの数値目標 0 件。issue-evidence fetch は conductor 1回実行の CLI(常駐なし・ホットパスなし)、除外規定は契約 prose+テスト述語で実行時性能面を持たない
- **効果測定との区別**: FR-MEAS-1 の「RE+RA active 中央値 35 分未満」は本 intent 導入後のワークフロー時間の観測目標であり、コードの実行性能 NFR ではない。測定は後続 intent の audit 実測で行う(専用の負荷試験を構成しない — `cid:build-and-test:bt-timeout-verification-shape` の趣旨)

## 将来この判定を覆す条件

- fetch がインセプションのクリティカルパスで実測上の遅延源になった場合(例: 大規模コメント Issue で分単位)— その時点で観測レンジを実測してから閾値を置く(`c1-threshold-inside-observed-range`)
- 除外述語が RE スキャン以外のホットパス(hook 等)へ再利用された場合
