# Constraint Register — 260720-hold-choice-resolution

上流入力(consumes 全数): intent-statement.md

## 制約一覧

| # | 制約 | 種別 | 根拠 |
| --- | --- | --- | --- |
| C-1 | 修正面は scripts/amadeus-election*.ts 系+テスト。GoaLineCode(:26-49)・renderGoaLine・handleOpen(:241)・norm-metrics・t238 に触れない(e4 バッチ面) | 並行合意 | e4 相互確認 02:50:58Z(関数単位完全非交差、スコープ変動時は即時相互通知) |
| C-2 | E-TCRCG=A(hold 裁定の二値表現維持)を変更しない — 本 intent は**追加語彙**であり既存二値の置換でない。既存二値経路の扱い(共存/縮退)は design 裁定 | 既決裁定 | E-TCRCG record、t236:309-310 の既存ピン |
| C-3 | ユーザー可視契約変更該当性を RA で明示判定 — 該当なら正準リスト(4)エスカレーション | プロセス | ディスパッチ要件(3) |
| C-4 | 設計判断は選挙(単独決定禁止)。逸脱は実装前停止 | プロセス | ディスパッチ要件(5) |
| C-5 | human-ruling-persist-through 準拠: 受領→永続化→record.md 反映まで1機能として実装・閉包テスト固定 | 既決 cid | team.md |
| C-6 | 検証 green 維持+PR 前 deslop・lcov 実測 | 品質 | Testing Posture |

## 制約の消費先

C-1 は全 construction 工程の worktree/ファイル規律へ、C-2/C-3 は RA の契約判定へ、C-5 は FD の受け入れ基準へ引き継ぐ。
