# Scope Document — 260722-space-record-catalog

上流入力(consumes 全数): intent-statement(Amendment 含む)、feasibility-assessment、constraint-register。

本書が intent 完了定義(Q2=C)の言う「整理成果物」の正本である。Space 配下の役割分類・関心事の分解・依存順序をここに固定する。

## Space 配下の役割分類(#1309 設計方針の採択+縮小)

| 分類 | 対象 | 本 intent での扱い |
|---|---|---|
| 永続知識 | `memory/`、`knowledge/`、`codekb/` | 対象外(変更しない) |
| ライフサイクルレコード | `intents/`、`elections/` | **本丸** — 構造モデルを intents/ 側へ統一 |
| 実行設定・カーソル | `settings.json`、`active-intent` 等 | 対象外(変更しない) |
| 人間向け投影 | (新設しない) | **非目標化**(2026-07-23 縮小裁定 — 日付接頭辞 dirName のファイルツリー自然ソートで代替) |

## In Scope(MoSCoW)

すべて設計成果物(本 intent は ideation で park。実装はユーザー承認後の別判断):

- **Must — S1: elections レジストリ+dirName 規約**: intents/ の参照モデル(レジストリ+日付接頭辞 dirName+安定 ID)を elections/ に適用する規約設計。createdAt は UTC 正本・表示も UTC(裁定済み)
- **Must — S2: electionId→パス解決**: ディレクトリ名から ID 直組みしている参照をレジストリ経由の解決に置き換える最小限の設計(モジュール化・汎用 Catalog にしない)
- **Must — S3: 既存103件の移行方針**: createdAt 導出 = timeline 最古イベント(kind 不問)、空 timeline 2件のフォールバック規則、E-code 参照(パス直書き)の全域棚卸し手順。再実行可能・監査/選挙検証の非破壊
- **Must — S4: drift 検出**: レジストリ vs 実ディレクトリの乖離検出を doctor に追加する要件定義(実測 7 件の乖離が一次証拠)
- **Should — S5: intents.json への createdAt 明示**: UUIDv7 から導出可能(実測66/66)だが、行に明示するかは設計判断に委ねる

## Out of Scope(Won't — 非目標)

- SpaceRecordCatalog モジュール、renderActivity、人間向け Markdown 投影、正式な共通レコード契約 interface(2026-07-23 縮小裁定 — 投機的一般化として除外。将来必要になれば intent-backlog から別 intent 化)
- 既存 intent 側ディレクトリの rename、全フォルダの日時命名統一(#1309 非目標を継承)
- 本 intent 内での実装・既存ディレクトリの実 rename(設計・移行方針の承認前に実行しない — constraint O4)

## ディレクトリ構造イメージ(現状 → 統一後)

> dirName の具体形(日付接頭辞の粒度・E-code の位置)は実装 intent の設計(ADR)で確定する。以下は境界イメージであり確定仕様ではない。

現状(実測 — 2026-07-22、ref 0940bdf84):

```
amadeus/spaces/default/
├── intents/
│   ├── intents.json                  ← レジストリあり(uuid / slug / dirName / scope / status)
│   ├── 260706-amadeus-grilling/      ← 日付接頭辞 dirName → ファイルツリーが時系列に自然ソート
│   ├── ...
│   └── 260722-space-record-catalog/
└── elections/                        ← レジストリなし
    ├── E-AWATCH/                     ← electionId 直名 → 開催順が追えない(発端の痛み)
    │   ├── election.json             ← 日時フィールドなし(実測)
    │   ├── timeline.json / ballots/ / views/ / ...
    └── E-GSFND13/
```

統一後のイメージ(S1〜S3 適用後):

```
amadeus/spaces/default/
├── intents/                          ← 変更なし(参照モデル)
└── elections/
    ├── elections.json                ← 新設レジストリ(electionId / dirName / createdAt(UTC) / status)
    ├── 260720-e-awatch/              ← 日付接頭辞 dirName(イメージ。E-code は dirName 内に保持)
    └── 260720-e-gsfnd13/
```

不変条件: E-code(electionId)は安定 ID のまま。参照はレジストリ経由で electionId → dirName に解決し(S2)、パス直組みを廃止する。レジストリ vs 実ディレクトリの乖離は doctor が検出する(S4)。

## 依存順序(dependency-first)

S1(規約)→ S2(解決層)→ S3(移行)→ S4(drift 検出)。S5 は S1 に付随。順序付け選好の裁定は不要(直列依存一択)。

## 受け入れ基準(縮小後)

1. elections/ の構造モデル(レジストリ様式・dirName 規約・ID 解決)が intents/ と整合する設計として文書化されている
2. 既存103件の移行が決定論的・再実行可能で、既存 ID・監査・選挙検証・E-code 参照を壊さないことが方針レベルで示されている
3. レジストリ vs 実ディレクトリの drift を検出できる要件が定義されている
4. 日時の正本・表示はともに UTC(裁定済み)
5. 用語は「ライフサイクルレコード」規律(単独「レコード」禁止)に従う
