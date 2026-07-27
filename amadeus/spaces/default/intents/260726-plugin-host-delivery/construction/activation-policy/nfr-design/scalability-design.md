# スケーラビリティ設計 — U6 activation-policy

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## N/A 継承(常駐スケール)

scalability-requirements「常駐 service 向けパターンの非適用」のとおり、単発判定(business-logic-model の常駐なし前提)に稼働体は存在せず、水平スケール・オートスケール等は **N/A を継承** する(performance-requirements の非常駐前提と同根)。常駐 watcher・スケジューラは導入しない。

## 線形性の設計境界(少数・小規模固定)

scalability-requirements「spec ファイル集合の規模と線形性」のとおり、computeSpecHash はファイル数・総バイト数に線形な 1 パス計算(performance-design の最小構成)であり、対象は現行実測 3 ファイル・24K(測定 ref `7bce53dc6`)。A-3 の少数前提のもと、次を意図的な設計境界とする:

- 数百 KB 超級への線形性実測・ストリーミングハッシュ・分割計算は **対象外**(固定様式・小規模 spec の照合という要件性質に対する過剰設計)
- glob 展開結果の件数上限・ページングを設けない。集合の無制限増大は本 intent の非目標であり、増大時の扱いは将来 intent の判断に委ねる(本設計側に予防機構を先行着地させない)

## 0-plugin ゼロ影響という下限境界

scalability-requirements「0-plugin ゼロ影響という下限境界」の合否(0-plugin baseline での next 出力 byte 同一)を、performance-design の分岐順(最初の分岐 = composition record の formal-model-check 存在確認 → 不在なら即 return)で構造的に担保する。この分岐は security-requirements の stdout 純度(security-design の挿入点設計)とも連動し、0-plugin 時は stderr にも一切出力しない(挙動・出力とも現行と byte 同一 — BR-U6-4)。reliability-requirements の 0-plugin 合否を固定する reliability-design の byte 同一比較テストが実測面を担う。
