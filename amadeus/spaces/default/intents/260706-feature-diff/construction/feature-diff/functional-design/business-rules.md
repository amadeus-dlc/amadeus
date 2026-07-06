# Business Rules — feature-diff

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)。

## 不変規則

1. 全比較行に出典列を埋める（空欄禁止 = NFR-3 チェック①の対象）。
2. 数値・件数・path は転記でなく実測（FR-3.2。作成時に件数コマンドで確認し、必要なら出典に確認方法を添える）。
3. 旧名トークン（aidlc/ 等の検出対象）を持ち込まない。上流名は allow 規則の範囲（aidlc-workflows / awslabs/aidlc）で記載する。
4. #428 のドリフト 8 項目・#552 の設計確定と矛盾する記述をしない（乖離時はそれらの decision が正）。
5. en が正本。ja は意味論一致の対訳（乖離時は en 優先 = language-policy 同期規約）。
6. 変更は docs/amadeus 直下の新規 2 ファイルのみ。
