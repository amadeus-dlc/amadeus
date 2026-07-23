# Requirements Analysis 質問(260723-t241-ci-residency)

上流入力(consumes 全数): business-overview、architecture、code-structure。

> 既決照合(質問しない事項): (1) 欠陥事実 = t241:1 の「CI-resident」表明 vs `--ci` の e2e 非実行(run-tests.ts:197-202)— Issue #1294 クロスレビュー2名+RE verbatim 裏取りで確定。 (2) 原因所在 = ADR-6(decisions.md:44「integration テストで固定する」)からの実装逸脱 — #1294 へ転記済み。 (3) リグレッションテスト必須・既存 CI green 維持 — bugfix スコープ既定。 (4) t237 は対象外(「Layer: e2e」正直宣言で矛盾なし — Issue 本文どおり)。
>
> 運用モード: チームモード(AMADEUS_OPERATING_MODE=team 実測)。[Answer] 記入は裁定受領後のみ(E-OC1 3段順序)。
>
> E-OC1 証跡: Q1 はエージェント選挙 E-TCRRAQ1(配信時表記 E-TCRRA1、blind 配布、投票者 e4/e5/e6)で裁定。leader 承認: 2026-07-23T01:18:13Z。[Answer] 記入は裁定受領後に実施。

## Q1. 修正方式はどれにしますか?

Issue #1294 の候補3案の裁定です。RE 実測(scan-notes / re-scans/260723-t241-ci-residency.md)によるトリアージ材料: ADR-6 は integration を明記(= A 案は文書化済み設計への回復)、integration 層には election spawn テスト6本の precedent、spawn 型→medium 判定は integration の size purity 上限(medium)に適合。B 案は e2e 75 ファイル全体を PR CI へ載せるコスト増、C 案は FR-0 の常時証明を弱める仕様後退(ユーザー可視契約の変更 = 採るならユーザーエスカレーション対象)。

- A. t241 を tests/integration/ へ移設する(ADR-6 の指定どおりに実装を回復。ヘッダの layer 表記・coverage registry・run-tests の実行対象は移設に随伴して整合させる)
- B. ci.yml に e2e ジョブを追加する(t241 を e2e に残したまま CI 実行範囲を広げる。PR CI コスト増)
- C. t241 ヘッダの「CI-resident」表明を release-tier 実態へ修正する(最小変更だが FR-0 常時証明が実質不在のまま固定 — 仕様変更としてユーザー裁定が必要)
- X. Other (please specify)

[Answer]: A(E-TCRRAQ1 裁定 3-0、GoA 1x3、留保なし。受容度記録: 全員 B=6、C=7〜8 — e5 は C=8 ブロック級)

## 裁定の記録

- Q1 = A(t241 を tests/integration/ へ移設)。選挙 E-TCRRAQ1(配信時表記 E-TCRRA1): 採用 3-0、GoA 1x3、留保なし。投票者 e4/e5/e6(blind 配布)。受容度記録: 全票 B=6、C=7〜8(e5 は C=8 ブロック級)。leader 承認タイムスタンプ: 2026-07-23T01:18:13Z
- 反映先: requirements.md FR-1(移設+随伴整合)。C 案の仕様変更性は制約節に恒久記録
