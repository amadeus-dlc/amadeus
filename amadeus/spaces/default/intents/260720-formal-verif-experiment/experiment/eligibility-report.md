# 適格性レポート — 形式検証 2アーム対照実験(FR-4/5/6/9)

上流入力(consumes 全数): defect-ledger.md, phase2-provenance-receipt.md, walking-skeleton-receipt.md

## 実験条件

- baseline: `b0fa344a0`(欠陥台帳)。欠陥: D1〜D7(D-COUNT=7、crafted 型保存注入)
- Arm T(TLA+/TLC): tla-arm.ts の MODEL_SOURCE 変異 patch(tests/formal-verif/fixtures/arm-t/dN.patch)
  を composed tree に適用 → 実 TLC 1.7.4(OpenJDK 26.0.1、sandbox-exec)で完全探索
- Arm S(ts/fast-check): fixture ブランチ(fv-fixture/dN、欠陥モデルを含む)を checkout し
  arm-s-runner の runArmS を実行(exhaustive core+validation+固定 seed properties)
- freeze provenance: S_FROZEN / MANIFEST_PROMOTABLE(phase2-provenance-receipt.md)

## 検出行列(FR-4 verdict、5 measured run で決定性確認済み)

| subject | Arm T (TLA) | Arm S (ts/PBT) |
| --- | --- | --- |
| HEALTHY_BASELINE | NOT_DETECTED ✅(偽陽性なし) | NOT_DETECTED ✅(偽陽性なし) |
| D1 choice-winner | **DETECTED** | **DETECTED** |
| D2 unknown-choice | **DETECTED** | **DETECTED** |
| D3 received-at | **DETECTED** | **NOT_DETECTED** ❌ |
| D4 invalid-timestamp | **DETECTED** | **NOT_DETECTED** ❌ |
| D5 amend-submission | **DETECTED** | **DETECTED** |
| D6 unknown-ref | **DETECTED** | **NOT_DETECTED** ❌ |
| D7 per-voter-resolution | **DETECTED** | **NOT_DETECTED** ❌ |
| **検出数** | **7 / 7** | **3 / 7** |

- 決定性: 両アームとも 5 measured run で verdict 完全安定(Arm T は counterexample identity も一致、
  環境跨ぎ = Mac Studio + GitHub macos-15 で D4 が同一 identity)
- HARNESS_ERROR: 0 件(Arm T のパーサ誤分類 #1359/#1367 修復後)
- baseline 偽陽性: 両アーム 0 件

## Arm S の見逃し機序(実測で特定)

Arm S の SubjectPort(arm-s-model-subject.ts)は、被検モデル `Ballot.parse`(欠陥あり)の**後段に
独自の再検証**を持つため、モデル欠陥がオラクル側で相殺され見逃す:

- D4(:91-92): `parseSubmittedAt` を arm-S が独立に再実行 → モデルの timestamp 検査欠陥をマスク
- D3 / D6 / D7: arm-S の universe 列挙・property が当該欠陥を励起する状態へ到達しない
 (receipt 軸の late 分類、amend の未存在 ref 受理、per-voter 上書きは arm-S のオラクルが
  独立に正しく再実装しており、被検モデルとの差を観測面へ出さない)

これは「PBT がオラクルを被検実装から独立に再実装するとき、両者が同じ箇所で正しく振る舞うと
欠陥が相殺される」という構造的盲点で、実装バグ由来ではない。TLA+ 側は同一 spec を**単一の形式
モデル**として表現し完全探索するため、この相殺が起きない。

## コスト(FR-5、freeze SHA `167a229c3` で実測)

| 指標 | Arm T | Arm S |
| --- | --- | --- |
| authoring LOC(arm 所有ソース) | 874(tla-arm.ts 単体) | 1073(arm-s-* 5ファイル) |
| 1セル実行時間(中央値) | 初期状態違反 ≈2s / 完全探索(NOT_DETECTED)≈115s | ≈20〜27ms |
| 実行基盤 | JDK 26.0.1 + TLC 取得 + sandbox-exec(macOS 依存、CI 別ジョブ) | Bun のみ(既存 CI に同居) |

## 適格性判定(FR-6、hard 条件)

> hard 条件: 全 D-COUNT 欠陥が DETECTED・HARNESS_ERROR なし・baseline 偽陽性 0。
> 1件でも NOT_DETECTED / HARNESS_ERROR / 偽陽性があれば、その arm を勝者にしない。

| arm | hard 条件 | 適格性 |
| --- | --- | --- |
| **Arm T (TLA+/TLC)** | 7/7 DETECTED・HARNESS_ERROR 0・偽陽性 0 | **適格(PASS)** |
| Arm S (ts/PBT) | **4件 NOT_DETECTED**(D3/D4/D6/D7) | **不適格(FAIL)** |

### 3軸 Pareto(FR-6)

Arm S が hard 条件で脱落するため Pareto は縮退し、**Arm T が唯一の適格 arm**。
検出力(7 vs 3)で Arm T が支配。コスト(LOC/速度)は Arm S 優位だが、hard 条件不成立の arm は
コスト優位に関わらず勝者になれない(FR-6 明文)。

### Alloy 候補の発動条件(FR-7)

本実験は Alloy を第3 arm として起動していない(scope Won't)。記録: 仮に Arm T の完全探索コスト
(≈115s/NOT_DETECTED セル)が実運用で許容不能となり、かつ Arm S の相殺盲点を別手法で補いたい
場合が Alloy 検討の発動条件 — 現時点では未発動。

## 結論(FR-9 再現可能サマリ)

**この欠陥集合(選挙マシンの 7 実欠陥)に対する決定論的判定器として適格なのは TLA+/TLC(Arm T)のみ。**

- Arm S(ts/fast-check)は 3/7 の検出に留まり、hard 適格性で脱落。原因は PBT のオラクル独立再実装
  による欠陥相殺(実装バグでなく手法の構造的性質)
- Arm T は全欠陥を単一形式モデルの完全探索で検出。コストは高い(JDK/TLC 基盤・≈115s/セル)が、
  hard 条件を満たす唯一の arm
- 実運用への含意(裁定対象、本レポートは推奨のみ): 日常 CI は速い Arm S を回しつつ、並行プロトコル
  (選挙・ロック・provenance)の spec 変更時に Arm T を専用ジョブで回す**二層運用**が、検出力と
  コストの Pareto 前線に乗る。ただし「Arm S 単独では 4/7 を恒久的に見逃す」ことを承知の上での配置

## 再現手順

1. baseline `b0fa344a0` を checkout、対象アームの fixture(arm-T patch / fv-fixture ブランチ)を適用
2. Arm T: `bun scripts/formal-verif/run-skeleton-ci.ts <out>`(patch を D_N に差し替え)
   Arm S: fixture ブランチで `runArmS(healthyBaselineSubject())`
3. verdict を本行列と照合。決定性は 5 run 反復で確認
