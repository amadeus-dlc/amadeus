# Scalability Design — election-store(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 選挙 ID 分離設計

- 全ファイルが `elections/<選挙ID>/` 配下に閉じる(business-logic-model.md レイアウト — scalability-requirements.md の容量計画 N/A の構造根拠)。選挙間共有の可変ファイルなし
- 一覧走査 API を設けない(scalability-requirements.md — 現要件に存在しない。将来必要になれば実装前停止→裁定)

## 単一書込主体の設計反映

- ロック・リトライ機構なし(scalability-requirements.md 同時実行節+reliability-requirements.md の torn-write 防止は tmp+rename が担う)。書込 API は同期(sync)呼び出しで完結し、並行性の抽象(queue/mutex)を導入しない — performance-requirements.md の小規模前提と tech-stack-decisions.md のロック不採用判断の設計化。security-requirements.md の書込境界(conductor のみ)と一体
