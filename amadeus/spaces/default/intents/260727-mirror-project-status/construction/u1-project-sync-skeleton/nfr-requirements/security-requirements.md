# Security Requirements — u1-project-sync-skeleton

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 認証・権限

- token は gh の credential store へ委譲し、保持・出力しない(requirements FR-10b)。ProjectV2 読取・更新には `project` scope が必要 — 不足時は対象と必要権限を秘匿情報なしで診断し、自動的な scope 変更は行わない。
- 到達手段は gh CLI サブプロセス(argv spawn、shell 不使用)のみ(technology-stack 実測: gh 2.96.0 が唯一の GitHub 到達手段)。新しい認証経路・独自 HTTP クライアントを導入しない。

## 認可・操作境界

- Project mutation(add/update)は permit 検証を通過した gateway メソッドのみが実行する — 検証 bypass の経路を作らない(business-rules BR-U1-8、requirements FR-10a)。
- gateway の argv 生成に PR merge / release / deploy 系 API 経路が存在しないことを negative assert でテスト固定(FR-10a — `MIRROR_USER_CONTRACT.scopeExclusions` parity 維持)。
- 削除・アーカイブ mutation の経路を作らない(business-rules BR-U1-10、FR-11)。

## 秘匿(requirements NFR-4)

- 診断・警告・receipt に token・生 GraphQL 応答を転記しない — 既存 `redactSummary`(amadeus-mirror-gateway.ts:456-465 — requirements NFR-4 の実装直読)流儀に従う。business-logic-model の safety-blocked 診断(期待名+実在選択肢一覧)も選択肢**名**のみを含め、応答 body を転記しない。

## 入力検証(requirements NFR-2)

- 設定・照合・状態 codec の全新規面は fail-closed: unknown key 拒否・exact match 照合(business-rules BR-U1-4)・parse 失敗は invalid。しきい値・分類の比較は数値 parse 後に行う(verification-numeric-parse — 型不正の無言 fail-open を作らない)。

## 脅威考慮(U1 断面)

- 外部入力は GitHub API 応答(gh 経由)と config.json のみ。応答 body は解釈層(interpretGraphqlResult)で分類してから消費し、応答文字列を argv・診断へ素通ししない。
