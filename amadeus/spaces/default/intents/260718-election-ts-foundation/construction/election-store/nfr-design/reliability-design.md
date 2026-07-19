# Reliability Design — election-store(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## クラッシュ耐性の機構設計(中核)

reliability-requirements.md の atomic write 要件を次で実現する:

- `writeStoreFile(path, data)` ヘルパー: 同一ディレクトリ内 tmp ファイルへ全量書込 → rename(business-logic-model.md C2 の既習様式。tech-stack-decisions.md 確定の自前数行実装)。全書込操作がこのヘルパーを経由する単一経路設計
- fail-closed load: parse 失敗は `StoreError("corrupt")` で reject(domain-entities.md:9 の申告付き追補型)。無言初期化・上書き復旧なし
- integration テスト設計は reliability-requirements.md:7 の **2 assert 対を両側**実装する: (a) tmp 書込完了前に元ファイル不変(byte 一致 assert) (b) **rename 後にファイル全内容が新版であること**(書込データとの byte 一致 assert — no-op rename の偽 green を排除。reviewer Critical 是正: 旧起草は (a) のみで片側欠落)。加えて tmp 途中相当の部分 JSON fixture で load が corrupt を返すことを assert(performance-requirements.md の検証設計と同一の実 FS 基盤)
- **別 OS 面の carry**(reliability-requirements.md:9 の明示 defer 項目 — reviewer Major 是正): Windows の rename 原子性は未検証のまま実装へ持ち越す。注入設計は POSIX(ローカル/CI Linux)で実測し、Windows 面は「CI が Linux のみ」という現行制約を tech-stack-decisions.md の既存スタック前提として明記の上、Bun 実装差クラス(bun-readfilesync-dir-platform-divergence 同系)の注入(dangling symlink 等)を integration fixture の設計語彙に含める

## 監査列の対称設計

- appendTimeline は4イベント種とも操作実行結果からのみ(business-logic-model.md — 記帳⇔実行の対称性)。security-requirements.md の blind 境界・scalability-requirements.md の単一書込主体と合わせ、監査列の捏造・競合の両経路を構造で塞ぐ。observability は N/A(timeline.json 自体が可視性 — reliability-requirements.md)
