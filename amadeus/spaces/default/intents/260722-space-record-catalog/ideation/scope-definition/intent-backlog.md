# Intent Backlog — 260722-space-record-catalog

上流入力(consumes 全数): intent-statement(Amendment 含む)、feasibility-assessment、constraint-register。

優先度は MoSCoW。proto-Unit は将来の実装 intent の units-generation への入力候補であり、本 intent(設計整理、ideation で park)では着手しない。

## Proto-Units(縮小後スコープ内 — 将来の実装 intent 向け)

| ID | proto-Unit | MoSCoW | 依存 | 根拠 |
|---|---|---|---|---|
| PU-1 | elections レジストリ+日付接頭辞 dirName 規約(UTC 正本) | Must | — | scope-document S1 |
| PU-2 | electionId→パス解決のレジストリ経由化 | Must | PU-1 | scope-document S2、rename の前提 |
| PU-3 | 既存103選挙の移行(createdAt 導出+空 timeline フォールバック+参照棚卸し) | Must | PU-1, PU-2 | scope-document S3、RAID R2/R4 |
| PU-4 | doctor への drift 検出(レジストリ vs 実ディレクトリ) | Must | PU-1 | scope-document S4、RAID I1(乖離7件実測) |
| PU-5 | intents.json への createdAt 明示 | Should | — | scope-document S5(UUIDv7 導出可のため任意) |

## 非目標化した将来候補(#1309 から除外 — 再浮上時は別 intent として起票)

| 候補 | 落とした理由 | 再浮上の条件 |
|---|---|---|
| 人間向け Markdown 投影 / renderActivity | 日付接頭辞 dirName の自然ソートで発端の痛みが解消(2026-07-23 縮小裁定) | 構造統一後もなお時系列閲覧の不満が実測されたとき |
| SpaceRecordCatalog(横断解決モジュール) | 解決層は elections の1箇所で足り、汎用化は投機的 | 第3のライフサイクルレコード種別が実在したとき |
| 共通レコード契約 interface | 規約(ADR)の文書統一で十分 | Catalog 再浮上と同時 |

## 価値ストリーム(要約)

現状: 人間が elections/ の開催順を追えない+レジストリ乖離が検出されない → 構造統一後: ファイルツリーが時系列に自然ソートされ、doctor が乖離を loud に検出 → 閲覧・運用の摩擦が消える。
