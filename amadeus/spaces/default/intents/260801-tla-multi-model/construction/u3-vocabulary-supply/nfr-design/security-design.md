# Security Design — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): security-requirements(SEC-1〜5), performance-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions(TS-2 / TS-3), business-logic-model(§2.2 / §3.2 / §4 / §5)

## 設計方針

認証・認可・PII・ネットワーク面を持たない内部検証ツール(security-requirements「非適用とする領域」)。攻撃面は **入力の取り扱い**(map 宣言・TLC 出力・モデル名)のみであり、設計は functional-design 既定の **fail-closed な入力検証と単一信頼経路** に限定する。新しい防御機構は追加しない。

## NFR → 機構 → 検証の写像

| NFR | 設計機構(functional-design 既定) | 検証方法(証明するテスト/AC) |
|---|---|---|
| SEC-1(regex インジェクション防止) | ラベル regex 構築は `escapeRegExp(moduleName)` を必ず通す(`[.*+?^${}()|[\]\\]` をエスケープ、business-logic-model §3.2 の実装形そのまま)。文逸脱文字が混入しても regex 意味論を壊さない防御的エスケープ | t404: MirrorLifecycle/FormalElection 双方向のラベル受理・拒否ケース(u3 AC1/AC2)。regex 構築が `escapeRegExp` 経由であることのレビュー |
| SEC-2(語彙の閉集合性) | 反例 invariant 名の受理は選択モデルの `vocabulary.namedInvariants.includes` に限定。全モデル和集合で緩めない。未知 invariant 名は従来どおり `failed("GRAMMAR", "counterexample invariant is outside the frozen set")`(business-logic-model §3.4) | t404 和集合拒否ケース: MirrorLifecycle 語彙下で FormalElection invariant 名(`ChoiceWinner`)報告の反例が GRAMMAR 赤(u3 AC2) |
| SEC-3(未登録モデル要求の拒否) | byte-pin 選択は `selectVerifiedModel(sources, requestedName)` を必須通過とし、未登録名は MODEL_LOAD / MODEL_MAP_INVALID の明示失敗。他モデルへの silent fallback を構造的に持たない(business-logic-model §5.1) | run-model-check-source 統合: 未登録要求(`NoSuch.tla`)red ケース追加(u3 AC3) |
| SEC-4(新規外部依存ゼロ) | 依存追加なし。regex 構築・byte 照合・語彙解決は全て標準ライブラリ/既存ユーティリティ(`sameBytes` 等)で実現(tech-stack-decisions TS-2) | `bun.lock` に差分が出ないこと(CI / レビュー) |
| SEC-5(語彙の出所の単一化) | toolchain/arm は model-map.json を直接読まず、loader 検証済みの `VerifiedModelSource.model` 経由のみ受領(component-dependency 規則、business-logic-model §0 配給経路・§4.4)。未検証入力が toolchain に届く経路を新設しない | t404 grep ガード(tla-arm / tlc-toolchain の直接読込・残余定数参照なし)+ import 関係レビュー |

## 非適用領域(security-requirements からの引き継ぎ)

- **認証・認可・セッション管理 / データ保護(暗号化・PII)/ ネットワークセキュリティ**: ユーザー概念・秘密情報・ネットワーク I/O を持たない CLI ツールのため適用外(security-requirements §非適用の根拠どおり)。
- **CI 権限(NFR-3)**: ci.yml の permissions 不変は u5 の所有ファイルに関わる制約。u3 は ci.yml を触らず、権限追加を必要とする変更は存在しない(security-requirements §非適用 → u5 の reliability/security 設計へフォワード)。

## 下流(code-generation)が侵してはいけないこと

- `escapeRegExp` をバイパスした生の moduleName 埋込みを書かない(SEC-1)。
- invariant 受理集合を和集合・既定集合で緩めない。`failed("GRAMMAR", …)` の分類・メッセージ文字列を変えない(SEC-2、REL-2 と表裏)。
- 未登録名のフォールバック(先頭モデル・暗黙選択)を実装しない(SEC-3)。
- toolchain/arm から model-map.json・loader への直接 import を追加しない(SEC-5)。
