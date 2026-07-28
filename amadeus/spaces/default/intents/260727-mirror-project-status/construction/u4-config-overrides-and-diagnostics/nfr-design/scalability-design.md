# Scalability Design — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

scalability-requirements の線形規模モデルを、固定層数と per-Project 直線手順で実現する。水平スケーリング・キャッシュ・動的層は非適用(scalability-requirements — cid:nfr-design:c1)。

## 設定の規模構造

- `mirror-projects` 配列は要素数に線形の parse コスト(business-logic-model の4面一般化)— 前提 A-2 により実用上有界(scalability-requirements)。層数は既存3層固定で、層解決の意味論(有効値を持つ最後の層が勝つ全置換)は規模に依存しない。

## 診断の規模構造

- Project 診断列の生成は per-Project の直線手順(business-logic-model 手順3)× N の線形(scalability-requirements)。台帳由来の部分成功検出も entry 数に線形(performance-requirements の追加コストなし構造)。
- 出力の規模も線形 — 診断出力は識別子・ラベル列のみ(security-requirements の秘匿契約)で、availableOptions は option-missing の Project にのみ付く(business-logic-model 手順3)。

## 成長時の不変性

- N・設定要素数が増えても、分類の意味論(resolution 4値)・層解決・read-only 保証(reliability-requirements の無害性)は不変 — 規模は線形コスト増としてのみ現れる(tech-stack-decisions の新機構ゼロ決定と整合)。
