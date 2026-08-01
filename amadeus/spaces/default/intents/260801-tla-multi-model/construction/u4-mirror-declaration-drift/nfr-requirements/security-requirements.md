# Security Requirements — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): unit-of-work(u4 節・AC1〜4), business-logic-model(§2.2 readModule アダプタ / §5 不変性), business-rules(BR-I3 / BR-SC6 / BR-SU5), requirements(NFR-2 / NFR-3 / NFR-4)

## セキュリティ適用判定

本 Unit は認証・認可・ネットワーク面・PII を持たない内部検証ツールの変更である。適用可能なセキュリティ要求は「既存のファイルアクセス検査を宣言照合の新経路でも緩めない」ことと、CI 権限・外部依存の据え置きに限定される。

## 要求一覧

| # | 要求 | 測定基準 | 由来 |
|---|---|---|---|
| SEC-U4-1 | 宣言照合の readModule アダプタによるその場読みは必ず `deps.readFile`(safeReadFile: rootContains 境界検査・symlink 拒否・TOCTOU 検査・サイズ上限)を通す。検査をバイパスする読込経路を新設しない | BR-I3 の pass 条件: 新規読込箇所が全て safeReadFile 経由であることのコードレビュー確認。セキュリティ検査系の既存テストが期待値不変で green | business-logic-model §2.2, BR-I3, sensor :208-303 実測 |
| SEC-U4-2 | リゾルバの境界外モジュール参照(`OUT_OF_BOUNDS`)は fail-closed に赤(`declaration-unresolved` finding / `UPDATE_FAILED`)とし、specs/tla ツリー外のファイル読取に到達しない | BR-SC3 / BR-SU6 の red 実証(t405 resolver 失敗ケース、境界外参照を含む分類)が green | BR-SC3, BR-SU6, u1 リゾルバ仕様, NFR-2 |
| SEC-U4-3 | publish は既存の lock + validatePublishTarget + publishAtomic 経路のみを通し、宣言補正専用の書込み経路を作らない(atomic 性・対象検証の破綻を防ぐ) | BR-SU5: canonicalRecord 出力が publishAtomic 以外から書かれないことの確認 | business-logic-model §5, BR-SU5, sensor :592-643 / :847-856 実測 |
| SEC-U4-4 | CI 権限の追加なし(requirements NFR-3: permissions `contents: read` 維持)。u4 は workflow ファイルを触らない(u5 面でも不変が D-制約 C2) | u4 差分に `.github/workflows/` の変更がないこと | requirements NFR-3, unit-of-work u4 所有ファイル節 |
| SEC-U4-5 | 新規外部依存なし(requirements NFR-4)。リゾルバ共有は外部パッケージではなく repo 内の byte-identical 複製(GENERATED_PLUGIN_SOURCES)で解決する | package.json / bun.lock に差分がないこと。`bun scripts/package.ts --check` green | requirements NFR-4, business-logic-model §1(D-U4-1) |

## 非適用の補足

認証・認可モデル、暗号化、PII / 個人情報保護、コンプライアンス規制マッピングは非適用である。根拠: 本 Unit の変更はローカル CLI ツールと `specs/tla/model-map.json` 宣言のみで、外部通信・利用者データ・秘匿情報の取り扱いが存在せず(requirements §NFR に該当要求なし)、処理対象は repo 内の TLA ソースと検証マップのみである。
