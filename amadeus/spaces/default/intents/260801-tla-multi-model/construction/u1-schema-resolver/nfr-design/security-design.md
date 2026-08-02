# Security Design — u1-schema-resolver

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u1-schema-resolver(C1+C2)

上流入力(consumes 全数): security-requirements(脅威面評価・適用要件), performance-requirements(依存増分ゼロ), scalability-requirements(過剰設計禁止), reliability-requirements(fail-closed・byte 不変・dual-copy), tech-stack-decisions(純粋モジュール・既存検証手続き再利用), business-logic-model(§1.3 aux path 検証 / §1.4 vocabulary 検証 / §2.2 標準モジュール境界 / §2.4 解決境界)

## 1. 脅威面と設計方針

security-requirements の評価どおり、認証・認可・ネットワーク・UI・永続ストア・暗号化・コンプライアンスの各面は非存在により**適用外**(PII・認証情報なし、公開リポジトリ内資産のみ、NFR-4 でサプライチェイン拡大なし)。設計が守るべき適用面は「入力検証と境界」「fail-closed」「権限最小の維持」の3系統のみであり、機構は全て functional-design が固定済みのものをそのまま採用する — 本書は新機構を発明せず、写像と検証方法を固定する。

## 2. NFR → 機構マッピング(検証方法付き)

| 要件(正本) | 設計機構(functional-design の既指定) | 検証方法(どのテスト/AC が証明するか) |
|---|---|---|
| パストラバーサル防御(BR-S4 / NFR-2) | C1 §1.3: aux path は `specs/tla/<Name>.tla` 形のみ許可。拒否集合 = `\\` 含有・絶対パス・`..` セグメント・非正規化形(`posix.normalize(path) === path` でエンコード回避の余地を残さない)・`.cfg`/他拡張子・`specs/tla` 外・`MODEL_NAME` 文法外 basename・**自己 aux**。検査順序固定、違反は全て `invalid(...)` → `MODEL_MAP_INVALID` | スキーマ表テスト拡張の境界外負例全件赤(u1 AC1): `"specs/tla/../x.tla"` / `"/specs/tla/X.tla"` / `"plugins/x.tla"` / `"specs/tla/MirrorLifecycle.cfg"` / `"specs/tla/1Bad.tla"` / 自己 aux — dual-copy `describe.each` 表で両コピー同時に検証 |
| vocabulary 入力検証(形のみ fail-closed) | C1 §1.4: `exactObject(["namedInvariants","traceStateVariables"])`、各要素は非空・string・`MODEL_NAME` 文法一致・一意。空配列拒否(省略と区別)。値の意味判定は u3/u4 帰属でスキーマ層は形のみ | スキーマ表テスト負例: 未知キー混入 / `namedInvariants: []` / 非識別子要素(`"not-an-inv"`) / 重複要素が全件赤 |
| 解決境界 specs/tla のみ(BR-R4 / §2.4) | C2: 関数名入口で `MODEL_NAME` 文法外のモジュール名を `MODULE_DEP_OUT_OF_BOUNDS` で拒否(直接 API 呼出しへの防御)。文法上パス区切り・`..` を構文的に含め得ない | t402: 文法外モジュール名の直接入力が `MODULE_DEP_OUT_OF_BOUNDS` で落ちる境界 red |
| 注入シーム限定(BR-R8 / NFR-3) | C2: fs アクセスは注入 `readModule` のみ。モジュール本体は純粋関数で、動的 import / `eval` / 子プロセスを持たない。`readModule` 実装側(loader)が `specs/tla/<Name>.tla` のみ読む責務 | import 一覧検査(型 import のみ許容 — security-requirements Verification)+ t402: 注入 stub の失敗がそのまま伝播 |
| fail-closed(NFR-2) | C2 §2.2-2.4: 未解決参照 `MODULE_DEP_UNRESOLVED` / 循環・自己参照 `MODULE_DEP_CYCLE` / 文法外 `MODULE_DEP_OUT_OF_BOUNDS` の型付きエラー3種で明示失敗。silent fallback / silent skip 禁止。標準モジュール豁免リストはコード内固定(`TLA_STANDARD_MODULES`)で、未収録の未知名は黙って通らない(追加はコード変更を伴う) | t402 境界 red 3種がそれぞれ固有コードで落ちること(reliability-requirements Acceptance (1))+ 標準モジュール混入なしケース |
| 不正ソースの後段倒し(BR-R6) | C2 §2.1-1: 閉じられないブロックコメントは末尾までコメントとみなし、偽の依存を返さない — 寛容な解析で誤緑を出すより後段の宣言照合で落ちる側へ | t402 偽陽性ガード(ブロックコメント内 `(* INSTANCE Fake *)` が結果に入らない) |
| 宣言照合の双方向性(BR-C1) | C2 §2.6: missing(resolved−declared)と extra(declared−resolved)の双方向比較。片方向の部分集合判定で緑にすることを禁止 | t402 宣言照合ケース: missing・extra が DriftReport に正しく乗る |
| 後方互換のエラー経路不変(NFR-1 / BR-S8) | C1: 新規エラーコード追加なし。失敗は全て既存 `invalid(...)` 経路(`MODEL_MAP_INVALID`)に乗せ、`ModelLoadErrorCode` 列挙不変 | 既存スキーマ表テスト据置き(期待値不変)+ 負例のエラーコードが `MODEL_MAP_INVALID` であること |
| 権限最小の維持(NFR-3) | 設計上の固定: 本 Unit は `ci.yml` を所有しない(u5 帰属)。追加の GITHUB_TOKEN 権限・シークレット・外部アクションを要求しない機構のみ採用 | diff 検査: `.github/workflows/ci.yml` に差分がないこと(code-generation の逸脱検出) |

## 3. 複製整合(ブラスト半径の封じ込め — reliability 由来)

- byte-identical 2 複製(`packages/framework/core/tools/` と `plugins/formal-model-check/tools/` の `amadeus-formal-verif-model-map.ts`)は C1 §1.6 の手順どおり同一 byte で同時更新し、`cmp` exit 0 + dual-copy テスト表の両側 green で実証(BR-S9)。片側のみの更新は `describe.each` 構造上テストが落ち、誤った片側リリースを構造的に防ぐ。
- shim `tla-model-map.ts` への追記は `type ModelVocabulary` の re-export のみで、既存 export の意味を変えない(C1 §1.5)。
- patch coverage 100% ゲート(team-practices Testing Posture): 変更行 0-hit 不許容。上記の全負例・境界 red は修正と同 PR で運ぶ(BR-P1〜P5)。

## 4. 適用外カテゴリ(別設計を要しない根拠)

認証・認可モデル、データ暗号化(静止・転送)、通信保護、セッション管理、コンプライアンス(個人情報・業界規制)は、対象がリポジトリ内 CLI/CI 検証ツールの内部モジュールであり該当面を持たないため適用外 — security-requirements.md §脅威面の評価を前方参照。セキュリティ面での新規外部依存も NFR-4 で禁止済みであり、依存導入によるサプライチェイン面の拡大は発生しない。

## 5. 禁止事項(code-generation への制約)

- 拒否集合(§2 表の path 負例群)の緩和・順序変更・早期 return による検査スキップの禁止。
- 標準モジュール豁免リストの外部設定化・緩い前方一致化の禁止(コード内固定・完全一致のみ)。
- 新規エラーコード・新規例外経路の追加禁止(`invalid(...)` / 型付きエラー3種以外で失敗を表現しない)。
- エラーを握りつぶす `try/catch` + デフォルト値返却の禁止(silent fallback は NFR-2 違反)。
