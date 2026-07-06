# コード要約 — unit: full-rename

上流入力: [code-generation-plan.md](code-generation-plan.md)

## 変更規模

- Commit A: 108 ファイル（表記 297 箇所 + 写像 + 再定義）
- Commit B: 約 1600 ファイル（rename 1420 + 修正 165 + RM 8 + 移設注記 37）
- Commit C: 3 ファイル（検出器 + allowlist + C10 前提）

## 残存する旧名（意図的、検査 (e) の allow で宣言）

aidlc-workflows（上流 repo 名）、AI-DLC（ブランド）、AIDLC_*（エンジン環境変数 = v2 機械可読ラベル）、aidlc-docs（上流 legacy 構造名）、parity-map の prefix 側（写像規則の旧名）、歴史的 record 本文の旧 path 言及（移設注記で経緯を明示）。

## 検証（最終、Commit C 後）

| コマンド | 結果 |
|---|---|
| `npm run test:all` | exit 0 |
| `npm run parity:check` | ok（39 skills、199 engine files、b67798c3。例外純増ゼロ） |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .` | pass |
| 同（260706-full-rename 指定） | pass |
| rename-leftovers（検査 (e) 含む） | ok（実ツリー残存ゼロ） |
