# Requirements Analysis 質問記録 — 260801-tla-multi-model

上流入力(consumes 全数): codekb `architecture.md` / `code-structure.md` / `code-quality-assessment.md` / `technology-stack.md` / `business-overview.md` / `dependencies.md`(RE 現在節)、`../../ideation/approval-handoff/initiative-brief.md`、`../../ideation/approval-handoff/decision-log.md`

E-OC1 判定: 本ファイルの2問は設計方式の裁定であり、ソロモードではユーザー専権のため選挙を実施せず、AskUserQuestion によるユーザー直接裁定で回答を確定した。記入は裁定受領後(cid:code-generation:election-answer-after-ruling)。
ユーザー承認: 2026-08-01T16:25:00Z

## Q1: 補助モジュール(aux)の identity 算法

既存は model/cfg = domain 付き canonical identity、entries = 生素 sha256 の2系統(RE 実測)。aux 配列にどちらを適用するか。

- A. domain 付き canonical identity(model/cfg と同型、`amadeus.formal-verif.tla.module.v1` ドメイン) — .tla 資産として同じ扱いで一貫
- B. 生素 sha256(entries と同型) — 計算が単純で updateModelMap 再計測と整合
- X. Other (please specify)

[Answer]: A. domain 付き canonical identity

## Q2: 宣言不一致(推移解決結果 ≠ 宣言集合)をどこで赤にするか

Q2=C 併用案の検出ポイント。

- A. loader 検証時に赤(production load 経路で fail-closed) + sensor check でも赤 — 二重の歯止め。loader は常に推移解決を走らせる
- B. sensor check / updateModelMap 時のみ赤 — loader は宣言のみ信頼し実行コストを抑える
- X. Other (please specify)

[Answer]: A. loader 検証時に赤 + sensor check でも赤(二重)
