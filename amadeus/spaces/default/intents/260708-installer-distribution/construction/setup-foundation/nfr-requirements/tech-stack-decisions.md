# Tech Stack Decisions — setup-foundation

> ステージ: nfr-requirements (3.2) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: ADR-002/003、build-vs-buy、NFR-005、codekb `technology-stack.md`

| 領域 | 決定 | 根拠 |
|------|------|------|
| 言語/ランタイム | TypeScript、実行は Node ≥18 / bun 両対応のビルド済み JS | FR-002、ADR-002 |
| ビルド | `bun build --target=node --format=esm` 単一バンドル | ADR-002(既存 bun ツールチェーンのみ) |
| HTTP | ランタイム標準 `fetch`(Node 18+/bun 双方で利用可) | 依存ゼロ(NFR-005)。node:https 直接使用より簡潔 |
| tar.gz 展開 | ランタイム標準(node:zlib gunzip)+ **tar パーサは自作最小実装**(PAX/GNU の必要最小サブセット) | 依存ゼロ方針(build-vs-buy)。SEC-F01 の経路検証を自作層で確実に実施 |
| ハッシュ | `node:crypto` の md5 | FR-008 契約(bun 互換確認済みの標準 API) |
| JSON スキーマ検証 | 手書きの Result パーサ(Manifest.parse) | 依存ゼロ。スキーマは FR-016 で固定済みの小規模構造 |
| テスト | 既存 bun:test + tests/run-tests.sh 4層 | 再利用棚卸し(新規ランナー禁止) |

- tar 自作の妥当性メモ: 読み取り専用・codeload 生成物(ustar 準拠)に限定した最小実装。汎用 tar 互換は非目標(スコープ外と明記)。fixture に codeload 実物のアーカイブを用いて互換性を検証する
