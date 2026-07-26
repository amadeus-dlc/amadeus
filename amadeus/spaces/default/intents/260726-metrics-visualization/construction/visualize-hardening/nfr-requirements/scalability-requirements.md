# Scalability Requirements — U2 visualize-hardening

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## スケーラビリティ要件

- U2-SCALE-01: サイズガード MAX_HTML_BYTES(business-logic-model.md 増分3、requirements.md FR-6)が肥大の上限を明示 — retention 定数の将来変更にも導出式(16_384 × KEEP_LAST × 2)で自動追随
- U2-SCALE-02: 強調判定表(business-rules.md ルール13)は固定列挙 — コレクタ追加時は非強調で表示のみ自動追随し、強調対象の拡張は明示変更(無音の判定拡大をしない)

## 非対象

- ガード閾値の動的調整・設定ファイル化 — named constant+導出式で十分(technology-stack.md の決定的 file 境界方針)
