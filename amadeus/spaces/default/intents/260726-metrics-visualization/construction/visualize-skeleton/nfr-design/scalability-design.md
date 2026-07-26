# Scalability Design — U1 visualize-skeleton

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

- U1-SCALE-01(有界全量処理)の実現: 入力集合は readdir 時点の全 `.json`(retention が上限保証)。分割・ページングなし(performance-design.md の一括組み立てと同一判断)
- U1-SCALE-02(スキーマ進化吸収)の実現: discoverCollectors/unionValueKeys のデータ駆動(business-logic-model.md 描画ステップ)。コレクタ・キーの増加はコード変更ゼロで表示に反映
- U1-SCALE-03(サイズ余裕の記録)の実現: --write 成功時の stdout 1行に生成バイト数を含める(数値契約は置かない — U2 FR-6 が唯一の上限定義。security-requirements.md/reliability-requirements.md の stderr 契約とは分離した正常系出力)

## 非対象

- 動的スケーリング機構(scalability-requirements.md 非対象、tech-stack-decisions.md の決定的 file 境界方針)
