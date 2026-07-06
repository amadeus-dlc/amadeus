# External Dependency Map — 260706-journal-logger

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work.md](../units-generation/unit-of-work.md)（u001-journal-logger、規模 M、依存なし = [unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)）、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[team-practices.md](../practices-discovery/team-practices.md)。

## 外部依存

| 依存 | 種別 | 状態 | 手当て |
|---|---|---|---|
| GitHub Issue #556（移行元） | 読み取り | 本文 + コメント 3 件を実測済み | FR-4 で機械的変換。クローズは人間 |
| agmsg（spawn / join 機構） | 参照 | 実在確認済み | 手順書で引数を実測記載（実行はしない） |
| 人間 / leader（初回起動・検証・merge・クローズ） | 承認 / 操作 | 既存経路 | 4 イベント報告と手順書 + チェックリスト |

他 Intent への依存はない。本 Intent の成果物への依存者は journal-logger 運用（初回起動）と将来の steering 反映 Intent（昇格スタンプの棚卸し）。
