# Security Requirements — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): business-logic-model(§3.2 regex エスケープ / §4 / §5), business-rules(BR-V5 / BR-V6 / BR-G4 / BR-B2), requirements(NFR-2 / NFR-3 / NFR-4)

## 適用要件

認証・認可・PII・ネットワーク面を持たない内部検証ツールだが、入力(map 宣言・TLC 出力)の取り扱いに以下を適用する。

| # | 要件 | 測定可能な判定 | 由来 |
|---|---|---|---|
| SEC-1 | **regex インジェクション防止**: model name をトレースラベル regex へ埋込む際は必ずエスケープする(`escapeRegExp`)。文逸脱文字が混入しても regex 意味論を壊さない | business-logic-model §3.2 の実装形どおり。t404 で MirrorLifecycle/FormalElection 双方向の受理・拒否を検証 | BR-V6, NFR-2 の fail-closed 精神 |
| SEC-2 | **語彙の閉集合性**: invariant 名の受理はそのモデルの語彙に限定し、全モデル和集合で緩めない。未知 invariant 名は `failed("GRAMMAR", "counterexample invariant is outside the frozen set")` で拒否 | t404 和集合拒否ケース green(偽陰性の防止) | BR-V5, BR-G4, ADR-5 却下案 (a) |
| SEC-3 | **未登録モデル要求の拒否**: byte-pin 選択で未登録モデル名は MODEL_LOAD / MODEL_MAP_INVALID の明示失敗。他モデルへの silent fallback 禁止 | run-model-check-source 統合の未登録要求 red ケース | BR-B2, NFR-2 |
| SEC-4 | **新規外部依存ゼロ**: 依存追加なし。サプライチェーン面は現状維持 | bun.lock に差分が出ないこと | NFR-4 |
| SEC-5 | **語彙の出所の単一化**: toolchain/arm が model-map.json を直接読む経路を作らず、loader 検証済みの `VerifiedModelSource` 経由のみ受領。未検証入力が toolchain に届く経路を新設しない | BR-V2 の構造規則。import 関係のレビュー + t404 grep ガード | BR-V2, ADR-6 |

## 非適用とする領域(根拠)

- **認証・認可・セッション管理**: CLI ツールにユーザー概念・権限モデルが存在しない。
- **データ保護(暗号化・PII)**: 扱うデータは公開 repo 内の TLA spec・map 宣言・TLC 出力のみで、秘密情報・個人情報を含まない。
- **ネットワークセキュリティ**: ネットワーク I/O を持たない(外部通信面なし)。
- **CI 権限(NFR-3)**: ci.yml の permissions 不変は u5 の所有ファイル(ci.yml)に関わる制約であり、u3 は ci.yml を触らない(unit-of-work u3 所有ファイル一覧)。u3 側で権限追加を必要とする変更は存在しない。
