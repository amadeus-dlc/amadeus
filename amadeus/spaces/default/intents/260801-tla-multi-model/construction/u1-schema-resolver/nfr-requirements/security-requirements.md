# Security Requirements — u1-schema-resolver

## 上流境界

`business-logic-model.md` の §1.3(aux path 検証)/ §2.4(解決境界)、`business-rules.md` の BR-S4(境界外 path 拒否)/ BR-R4(文法外名拒否)/ BR-R8(注入シーム限定)、`requirements.md` の NFR-2(fail-closed)/ NFR-3(権限最小)/ NFR-4(新規外部依存なし)を正本とする。

## 脅威面の評価(適用外の根拠)

本 Unit はリポジトリ内 CLI/CI 検証ツールの内部モジュール変更であり、認証・認可・ネットワーク・UI・永続ストアの面を持たない。取り扱うデータは TLA+ ソースと model-map.json(いずれも公開リポジトリ内資産)のみで、PII・認証情報は存在しない。したがって認証・認可モデル、データ暗号化、通信保護、コンプライアンス(個人情報・業界規制)の各要件は**適用外**とする — 根拠は上記の非存在であり、新規外部依存も NFR-4 で禁止済み(サプライチェイン面の拡大なし)。残る適用面はパス/入力の検証と権限最小の維持のみ。

## 適用要件(入力検証と境界)

- **パストラバーサル防御(BR-S4)**: aux の path は `specs/tla/<Name>.tla` 形のみ許可し、`..` セグメント・絶対パス・バックスラッシュ・非正規化形・他拡張子を全て拒否する(`MODEL_MAP_INVALID`)。正規化済みチェック(`posix.normalize(path) === path`)を必須とし、エンコード回避の余地を残さない。
- **解決境界(BR-R4 / §2.4)**: リゾルバは `MODEL_NAME` 文法(パス区切り・`..` を構文的に含め得ない)に一致しないモジュール名を `MODULE_DEP_OUT_OF_BOUNDS` で入口拒否し、fs アクセスは注入シーム `readModule` のみに限定する(BR-R8 — モジュール本体は純粋関数、動的 import / `eval` / 子プロセスを持たない)。
- **fail-closed(NFR-2)**: 未解決参照・循環・構文異常トークンは全て型付きエラーで明示失敗し、silent fallback・silent skip を禁止する(BR-R3 / BR-R4 / BR-R7)。標準モジュールの豁免リストはコード内固定とし、未収録の未知名が黙って通る経路を作らない。
- **権限最小(NFR-3 の維持)**: 本 Unit は `.github/workflows/ci.yml` を所有しない(u5 帰属)。CI ジョブの permissions 変更は不要かつ禁止 — u1 の変更によって追加の GITHUB_TOKEN 権限・シークレット・外部アクションを要求しない。

## Verification

境界外負例(path traversal / 絶対パス / `.cfg` / 文法外名)がスキーマ表テスト拡張と t402 で**全件赤**であること(u1 AC1 / BR-P1 / BR-P4)をもって合否とする。`readModule` 以外の fs 到達経路がないことは import 一覧の検査(型 import のみ許容)で確認する。
