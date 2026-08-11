# External Dependency Map — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(NFR-4 依存追加ゼロ)、components.md(依存が既存インフラのみであることの棚卸し元)、unit-of-work.md(新規機構 = ゲート本体のみ)、unit-of-work-dependency.md(外部 Unit 依存なし)、unit-of-work-story-map.md(体験が外部サービスに依存しないこと)

## 外部依存一覧

| 依存 | 種別 | 状態 | リスク |
|---|---|---|---|
| git(`ls-files -z`) | 実行環境 | CI(ubuntu ランナー)・ローカルとも既存前提 | 不在時は列挙段 loud fail(component-dependency.md) |
| Bun ランタイム | 実行環境 | 既存 CI の setup-bun step 様式を再利用 | なし(新規バージョン要求なし) |
| GitHub Actions | CI 基盤 | 既存 ci.yml に独立ジョブ追加のみ | ブランチ保護の required checks への追加はマージ時の運用確認事項(ジョブ赤 = PR 赤の既存運用に乗る) |
| npm パッケージ | ランタイム依存 | **追加ゼロ**(NFR-4 — Bun 標準 API のみ) | なし |

## 非依存の明示

外部 SaaS・ネットワーク・DB・シークレットへの依存なし(NFR-1 決定性の基盤)。
