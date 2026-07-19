# Reliability Design — election-store(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## クラッシュ耐性の機構設計(中核)

reliability-requirements.md の atomic write 要件を次で実現する:

- `writeStoreFile(path, data)` ヘルパー: 同一ディレクトリ内 tmp ファイルへ全量書込 → rename(business-logic-model.md C2 の既習様式。tech-stack-decisions.md 確定の自前数行実装)。全書込操作がこのヘルパーを経由する単一経路設計
- fail-closed load: parse 失敗は `StoreError("corrupt")` で reject(domain-entities.md:9 の申告付き追補型)。無言初期化・上書き復旧なし
- integration テスト設計: tmp 書込途中相当の fixture(部分 JSON)で load が corrupt を返すこと+書込完了前の元ファイル不変を assert(performance-requirements.md の検証設計と同一の実 FS 基盤)

## 監査列の対称設計

- appendTimeline は4イベント種とも操作実行結果からのみ(business-logic-model.md — 記帳⇔実行の対称性)。security-requirements.md の blind 境界・scalability-requirements.md の単一書込主体と合わせ、監査列の捏造・競合の両経路を構造で塞ぐ。observability は N/A(timeline.json 自体が可視性 — reliability-requirements.md)
