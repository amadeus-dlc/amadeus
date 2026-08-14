# Security Test Instructions — 260814-ambient-error-sink

## 判定: 適用可能な NFR が存在しない(N/A)

セキュリティ NFR は宣言されていない。本修正はむしろ防御面の強化(未宣言 projectDir の fail-closed 化)であり、認可境界の変更を含まない(Mandated の認可変更テスト要件は非該当 — 認可判定 `refuseUnauthorizedKimiCaller` の順序は拒否ガードの後段に不変のまま)。credential・入力検証面への接触なし(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

## devsecops 観点の確認(実施済み)

- 拒否メッセージに機密・マシン固有パスの漏出なし(定数文字列のみ)
- fail-closed 方向の変更であり、拒否の緩和・バイパスを含まない
