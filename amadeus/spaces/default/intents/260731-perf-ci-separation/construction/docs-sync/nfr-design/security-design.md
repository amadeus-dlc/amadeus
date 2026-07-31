# Security Design — U4 docs-sync

上流入力(consumes 全数): business-logic-model.md(U4 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-6/NFR-1(ii) と FD の台帳ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 脅威面の評価

文書のみの変更(business-logic-model.md ロジック2)— コード・権限・依存の変更なし。誤記述による運用ミス誘発が唯一のリスクで、BR-U4-4(実装を読んで書く)と対訳同期で緩和。

## 検証

リンク整合(相対パス実在)と en/ja 構造 diff の機械確認(FD の落ちる実証節)。
