# Personas — 260706-installer-versioning（Issue #543）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[business-overview.md](../../../../codekb/amadeus/business-overview.md)

| ペルソナ | 説明 | 本 Intent での関心 |
|---|---|---|
| P-1: 導入者（workspace 管理者） | Amadeus を自分の workspace へ導入・更新する利用者。CI や手元で非対話 1 コマンドを実行する。ファイルを手でカスタマイズしていることがある | 更新で自分の変更が無言で消えないこと。退避場所がすぐ分かること。どの版が入っているか確認できること |
| P-2: 保守者（Maintainer / 開発チーム） | 配布物を保守し、導入先からの報告を受ける側。team-practices.md の実践（TDD、eval、draft PR）で品質を担保する | 導入先の版が判別できること（サポート時の再現条件）。更新戦略が README で説明され、eval で退行が防がれていること |
