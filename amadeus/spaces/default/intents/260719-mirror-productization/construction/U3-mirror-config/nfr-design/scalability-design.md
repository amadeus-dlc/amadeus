# Scalability Design — U3-mirror-config

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## SCD-U3-1: 固定3層モデル(SC-U3-2)

解決層はGlobal、Space、Intentの3層に固定し、優先順位は`global → space → intent`の後勝ちとする。層の動的登録、任意階層、マシンローカル層は導入しない。将来の層追加は新しいintentで優先順位と共有境界を再設計する。

## SCD-U3-2: キー追加の単一拡張点(SC-U3-1)

合法キー列挙、パース結果型、default、後勝ちマージを`amadeus-mirror-config.ts`内の同一モジュール境界に置く。キー追加時はこの境界とテスト行列を同時に変更し、読取層ごとの分岐へキー知識を複製しない。

## 容量と分散の扱い

入力は固定3ファイルの小規模JSONであり、ロードバランサ、キュー、シャーディング、水平スケール、AWS資源は適用外である。business-logic-model.mdの8組合せテストにより、層の有無が増えても現行3層の優先規則が決定的であることを固定する。
