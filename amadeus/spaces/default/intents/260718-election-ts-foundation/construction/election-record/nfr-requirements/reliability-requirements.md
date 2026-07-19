# Reliability Requirements — election-record(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 互換性保証(NFR-4 — 本ユニットの中核 NFR)

- renderGoaLine の出力は実 parseGoaLine(norm-metrics.ts:688)で round-trip parse 可能な byte 互換を保つ(requirements.md FR-5a/NFR-4、business-rules.md BR-R1 — 全8値常時出力・内部0 bin・複節コード reject の3 fixture はレビュー裁定済み)
- parseGoaLine/parsePmCidLine のスキーマ変更を要求しない(requirements.md NFR-4)。互換検証は実関数の in-process import による round-trip テストで行う(シミュレーションでの代替禁止 — 検証劇場 Forbidden)

## 障害耐性と自己検査

- fallible API は `Result<T, E>` で throw しない(判別ユニオン Result 既決)。GoaLineCode 構築失敗・照合不一致は理由付き reject(business-logic-model.md)
- verifySelf は自己の生成物への常時 self-check(requirements.md FR-6b — 票数不一致・度数再計算不一致・時系列逆行の3クラス、business-rules.md BR-R4 の落ちる実証付き)。生成と検査の対称性(symmetric-pair-review — render⇔verify)を構造で持つ
- 可用性 SLO・バックアップは N/A(反証可能な根拠: 永続と耐障害性は U2 store の責務 — unit-of-work 境界。U3 は変換と検査のみ)。ランタイム障害面は既存スタック(technology-stack.md)のうち Bun/TS 言語ランタイムのみに閉じる
