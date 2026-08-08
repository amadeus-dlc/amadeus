# Security Design — stage-stats-cli(nfr-design)

上流入力(consumes 全数): business-logic-model(A1 の FS 走査面と A8 の出力面をセキュリティ境界として消費)。performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在 — 代替正本は requirements.md(FR-7a の read-only 契約・C 制約)とする

## 脅威モデル(適用範囲の確定)

単発実行・ローカル完結・read-only の CLI であり、ネットワーク・認証・秘密情報・外部入力(信頼境界外データはリポジトリ内の監査シャード/record のみ)が攻撃面。常駐サービス向けの認可・レート制御・WAF 類は不適用(cid:nfr-design:c1)。

## 設計

- **read-only 構造保証**: fs write API を import しない(FR-7a — 自動テストが import 0 件を機械検査)。audit/state への書込経路が存在しないことを構造で担保(検査は実装ではなくテストが主体)
- **入力の信頼境界**: 監査シャードの行・record の md は「壊れうるデータ」として扱い、parse 失敗は例外でなくバケット計数へ(ADR-6 — 不正入力でのクラッシュ・無限ループを作らない)。regex は固定様式の短トークン照合(`^## Review — Iteration N` 等)に限定し、信頼境界外の不定長入力への新設 regex には線形性を確認する(cid:code-generation:regex-linearity-untrusted-input の適用判断は実装時)
- **出力の情報漏洩**: レポートはステージ slug・モデル名・件数・秒数の集計値のみ。シャードのペイロード(prompt 等)を出力へ echo しない — 集計値限定は情報漏洩面の構造的抑止
- **path traversal**: 走査パスは `spaceRoot` 起点の固定 glob のみで、ユーザー入力からパスを合成しない(`--project-dir`/`--space` はルート選択のみ)
- **秘密情報**: 扱わない(ハードコードなし・環境変数の秘密読取なし)
