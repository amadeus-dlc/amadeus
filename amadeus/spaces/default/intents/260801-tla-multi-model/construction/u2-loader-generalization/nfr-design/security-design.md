# Security Design — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): security-requirements(SR-U2-1〜5), performance-requirements(単一読込原則の共有), scalability-requirements(SC-U2-1 ハードコード撤廃), reliability-requirements(fail-closed 相互参照), tech-stack-decisions(TS-U2-1〜2, NFR-4), business-logic-model(§1.1 検査経路, §2.2 双方向照合, §3.2 selectVerifiedModel, §3.3 production seam, §4 不変性)

本 Unit は認証・認可・暗号化・secrets 管理・セキュリティヘッダの設計対象を持たない(外部接点のない内部検証ツール)。セキュリティ設計の全ては「既存の検査経路を緩めず fail-closed を維持する」という、functional-design が規定済みの機構への写像である。新規機構は導入しない。

## NFR → 機構マッピング

| # | 要求 | 設計機構(functional-design 参照) | 検証方法(証明するテスト/AC) |
|---|---|---|---|
| SR-U2-1 | aux を model と同一検査経路に通し、境界規則を一切緩めない | business-logic-model §1.1: aux は MODEL kind として `verifyAssetPath`(specs/tla 境界外パス拒否・symlink 拒否)→ `readAsset`(非空検査)→ `sourceIdentity`(UTF-8 fatal decode + canonicalIdentity)の現行経路(:129-163 / :185-212)をそのまま通る。aux 専用の新しい検査・緩い別経路・新エラーコードは追加しない。identity domain は model と同型 `amadeus.formal-verif.tla.module.v1`(ADR-1) | 統合テストの境界系 red ケース(:150-240, :271-325)が期待値不変で green。t403 の aux identity mismatch red |
| SR-U2-2 | 全失敗を明示失敗(fail-closed、NFR-2) | §2.2: 宣言漏れ(missing)・過剰宣言(extra)は双方向とも非空なら `drift(...)`(SOURCE_DRIFT)で明示失敗、detail に declared / resolved 両集合。§3.2: `selectVerifiedModel` の未登録名は `MODEL_MAP_INVALID` で明示失敗(silent fallback なし)。BR-S6: (条件付き)空 models は loader ガードで `MODEL_MAP_INVALID`。error union に緑で返す逃げ道を持たない | t403 の赤ケース群(宣言漏れ/過剰宣言/aux identity/未登録選択/(条件付き)空 models)が全て規定エラーで落ちる(u2 AC1/AC2) |
| SR-U2-3 | production seam 性質の不変(root/fs を実行時入力から選べない) | §3.3: 無引数 wrapper は改訂後も引数なし・注入なし・`import.meta.url` 固定。shim 期間中は両 export(旧 singular + 新複数形)ともこの性質を維持する | 無引数ピン改訂版(export 一覧 `["loadVerifiedTlaSource", "loadVerifiedTlaSources"]` + 両関数 arity 0)が green |
| SR-U2-4 | CI 権限最小(NFR-3)、ci.yml 非接触 | 本 Unit の所有ファイルは `tla-model-loader-internal.ts` / `tla-model-loader.ts` の2件のみ。`.github/workflows/ci.yml` に触れない | u2 の変更ファイル一覧に ci.yml が含まれないこと(PR 差分で確認) |
| SR-U2-5 | 新規外部依存なし(NFR-4) | TS-U2-1/TS-U2-2: import するのはリポジトリ内の u1 供給モジュール(`tla-module-deps.ts`、`tla-model-map.ts` 経由の型)のみ | bun.lock / package.json 差分なし |

## 脅威 → 対応の確認(requirements の限定列挙に対応)

- **パス traversal / symlink 脱出**: SR-U2-1 の既存機構(拒否集合不変)で抑止済み。本 Unit は aux を同機構に通して適用範囲を広げるのみで、弱める変更は設計に存在しない。
- **照合バイパス**: 実行モデル skip(現行 :258)の撤廃(§1.1)は「登録済みなのに照合されない資産」を塞ぐセキュリティ改善。t403 の「skip 撤廃の実証」ケース(どのモデルの drift も同一経路で赤)がこれを証明する。
- **認証・認可・データ保護・コンプライアンス**: 非適用。根拠は security-requirements「脅威の考慮」節のとおり(所有ファイル2件のみ、ネットワーク I/O なし)。
