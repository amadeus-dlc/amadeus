# Reliability Requirements — election-store(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## クラッシュ耐性(requirements-analysis:c4 チェックリストの要件化 — 本ユニットの中核 NFR)

- **全書込は atomic write(tmp+rename の既習様式)**(business-logic-model.md 操作フロー C2 — FD 既決)。書込途中クラッシュで元ファイルが半端な状態にならないことを、テストで検証可能な形に固定する: tmp ファイルへの書込完了前に元ファイルが不変であること+rename 後に全内容が新版であることを integration 層で assert(NFR-2)
- fail-closed load: election.json/ledger.json の parse 失敗は `StoreError` の専用 kind `"corrupt"` で reject し(io-error = fs 操作失敗と区別 — domain-entities.md へ申告付き追補済み)、壊れたストアへの追記を拒否する(construction ガードレール — 統合境界のエラーハンドリング必須。無言の初期化・上書き復旧をしない)
- 別 OS 面(c4): POSIX 側の rename 原子性は既存 writeFileAtomic(amadeus-lib.ts:4240-4249 の tmp+rename 実装)で既習。**Windows 側は Bun/Node の実装依存で本 repo 内に検証済み先例がなく未検証** — 実装時に CI(Linux)+必要なら別 OS 実測で確認する(bun-readfilesync-dir-platform-divergence と同じ Bun 実装差クラスとして注入設計時に考慮)

## 耐久性と監査

- 永続の最終防衛線は git(ADR-2 Consequences — checkpoint コミット対象)。バックアップ機構は N/A(反証可能な根拠: version 管理された amadeus/ ツリー自体が履歴を保持)
- appendTimeline は4イベント種とも操作の実行結果からのみ呼ばれ(business-logic-model.md — 記帳と実行の対称性)、監査列の捏造経路を持たない
- 可用性 SLO は N/A(常駐サービスなし)。observability 要求も N/A(反証可能な根拠: U2 は CLI 単発実行内の I/O 層 — 実行可視性は timeline.json の記帳列が担う)
