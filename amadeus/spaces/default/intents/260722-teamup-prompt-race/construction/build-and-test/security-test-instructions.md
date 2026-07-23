# Security Test Instructions — 260722-teamup-prompt-race

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1384-watcher-arming/code-generation/)。

## 選定判断: 専用セキュリティテストは追加しない(N/A)

cid:build-and-test:c3(攻撃面・依存・承認 NFR の実測明記がある場合のみ比例選定)に従う。実測: 本変更は (a) 新規ランタイム依存ゼロ(NFR-3、code-summary 宣言+CI drift ガード green) (b) ネットワーク・認証・シークレットに不接触 (c) 入力はローカル herdr の JSON 出力と自プロセス生成のセンチネルパスのみ(信頼境界内)。

## 既存ガードで担保する面

- センチネルパスは `agmsg_ready_path()` からの canonical 導出でパス組み立ての複製なし(NFR-4 — インジェクション面の非拡大)
- 再送プロンプトは固定文字列定数 `CLAUDE_MONITOR_PROMPT`(:69)で外部入力を含まない
- 既存 CI の必須 scan(lint/typecheck/drift)は本 PR でも全 green(省略なし)
