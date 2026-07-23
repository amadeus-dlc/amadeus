# Performance Test Instructions — 260723-marker-heading-exemption

上流入力(consumes 全数): code-generation-plan、code-summary

## 選定判断(cid:build-and-test:c1/c3)

性能テストは **N/A** — 反証可能な根拠: (1) 本修正は承認済み NFR に性能要件を持たない(requirements.md NFR-1〜3 は corpus 安全性・filter 不変・exit code 契約)。(2) 追加コードは suffix 文字列判定1分岐(isMarkerArtifact — endsWith ×2)で、ReDoS 対象の regex 追加もない(cid:regex-linearity-untrusted-input の義務範囲外: 固定様式の短トークン照合)。(3) センサーは advisory の単発 CLI で service SLO を持たない(cid:observability-setup:c3 の区別)。

戦略名だけによる機械追加はしない(cid:build-and-test:c1)。将来、性能 NFR が導入された場合に再評価する。

## 再評価条件

次のいずれかが成立した時点で N/A 判定を再評価し、性能テストの選定をやり直す: (1) requirements/NFR に応答時間・スループット等の数値要件が導入された (2) センサーが単発 CLI から常駐サービス化された (3) 免除述語が regex 化され信頼境界外入力を消費する形になった(cid:regex-linearity-untrusted-input の適用域へ入る)。
