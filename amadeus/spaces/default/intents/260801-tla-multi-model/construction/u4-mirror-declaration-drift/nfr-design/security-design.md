# Security Design — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): security-requirements(SEC-U4-1〜5 / 非適用補足), performance-requirements(PERF-U4-1: 読込経路の単一性), scalability-requirements(非適用), reliability-requirements(REL-U4-1 fail-closed / REL-U4-4 atomic publish / REL-U4-5 後方互換), tech-stack-decisions(D-U4-1: GENERATED_PLUGIN_SOURCES による byte-identical 複製), business-logic-model(§1 リゾルバ配置 / §2.2 readModule アダプタ / §3.3 latch 拡張 / §5 不変性 / §7.4 非接触証明)

## セキュリティ設計方針

本 Unit は認証・認可・ネットワーク・PII を持たない内部検証ツールの変更であり、新設する防御機構は存在しない。設計の全内容は「宣言照合・補正という2つの新経路が、既存のファイルアクセス検査(safeReadFile)・fail-closed 分類・atomic publish という3本の既存防御線の内側に収まる」ことの固定である。全機構は business-logic-model / security-requirements で規定済みのものの転記であり、新規機構の発明はしない。

## NFR → 機構マッピング

| NFR | 設計機構(functional-design 由来、新規発明なし) | 検証方法(どのテスト/AC が証明するか) |
|---|---|---|
| SEC-U4-1(読込検査のバイパス禁止) | `readModule` アダプタのその場読みは必ず `deps.readFile`(safeReadFile: rootContains 境界検査・symlink 拒否・TOCTOU 検査・サイズ上限)を通す。計測済み bytes の再利用も safeReadFile 済みのものに限る(business-logic-model §2.2 単一読込原則)。safeReadFile 系の検査コード(:208-303)は一行も触らない(§5 不変性) | コードレビューで新規読込箇所が全て safeReadFile 経由であることを確認(BR-I3 pass 条件)。セキュリティ検査系の既存テストが期待値不変で green(SEC-U4-1 測定基準 / BR-I1) |
| SEC-U4-2(境界外参照の fail-closed) | リゾルバの `OUT_OF_BOUNDS`・未解決・循環は check では `declaration-unresolved` finding(赤)、updateModelMap では `UPDATE_FAILED` 系失敗。specs/tla ツリー外のファイル読取に到達しない。黙示 fallback(「宣言なしとみなす」等)は実装しない(business-logic-model §2.2 fail-closed / §3.2-2) | t405 resolver 失敗ケース(循環参照 fixture → `declaration-unresolved` 赤)が green(u4 AC2 / BR-SC3 / BR-SU6 / BR-P5)。境界外参照を含む失敗分類の red 実証 |
| SEC-U4-3(publish 経路の単一性) | 宣言補正を含む全 publish は lock(:847-856)+ validatePublishTarget + publishAtomic(:592-643)のみを通す。宣言補正専用の書込み経路は作らない(business-logic-model §5「lock・atomic publish の不変」)。--impl-only は aux 変化・宣言不一致の存在下で `INVALID_ARGUMENT` 拒否し半更新の publish を許さない(§3.3 latch) | t380 拡張3ケース: aux 変化拒否・宣言不一致拒否・非 entries フィールド deep-equal が green(BR-P6 / REL-U4-4)。canonicalRecord 出力が publishAtomic 以外から書かれないことのコードレビュー確認(BR-SU5) |
| SEC-U4-4(CI 権限の据え置き) | u4 は workflow ファイルを一切触らない(requirements NFR-3: permissions `contents: read` 維持。u5 面でも D-制約 C2 で不変) | u4 差分に `.github/workflows/` の変更がないことの diff 確認(code-summary 記録。unit-of-work u4 所有ファイル節) |
| SEC-U4-5(新規外部依存なし) | リゾルバ共有は外部パッケージではなく D-U4-1 の GENERATED_PLUGIN_SOURCES(byte-identical generator-owned 複製)で解決。package.json / bun.lock は無変更(business-logic-model §1) | `bun scripts/package.ts --check` green(複製 drift の赤化)。package.json / bun.lock に差分がないことの diff 確認(SEC-U4-5 測定基準) |

## fail-closed 型付きエラー分類(SEC-U4-2 / REL-U4-1 の具体形)

判定不能は常に赤、という単一原則を3つの型付き経路に固定する(business-logic-model §2.2 / §3.2):

- check 経路: リゾルバ失敗(未解決・循環・境界外)→ `FindingReason: "declaration-unresolved"`(verdict `reason: "drift"`、findings 非空で赤)。verdict 型の追加はしない(NFR-1)。
- updateModelMap 経路: リゾルバ失敗 → `UPDATE_FAILED` 系失敗(updateFailure)。
- --impl-only 経路: aux 変化・宣言不一致の存在 → `INVALID_ARGUMENT`(detail は flagless updateModelMap を指す回復案内)。

黙示 fallback・部分成功・「宣言なしとみなす」経路はいずれも設計に存在しない。

## 信頼性との境界(reliability-design.md との役割分担)

reliability-requirements.md の REL-U4-1(fail-closed)/ REL-U4-4(atomic publish)は上表 SEC-U4-2/U4-3 と同一機構であり、REL-U4-2(冪等性)/ REL-U4-3(決定性)/ REL-U4-5(後方互換)/ REL-U4-6(patch カバレッジ)は reliability-design.md のマッピングおよび t405・t380 拡張の検証列でカバーされる。可用性・バックアップ・災害復旧は reliability-requirements.md 非適用補足の段落どおり非適用(永続状態を持たない検証ツールと repo 内 JSON 宣言のため稼働率・耐久性の概念が成立しない)。engine の produces 要件に従い reliability-design.md を別生成するが、内容は上記の集約関係(同一機構への参照と REL-U4-2/3/5/6 の写像)の転記であり、本書と矛盾する機構・判断は追加しない。

## 非適用カテゴリの扱い

認証・認可モデル、暗号化、PII / 個人情報保護、コンプライアンス規制マッピングは非適用 — security-requirements.md 非適用補足の段落をそのまま継承する(変更はローカル CLI ツールと `specs/tla/model-map.json` 宣言のみで、外部通信・利用者データ・秘匿情報の取り扱いが存在せず、処理対象は repo 内の TLA ソースと検証マップのみ)。

## code-generation への禁止事項(セキュリティ面)

- `deps.readFile`(safeReadFile)をバイパスする読込経路を新設しない(SEC-U4-1)。
- リゾルバ失敗・宣言不一致を成功・スキップ・空集合として扱う fallback を書かない(SEC-U4-2 / REL-U4-1)。
- lock + validatePublishTarget + publishAtomic 以外から map を書かない(SEC-U4-3)。
- `.github/workflows/`・package.json / bun.lock に差分を出さない(SEC-U4-4/5)。
- リゾルバの複製を手編集しない — canonical home(core)のみ編集し、plugin 側は `bun scripts/package.ts` 再生成で追随(§1 / D-U4-1)。
- AsImplemented / Vacuity 系ファイル・文字列に触れない(§7.4 の grep 証明、u4 AC4)。
