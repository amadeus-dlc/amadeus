# Reliability Design — solo-election-core (U1)

上流入力(consumes 全数): performance-requirements.md(U1-PERF)、security-requirements.md(U1-SEC)、scalability-requirements.md(U1-SCALE)、reliability-requirements.md(U1-REL)、tech-stack-decisions.md(層配置・形式検証の決定)、business-logic-model.md(tally 2体分岐・TLA 対応の設計正本)。

## 設計

- U1-REL-01(15組合せ): t234 追加は代表7通り+3体境界({5,1,1} で discussion hold 非発火等)を1ケース1アサートで配置。
- U1-REL-02(落ちる実証): Bolt 1 手順どおり「現行 tally で {5,1}/{4,1}/{1,7} が established になる」テストを先にコミットし red を確認 → 実装 → 期待値を hold へ反転して green。実証の記録は PR 本文+テストコメント(コミット順)で残す。
- U1-REL-03(TLC 完走): FormalElection.tla の Voters を 2値/3値の両インスタンスで探索し、完走ログ(states generated / distinct states / no errors)を build-and-test 成果物へ転記。部分探索・timeout は HARNESS_ERROR。
- U1-REL-04(実選挙実証): スケルトン実選挙のトピックは **Bolt 1 自身の §13 学習選定**(発動3類型の一つで、Bolt 1 完了時に必ず実在する実裁定 — Bolt 2 への依存なし)とし、本番 elections store へ record する(genuine な裁定なので監査を汚さない)。1-1 分岐が実選挙で自然に発生しない場合は、**fixture 選挙**で再現する: 実 CLI 指令ループ(open→notify→vote→tally)を完走させ(state 直書き禁止 — C-02/検証劇場回避)、`--project` フラグで scratch ディレクトリの隔離ストアへ向ける(本番 elections store を contrived 票で汚さない — cid:requirements-analysis:scratch-script-discipline の project-root override)。両分岐の record(本番1件+隔離1件)を build-and-test 成果物へ転記。

## 障害設計

tally の障害モードは parse 拒否と hold 縮退のみ(リトライ・フォールバック新設なし — org.md Forbidden 遵守)。
