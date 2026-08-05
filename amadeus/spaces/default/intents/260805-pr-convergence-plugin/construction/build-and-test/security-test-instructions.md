# Security Test Instructions: pr-convergence plugin

上流入力(consumes 全数): code-generation-plan、code-summary(各 unit)

## 対象変更のセキュリティ検証(security-design U1/U2/U3 の脅威表へ trace)

| 脅威(設計出典) | 検証 | 実測 |
|---|---|---|
| credential 漏洩(U2 4契約 (iii)) | GhError の stderr digest 化・token 非保持を t448 assertion で固定 | green |
| シェルインジェクション(4契約 (ii)) | argv 配列のみ・シェル文字列連結不在を t448 で固定 | green |
| 無音バイパス(FR-7b) | HUMAN_TURN 不在拒否/converged:true 拒否/emit 先行 loud fail を t448 で固定 | green |
| 台帳への機微混入 | bodyDigest 化(severity/terminalRefs 抽出後に本文破棄)を t447 で固定 | green |
| ステージファイル破損(U1) | byte-identity 往復+roundtrip-mismatch 非書込を t444/t445 で固定 | green |
| import 閉包外混入(U3) | `assertPluginImportClosure` を build が検査(write-0 拒否) | build exit 0 |
| trust 3層迂回 | plugin stage バイト無変更(BR-U1-11)・O_NOFOLLOW 対象外の分離を設計固定、t449 の compile 経路が UNKNOWN_SENSOR throw を実証 | green |
| レポート様式偽装 | C8 センサー11 赤ケース(t450) | green |

## リポジトリ全体の依存監査(対象変更と別判定 — c1-doctor-seam)

新規 runtime 依存の追加なし(bun-only 前提不変)。既存依存の監査は本 intent のスコープ外(変更が依存を触っていない)。
