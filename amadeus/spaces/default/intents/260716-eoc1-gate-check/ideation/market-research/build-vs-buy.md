# Build vs Buy — eoc1-gate-check

## 上流入力(consumes 全数)

intent-statement.md、前 intent 260708 の build-vs-buy(ユーザー確定: 完全自作、bun/TS、ランタイム依存ゼロ)。

## 判定: 前 intent 決定を継承(変更なし)

本 intent は既存自作エンジン(amadeus-state.ts)への検査述語1機構の追加であり、build-vs-buy の意思決定は発生しない — E-OC1 は本フレームワーク固有の手順であり外部製品に「買う」対象が存在しない(閉じた自作ガード面)。
