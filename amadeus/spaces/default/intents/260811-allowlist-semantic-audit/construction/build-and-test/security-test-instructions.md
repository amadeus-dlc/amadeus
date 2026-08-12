上流入力(consumes 全数): code-generation-plan.md / code-summary.md

# Security Test Instructions — 260811-allowlist-semantic-audit

## 判定: SAST/DAST・認証・インジェクションの専用試験は生成しない

ステージ契約 Step 4-8 は security 試験を**「IF NFR security requirements exist」**の条件付きとする。
`requirements.md` の NFR-1〜NFR-4 に認証・認可・機密・攻撃面の要件はなく、本 intent の変更は
ネットワーク境界・認証経路・ユーザー入力の受理面を一切持たない(対象は repo 内の台帳 JSON と
それを読むテストツール)。`cid:build-and-test:c2-no-test-theatre-for-absent-nfr` に従い、
判定・根拠・覆すべき条件を明記する。

ただし**「security 要件が無い」ことと「検査すべき性質が無い」ことは別**である。本変更が持つ
セキュリティ隣接の性質は 2 つあり、いずれも既存テストで固定されている(下記)。

## 実際に固定している面

### 1. 供給経路の閉包(NFR-1 の静的 assert)

ガード実装がネットワーク・LLM クライアントを import しないことを静的に assert する。
検査が外部到達性を持てば、判定が再現不能になるだけでなく、CI から外部へ出る経路が増える。

```bash
bun test ./tests/unit/t536-allowlist-declared-class.test.ts
```

### 2. fail-closed(NFR-2)

台帳は「patch gate の免除」という統制上の例外を運ぶデータであり、**壊れた入力を通す方向の
失敗が最も危険**である。語彙外の `class` 値・空文字・非文字列・解決失敗・source 不在は
すべて赤にする。空出力を「一致」と解釈する経路を作らない。

```bash
bun test ./tests/integration/t537-allowlist-declared-class.integration.test.ts
```

## リポジトリ全体の依存監査との分離

`cid:build-and-test:c1-doctor-seam` に従い、対象変更のセキュリティ退行と repo 全体の
依存監査は別判定とする。本 intent は依存を追加していない(`package.json` 無変更)ため、
依存監査の対象変更はない。既存の advisory があってもそれは本 intent の範囲外であり、
隠さず別 Issue へ送る。

## この判定を覆すべき条件

1. ガードが repo 外の入力(ネットワーク・環境変数由来のパス・ユーザー提供 JSON)を読むよう
   変更されたとき — 信頼境界を跨ぐ入力が入れば regex の線形性実測が要る
   (`cid:code-generation:regex-linearity-untrusted-input`)
2. 台帳の書き込み経路が人手以外(自動生成・外部連携)へ広がったとき
3. `requirements.md` に security 面の NFR が追加されたとき
