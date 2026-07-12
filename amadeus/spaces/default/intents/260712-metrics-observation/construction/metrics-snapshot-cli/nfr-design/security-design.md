# Security Design — metrics-observation

- **S-1(最小権限)**: workflow トップレベル permissions は現状(read)不変。metrics-snapshot job にのみ `permissions: contents: write` を宣言(U3)。保証機構 = t222 のアサート(c)+PR レビュー観点。
- **S-2(secrets 非使用)**: 実装は `secrets.*` を一切参照しない。保証機構 = t222 に「metrics-snapshot job ブロック内に `secrets.` が出現しない」アサートを追加。
- **S-3(入力境界)**: collector の数値は JSON.parse 後に Number.isFinite 検証(verification-numeric-parse)。パース失敗・型不正 = CollectorError(fault)→ loud fail。保証機構 = FR-4 注入テストに malformed JSON ケースを含める。
- **S-4(bot author)**: commit は `github-actions[bot]` author(release.yml と同一形式)。保証機構 = U3 着地後の実 run で author を実測確認(code-summary 記録)。
