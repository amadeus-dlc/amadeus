# External Dependency Map — metrics-timeseries-report

上流入力(consumes 全数): `../requirements-analysis/requirements.md`、`../application-design/components.md`、`../units-generation/unit-of-work.md`・`unit-of-work-dependency.md`・`unit-of-work-story-map.md`、`../practices-discovery/team-practices.md`

## 外部依存

| 依存 | 種別 | 状態 |
|---|---|---|
| metrics/*.json(データ供給) | リポジトリ内生成物 | 供給側 CI job 稼働中(RE 実測)— 本 Bolt からは読取のみ |
| npm 外部パッケージ | なし(AC-5b) | — |
| 外部サービス・API | なし | — |

## 結論

真の外部依存ゼロ。ブロッカーになりうるのは PR マージのユーザー承認(正準リスト(2))のみで、これは正常系の承認待ち(merge-approval-latency)として扱う。
