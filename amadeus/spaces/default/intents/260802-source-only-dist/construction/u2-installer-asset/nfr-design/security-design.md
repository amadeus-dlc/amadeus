# Security Design — u2-installer-asset

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 取得境界

HTTPS必須、hostは`github.com`と`release-assets.githubusercontent.com`を既存allowlistへ明示追加し、redirectごとに再検査する。任意URL、wildcard host、credential埋込みを許可しない。

## 完全性

SHA256SUMSから期待tar名のexact 1行だけをparseし、digest形式を検証してからstreaming照合する。不一致・欠落時は展開前にtyped error。tar path traversal、absolute path、symlink escapeをextractorで拒否する。

## checksum の役割分担(ADR-A9 の再掲)

checksum(SHA256SUMS)は転送破損の検出であり署名ではない。改竄耐性は HTTPS + host allowlist(ADR-A4 の4ホスト)が担う。
