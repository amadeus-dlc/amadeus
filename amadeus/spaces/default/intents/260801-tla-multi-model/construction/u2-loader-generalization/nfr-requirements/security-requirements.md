# Security Requirements — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): business-logic-model(§1.1 検査経路, §4 不変性), business-rules(BR-V2, BR-V7, BR-S3, BR-S5), requirements(NFR-2 / NFR-3 / NFR-4)

本 Unit は新規ネットワーク面・UI・認証認可・PII 取扱いを持たない。適用可能なセキュリティ要求は「既存のパス境界検査を緩めない」「fail-closed を維持する」「production seam の注入不可性を維持する」の3系統に限定される。

## 適用要求

| # | 要求 | 測定可能な基準 | 由来 |
|---|---|---|---|
| SR-U2-1 | aux 資産は model と**同一の検査経路**(verifyAssetPath → readAsset → sourceIdentity)を通す。specs/tla 境界外パス拒否・symlink 拒否・非空検査・UTF-8 fatal decode の現行規則(現行 :129-163 / :185-212)を aux に対しても一切緩めない | 既存の境界系 red ケース(統合 :150-240, :271-325)が期待値不変で green。aux に別経路・緩い経路を新設しない | BR-V2, BR-V7, NFR-1 |
| SR-U2-2 | 全失敗を明示失敗とする fail-closed(NFR-2): identity 不一致(SOURCE_DRIFT)、宣言漏れ・過剰宣言(SOURCE_DRIFT)、未登録モデル選択(MODEL_MAP_INVALID)、(条件付き)空 models(MODEL_MAP_INVALID)。silent fallback・先頭要素への黙示既定・検証ゼロ件の成功を禁止する | t403 の各赤ケースが規定のエラー種で落ちる(BR-P1〜P4)。緑で返す逃げ道が error union に存在しない | BR-V4, BR-D2, BR-S3, BR-S6, NFR-2 |
| SR-U2-3 | 無引数 wrapper の production seam 性質は不変: root / fs を実行時入力から選べない(引数なし・注入なし、`import.meta.url` 固定)。改訂後の複数形 export でもこの性質を維持する | 無引数ピン(改訂版)が export 一覧 + arity 0 を検査して green | BR-S5, business-logic-model §3.3 |
| SR-U2-4 | CI 権限最小(NFR-3): 本 Unit は .github/workflows/ci.yml に触れず、permissions 追加を行わない | u2 の変更ファイル一覧(unit-of-work 所有ファイル2件)に ci.yml が含まれないこと | NFR-3, unit-of-work u2 所有ファイル |
| SR-U2-5 | 新規外部依存なし(NFR-4)。リゾルバ・型は u1 供給のリポジトリ内モジュールのみを import する | bun.lock / package.json 差分なし | NFR-4 |

## 脅威の考慮(限定列挙)

- **パス traversal / symlink 脱出**: model-map.json の宣言 path 経由の境界外読出し — SR-U2-1 の既存機構で既に抑止済み、本 Unit は aux を同機構に通すことで適用範囲を拡張する(弱める変更なし)。
- **照合バイパス**: 実行モデル skip(現行 :258)は「登録済みなのに照合されない資産」を生む構造的穴であり、本 Unit の skip 撤廃(BR-V1)はこの穴を塞ぐ**セキュリティ改善**である。
- 認証・認可・データ保護・コンプライアンス規制マッピングは、外部接点を持たない内部検証ツールのため非適用(証跡: 所有ファイルは `plugins/formal-model-check/tools/tla-model-loader-internal.ts` / `tla-model-loader.ts` の2件のみ、ネットワーク I/O なし)。
