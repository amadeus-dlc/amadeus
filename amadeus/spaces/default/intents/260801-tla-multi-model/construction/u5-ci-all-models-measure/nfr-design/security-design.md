# Security Design — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): security-requirements(SR-1〜SR-3), performance-requirements, scalability-requirements, reliability-requirements(RR-1 — fail-closed 入力検証と表裏), tech-stack-decisions(NFR-4 新規外部依存なし), business-logic-model(u5 functional-design §2.1 / §3 / §5 / §6 / §11.1 — CLI パーサ・二層検証・skeleton fail-closed・ci.yml 差分最小化・scratch fixture)

本 Unit は認証・認可・暗号・ネットワーク公開面を新たに持たない。セキュリティ設計の対象は **CI 権限最小の維持**・**fail-closed の入力検証**・**注入変異の隔離**の3点のみであり、機構は全て functional-design が指定済みのものの写像である。

## SD-1: CI 権限最小の設計(SR-1 / NFR-3)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| SR-1(permissions 不変) | **ci.yml 差分最小化**(BLM §6): 変更はステップ名・サマリ表示のみ。`permissions: contents: read`・`if: workflow_dispatch`・`timeout-minutes: 30`・runs-on・ステップ id・shell 構造は一切触れない。コマンド行も不変(既定が全モデル化するため引数追加すら不要) | 二重検査(BR-C1/BR-C2): (1) t406 AC4 の文字列 pin(timeout / permissions / workflow_dispatch 行の不変ガード)、(2) code-generation PR での `git diff` 目視。1行でも diff が出たら設計違反 |

## SD-2: 入力の fail-closed 設計(SR-2 / NFR-2)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| SR-2(未登録モデル名) | **判定源の単一化**(BLM §2.1): モデル名の登録判定は loader(`loadVerifiedTlaSources` → `selectVerifiedModel`)経由のみ。CLI パーサは文字列を素通しし、登録判定をパーサに複製しない(BR-S2)。未登録名は loader の MODEL_MAP_INVALID 明示失敗を exit 2 の HARNESS_ERROR 系 stderr JSON へ写す。silent fallback なし | t406 AC3: `run --model NoSuch` が exit 2 の明示失敗で、evidence ディレクトリを汚染しないことの pin。diagnostic(§4)・skeleton(§5)も同一規則 |
| SR-2(skeleton 範囲) | **意図的 fail-closed**(BLM §5、D-U5-5): skeleton の `--model` に FormalElection 以外が指定された場合は明示失敗(exit 1、「skeleton requires the frozen-bound model」系)。「未対応」を黙って成功扱いしない(BR-S1)。frozen 生成は FormalElection 語彙のまま不変(ADR-10) | run-skeleton-ci 系テストの fail-closed ケース(非 FormalElection → exit 1)+ 無引数動作の byte 不変ケース |
| SR-2(検証層の選択) | **宣言的層 dispatch**(BLM §3.2、D-U5-1): frozen 層 / verified-source 層の選択根拠はモデルの宣言的性質(frozen binding の有無)であり、実行時の成否で切り替わる経路は作らない。verified-source 層の integrity は loader byte-pin(moduleIdentity / cfgIdentity / auxIdentities)が担保し、frozen-receipt 入口(tlc-toolchain 系3ファイル)は一般化しない | port 統合テストの層 dispatch 分岐ケース + 宣言不一致・byte 不一致で loader/sensor が赤化する u2/u4 の検出点(維持仕分け) |

## SD-3: テスト fixture 隔離の設計(SR-3 / BR-M4)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| SR-3(repo 実体の非汚染) | **scratch fixture 上の注入**(BLM §11.1 / §11.3): 意味論破壊の注入は workspace コピー + 補正済み model-map の scratch fixture 上でのみ行い、repo 実体の `specs/tla/` と model-map.json には触れない。注入 → red → 除去 → green の往復で、除去後に repo 実体が清浄であることも検査の一部になる | t406 AC1(both-models injection red の往復 assert)。fixture 外への書き込みがあれば除去後 green で検出される |

## N/A 判定(security-requirements の段落を踏襲)

- 認証 / 認可 / セッション管理: **N/A** — 変更対象は CI 内で完結する CLI ツールであり認証概念を持たない(security-requirements N/A 節・BLM §12.1 の所有ファイル一覧へ前方参照)。
- データ保護 / 暗号化 / PII: **N/A** — 扱うデータは TLA+ spec・evidence JSON・TLC 統計のみで個人情報・機密情報を含まず、新規の外部送信もない(security-requirements N/A 節 + requirements NFR-4 へ前方参照)。
- ネットワーク / 公開面: **N/A** — docker TLC 実行は既存の隔離機構(validateDockerReceipt、BR-F2 で不変)内で完結し、新規 endpoint を追加しない(security-requirements N/A 節へ前方参照)。
- 依存脆弱性(supply chain): **N/A(新規分)** — tech-stack-decisions どおり新規外部依存なし(NFR-4)。既存依存の監査は既存 CI 体制の範囲(security-requirements N/A 節へ前方参照)。
