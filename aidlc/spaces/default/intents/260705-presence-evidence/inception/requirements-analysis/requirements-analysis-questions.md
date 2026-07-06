# Requirements Analysis 質問（260705-presence-evidence）

上流入力: [initiative-brief.md](../../ideation/approval-handoff/initiative-brief.md)、[feasibility-assessment.md](../../ideation/feasibility/feasibility-assessment.md)

Q1 は契約級（#497 確定判断 8 の presence 意味論）のため、ピア協議ではなく leader 経由の人間個別確認で回答する（ディスパッチ指示 3 の auto 例外）。

---

## Q1. docs-only 宣言の evidence 検証に presence 相関を導入しますか？（O1 = 実施候補の採否）

判断材料の突き合わせ:

| 観点 | 候補 1: presence 相関追加 | 候補 2: GATE_APPROVED 限定 | 候補 3: 設計境界の文書化 |
|---|---|---|---|
| 防止効果 | 限定的: HUMAN_TURN が頻発する多体運用では、自動化された呼び出し元が直近の mint に「相乗り」でき、攻撃モデル（evidence 自作）を防ぎ切れない。単独セッションの完全自動運転には効く | 高いが過剰: エンジン遷移のみが emit するため偽装は困難 | なし（防止せず監査 + PR gate で抑止する現行整理の明文化） |
| 成立条件 | mint 規律の拡張（ディスパッチ受信時 mint = #497 判断 8 の変更 = さらに契約級）とのセットが必須（実測 1: 現行規律では最頻 evidence = 承認転記の先行 HUMAN_TURN が存在しない）。時系列は同秒ティアのため秒窓判定（実測 2、誤受理の残余） | ディスパッチ承認転記を evidence にできず現行運用と正面衝突（論点 b、本 Intent 自身が実例）。意味論も「stage 承認 ≠ docs-only 承認」で不適合 | 追加条件なし |
| 運用コスト | 規律拡張の周知 + Cursor 単独利用者の手動 mint 負担（論点 a） | docs 系 Intent の宣言タイミングが最初の gate 後へ後退 | 文書保守のみ |
| 実装 | 可能（ledger 再利用、論点 c）+ parity-map 例外 + eval | 可能（検査 1 行）だが運用が壊れる | 文書のみ |

A. 候補 3 を採用する（推奨）。設計境界（evidence の人間由来性の機械証明は対象外。GUARD_EXEMPTED の必須 audit + 参照 decision の同一 audit 内実在 + merge は人間の PR gate、を防衛線とする整理）を audit-format.md へ明文化する。候補 1 は「防止効果が攻撃モデルに対して限定的（mint 頻発環境では相乗り可能）な割に、契約級の規律拡張・秒窓の緩い意味論・環境差の運用コストが高い」ため不採用、候補 2 は運用衝突と意味論不適合のため不採用、をそれぞれ理由として文書に残す
B. 候補 1 を採用する（mint 規律のディスパッチ受信時拡張とセットで #497 判断 8 を改定し、秒窓相関 + eval を実装する）
C. 候補 2 を採用する（承認転記運用を GATE_APPROVED 参照へ変更する運用改定とセット）
X. Other (please specify)

[Answer]: A（人間の個別承認。承認者 j5ik2o、2026-07-06 08:43 JST、中継 2026-07-05T23:43:45Z 受信。候補 3 採用 = 設計境界の文書化のみ。候補 1 は二重に契約級の変更を要する割に攻撃モデルへの防止効果が限定的、候補 2 は運用衝突 + 意味論不適合でそれぞれ不採用。#497 判断 8 の mint 規律は改定しない。DECISION_RECORDED requirements-analysis として記録済み）
