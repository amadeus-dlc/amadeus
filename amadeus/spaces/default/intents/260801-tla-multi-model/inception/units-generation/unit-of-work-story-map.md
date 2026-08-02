# Unit of Work Story Map — 260801-tla-multi-model

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements + 同ステージ unit-of-work.md

user-stories ステージは本 intent のスコープ grid で SKIP(stories 未生成)のため、ストーリー代替として requirements.md の FR-1〜FR-6 を実装 Unit へ写像する。FR が本 intent の最小受入単位であり、各 FR の AC は unit-of-work.md 各 Unit 節に帰属済み。

## FR → Unit 写像

| FR | 内容 | 実装 Unit |
| --- | --- | --- |
| FR-1 | model-map スキーマへ補助モジュール配列追加(#1921) | u1-schema-resolver |
| FR-2 | EXTENDS/INSTANCE 推移解決と宣言不一致の二重赤化 | u1(リゾルバ基盤)→ u2(loader 側)→ u4(sensor 側) |
| FR-3 | MirrorLifecycle への Core 宣言・pin(#1921) | u4-mirror-declaration-drift |
| FR-4 | TLC 実行系の複数モデル対応(#1920) | u2(実行選択)→ u3(語彙/byte-pin)→ u5(CI ポート面) |
| FR-5 | CI で MirrorLifecycle AsIntended 完全探索 | u5-ci-all-models-measure |
| FR-6 | 不変性の保証(FormalElection 結果・receipt identity) | 全 Unit 横断(pin 据置き。主たる実証は u2/u3) |

## 複数 Unit に跨る FR(cross-cutting)

- **FR-2**: リゾルバ実装(u1)と二つの検出点(u2 loader / u4 sensor)に分割。実装は u1 の C2 単一モジュールに集約し、u2/u4 は検出点の配線のみ(ADR-2 — 実装複製ではなく検出点の二重化)。
- **FR-4**: 実行選択の意味改訂(u2)→ 語彙供給(u3)→ CI 駆動面(u5)の縦割り。語彙源は model-map.json(ADR-6)。
- **FR-6**: 単独 Unit を持たない横断不変条件。各 Unit の AC に「FormalElection identity/語彙値/receipt 不変の pin」として織込み済み。変わったら落ちる検査として据置く側のテストは改訂しない(unit-of-work.md テスト割当節の「維持」群)。

## Unit 内実装順(各 Unit 内の作業順 — Bolt 順ではない)

- u1: スキーマ拡張(exactObject 両形)→ リゾルバ新規 → 負例 red 実証。
- u2: verifyRegisteredAssets 全モデル化 → aux 照合 → 宣言照合 red → 無引数ピン改訂。
- u3: FormalElection vocabulary 移管(map 先行)→ arm/toolchain 供給切替 → byte-pin 選択一般化 → 語彙値 pin。
- u4: sensor/updateModelMap 検出点 → MirrorLifecycle 宣言追記 → impl-only 書戻し → Core 編集 red 実証。
- u5: ポート/診断/スケルトン引数化 → run/verify 全モデル反復 → ci.yml/doc 追随 → 両モデル注入 red → AsIntended 実測。

## カバレッジ検証

- 全 FR(FR-1〜FR-6)が少なくとも1 Unit へ割当済み。全 Unit が少なくとも1 FR を担う(空 Unit なし)。
- NFR-1〜NFR-4 は全 Unit 横断の共通契約(unit-of-work.md 末尾節)として適用。
- 必須 red 実証4点(schema mismatch red / declaration-mismatch red / Core semantic edit red / both-models injection red)の帰属: u1 / u2+u4 / u4 / u5 — 全て割当済み。
