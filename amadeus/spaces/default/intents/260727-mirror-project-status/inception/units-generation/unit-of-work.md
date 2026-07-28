# Unit of Work — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

Unit は「単独で deployable な Bolt(=1 PR)」の境界で切る(units-generation:c1)。分割の導出元: requirements の FR 群と decisions の ADR-1〜5、components の9モジュール割付、component-methods の関数シグネチャ(U1 の gateway 4メソッド・policy 3引数関数・NFR-3 per-Project 上限)、services のプロセス境界と認証要件(U5 のドキュメント面)。**最初の Unit が walking skeleton**(risk-first — scope-document Q2 裁定)。

規模概算の規約: 予算の権威は decisions の総計(正本 約 +1,080 / テスト 約 +1,400 行 — 点推定)。以下の Unit 別レンジは按分に各 Unit 独立の保守上限を乗せたもので、**上限側の総和(正本 1,230〜1,520 / テスト 1,400〜1,800)は意図的に総計を上回る**(全 Unit が同時に上限へ振れる想定はしない)。実績が decisions 総計を超過する見込みになった時点で decisions の見積りを更新する(黙って超過しない)。

## U1: project-sync-skeleton(walking skeleton)

- **内容**: 単一の設定済み Project・既定マッピングでの最小 end-to-end — `mirror-projects` config の最小 parse(ADR-2 の単一要素)/ gateway の GraphQL argv 族+body errors 解釈+4メソッド(ADR-4)/ policy の既定マッピング定数+`expectedProjectStatus`(ADR-5)/ executor 内部ステップの直線経路(所属照会 → 未所属なら追加 → Status 解決(exact match)→ 適用)(ADR-1)/ `projectSync` 台帳の最小形(ADR-3、synced のみ)/ safety-blocked の観測(選択肢未解決 → 当該 Project skip+診断ログ)。
- **担う FR / 受入条件**: FR-1a/1b, FR-2, FR-3a/3b/3e, FR-6a/6b(最小), FR-11 — 受入条件 1, 2, 10(部分), 13, 14, 18。
- **検証**: R-3(add/update 両 mutation)の実 Project での成立+落ちる実証。テストは fake runner の GraphQL envelope golden(od -c capture)+FakeGateway 系4箇所の interface 追従+t280 手動確認。
- **規模概算**: 正本 +450〜550 行 / テスト +500〜600 行。
- **Deployable 価値**: この Unit 単独で「本 intent の mirror Issue が Project #5 に追加され Ideation が付く」実利が出荷される。

## U2: state-reconcile-hardening

- **内容**: 失敗・再試行セマンティクスの完全化 — pending / safety-blocked の reducer transitions(3種)と冪等 reconcile(FR-7a/7b)/ 複数 Project の独立同期と per-Project receipt の完全形(FR-3f, FR-7c)/ 部分成功の failure injection テスト / per-Project 呼び出し回数上限(照会1+mutation≤2)の assert(NFR-3)。
- **担う FR / 受入条件**: FR-3f, FR-7 全補, FR-6b(完全)— 受入条件 6, 10, 11。
- **規模概算**: 正本 +250〜300 行 / テスト +350〜450 行。
- **Deployable 価値**: 一時障害・複数 Project 環境でも収束保証が成立(成功指標の「drift 0」の頑健化)。

## U3: lifecycle-integration

- **内容**: create/sync/close チェーンと phase boundary の遷移同期(INCEPTION/CONSTRUCTION/OPERATION — FR-3d)/ parked 維持の二重判定(FR-4)/ completion ゲート: 全同期対象 Done 後にのみ close(FR-8、`completionProjectGate`)/ prompt モード ask 文言への Project 面要約の内包(FR-10a)。
- **担う FR / 受入条件**: FR-3c/3d, FR-4, FR-8, FR-10a — 受入条件 3, 4, 5, 7, 8, 10(close 阻止面 — FR-8b。検出は U1、収束は U2 と分担)。
- **規模概算**: 正本 +180〜220 行 / テスト +250〜350 行。
- **Deployable 価値**: フェーズ遷移がボードへ自動反映され、close 阻止の安全性が成立。

## U4: config-overrides-and-diagnostics

- **内容**: `mirror-projects` の完全形(複数 Project・`status-names` 上書き・層全置換・unknown key/phase 拒否の4面一般化 — FR-5)/ repair status の Project 診断拡張(drift / 選択肢未解決+実在選択肢一覧 / 権限不足 / 部分成功 — FR-9、read-only negative assert)。
- **担う FR / 受入条件**: FR-5, FR-6c, FR-9, FR-10b(診断面)— 受入条件 9, 12。
- **規模概算**: 正本 +200〜250 行 / テスト +300〜400 行。
- **Deployable 価値**: 選択肢名の異なる実環境での運用と、乖離の常時可視化が成立。

## U5: docs-and-distribution

- **内容**: 認証要件(`project` scope — services の認証節)と設定・運用手順の docs 4文書追記+TOPICS/USER_CONTRACT/t291 parity 同期(FR-10b/FR-12b)/ 7ハーネス dist+self-install 再生成と drift guard(FR-12b)/ テスト完備の検収(FR-12a/12c — 各 Unit で並行作成したテストの全体 green と coverage ゲート)。プロセス境界の記述(services の gh subprocess・外部依存表)を docs の運用節へ反映する。
- **担う FR / 受入条件**: FR-10b, FR-12 — 受入条件 15, 16, 17。
- **規模概算**: 正本(docs・契約)+150〜200 行 / 生成物再生成は機械的。
- **Deployable 価値**: 配布先利用者が自走できる状態(ドキュメント+配布同期)で intent が完結。

## 分割の不変条件

- 各 Unit は単独 PR で main へスカッシュマージ可能(org.md Way of Working)。
- U1 は単独ゲート(walking skeleton)— 承認前に U2 以降を着地させない。
- テストは各 Unit のコードと並行して作成(org.md Testing Posture)— U5 の「検収」は完備確認であり後追い作成ではない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T06:57:06Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の4是正(Bolt 編成先取り除去・受入条件10 の U3 帰属・規模概算規約・consumes 実参照化)が全て verbatim 反映され有効、18項目×Unit 全数写像も両ファイル一致で新規矛盾なし

### Findings

- None
