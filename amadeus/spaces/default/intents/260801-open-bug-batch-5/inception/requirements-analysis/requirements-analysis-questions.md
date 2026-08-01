# Requirements Analysis 質問記録 — 260801-open-bug-batch-5

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

- Q1 の3択(A: state 再構築 / B: single マーカー / A+B)は `architecture.md` 現在節のクラスタ(2) engine/state が示す report/next 非対称と、`code-structure.md` 現在節の患部配置(amadeus-orchestrate.ts / amadeus-utility.ts / amadeus-lib.ts)から構成した。
- Q2 の停止/縮退の2択は `architecture.md` 現在節のクラスタ(3) OTel(fatal-latch の emit 経路不参照)から構成した。
- 諮問の優先順位(P1 → P2)は `business-overview.md` 現在節の利用者影響の序列に従い、両問とも P2 帯(Bolt 2 / Bolt 3)の要件確定を塞ぐ裁定として同時に諮った。

E-OC1 判定: 本ファイルの2問はいずれも仕様・設計方式の裁定であり、ソロモードでは仕様裁定はユーザー専権(エスカレーション正準リスト(4)・auto-solo-election の対象外)のため選挙を実施せず、AskUserQuestion によるユーザー直接裁定で回答を確定した。記入は裁定受領後(cid:code-generation:election-answer-after-ruling)。
ユーザー承認: 2026-08-01T01:45:00Z

## Q1: #1849 の修正方式(機序裁定)

クロスレビューで機序の枠組みが割れた(r1「report の checkbox ガードは設計どおり — 真の欠陥は単発 directive の single マーカー欠如」vs r2「compose が既存 intent の state を再構築しない欠陥」。事実認定は一致)。修正方式を A: compose 時 state 再構築 / B: 単発 directive の single マーカー / A+B の3択で諮問。

[Answer] A: compose 時 state 再構築を採用する。compose/recompose が既存 intent の Stage Progress を graph と整合させる(scope-change の再構築ロジック `amadeus-utility.ts:5178-5218` を再利用、Total Stages / Stages to Execute の再計算込み、終端 record 除外 `amadeus-utility.ts:5316-5330` 準拠、クロスホスト(plugin を持たないホストで birth した intent)対応)。ユーザー承認: 2026-08-01T01:45:00Z

## Q2: #1856 の latch 発火後 emit 意味論(仕様裁定)

fatal-latch が emit 経路で不参照の部分配線に対し、latch 発火後の emit を停止(fail-closed)するか縮退継続(可観測性優先)するかを諮問。

[Answer] emit 停止(fail-closed)を採用する。latch 発火後は logger-provider の emit を drop し、壊れたストアへの書き継ぎを遮断する(latch の設計意図に忠実)。ユーザー承認: 2026-08-01T01:45:00Z
