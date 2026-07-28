# Security Design — u1-project-sync-skeleton

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

security-requirements の各契約を既存機構の再利用で実現する設計 — 新しい認証フロー・暗号機構・セキュリティ層を導入しない(tech-stack-decisions の新規依存ゼロ決定)。

## 認証・シークレット管理

- token は gh credential store へ委譲(security-requirements)— 設計上、フレームワークのどのモジュールも token 値を受け取らない。到達手段は argv spawn の gh サブプロセスのみ(shell 不使用 — コマンドインジェクション面を argv 配列構造で遮断)。
- 暗号化設計(at rest / in transit): N/A — at rest は git 管理の record/state のみ(独自データストアなし)、in transit は gh が担う HTTPS(フレームワーク側に転送層なし)。

## 認可・mutation ゲート

- mutation(business-logic-model 手順3の追加・手順7の適用)は permit 検証を通過した gateway メソッドのみが実行する(security-requirements)— permit を経ない mutation 呼び出し経路を型・モジュール構造で作らない。
- argv 生成面の negative assert: PR merge / release / deploy 系 API 経路が存在しないことをテストで固定(security-requirements の scopeExclusions 面)。削除・アーカイブ mutation の不在も同一の検査様式(security-requirements の negative assert 面)。

## 入力検証(fail-closed)

- config: unknown key 拒否・closed schema(business-logic-model 手順1の設定解決 — 設定なしは全 skip の安全側分岐)。
- 照合: 期待 Status 名と選択肢の exact match のみ(business-logic-model 手順6)— 正規化・あいまい一致を実装しない(security-requirements の fail-closed 契約)。比較は parse 済みの構造化値で行う(型不正の無言 fail-open を作らない)。
- API 応答: body の解釈層で分類してから消費(business-logic-model のエラー分類面)— 応答文字列を argv・診断へ素通ししない(security-requirements の脅威考慮)。

## 診断・ログの秘匿

- safety-blocked 診断(business-logic-model 手順4/6 の観測)は期待名+実在選択肢一覧のみを含み、既存 redact 流儀(security-requirements の実装直読: amadeus-mirror-gateway.ts:456-465)で生応答を遮断する。診断量は Project 数に線形(scalability-requirements)で、出力肥大による情報漏えい面の拡大はない。
- 監査: 状態書込は既存の audit 確定 → state write 順序(reliability-requirements のデータ耐久性)に載せ、新しい監査経路を作らない。性能面の検査(performance-requirements の history assert)も応答 body を扱わない。
