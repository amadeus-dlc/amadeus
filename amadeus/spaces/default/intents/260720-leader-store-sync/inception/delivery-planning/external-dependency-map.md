# External Dependency Map — 260720-leader-store-sync

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices — 外部面は requirements.md NFR-1 と components.md C4(gh/git port)、unit 内閉包は unit-of-work.md/unit-of-work-dependency.md、契機の後続は unit-of-work-story-map.md 対象外の FR-2 ノルム、経路は team-practices.md 参照の norm-changes-via-pr に依拠

## 依存一覧

| 依存 | 種別 | 状態 | 閉包条件 |
| --- | --- | --- | --- |
| gh CLI(keyring 認証) | 実行環境 | 実測済み(2.96.0、feasibility) | 不在時 loud exit 1(NFR-1) |
| origin/main への push 権限 | 実行環境 | leader 実行文脈で実在(#1280 実績) | tool は leader ローカル専用(ADR-1) |
| E-PM10A ノルム | 規範 | main 着地済み(実測) | 除外述語の実装根拠 |
| FR-2 ノルム persist | 後続(leader 執行) | tool 着地後の norm PR | bolt-plan 引き渡し事項 |
| 並行 intent 3本の実装面 | チーム内 | 静的非交差見込み | 着手前実 diff 確認(B-4) |

## 閉包運用

- PENDING 系(FR-2 norm PR・並行 intent 実 diff)は build-and-test の判定分離(PASS/PENDING/N/A)で追跡する。
