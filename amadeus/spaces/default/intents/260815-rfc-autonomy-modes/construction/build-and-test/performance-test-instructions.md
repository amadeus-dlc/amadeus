# 性能テスト手順 — intent 260815-rfc-autonomy-modes

## 上流入力

- `code-generation-plan`(13 unit 分): `<record>/construction/<unit>/code-generation/code-generation-plan.md`
- `code-summary`(13 unit 分): `<record>/construction/<unit>/code-generation/code-summary.md`


## 判定: 適用可能な性能 NFR は存在しない(N/A)

本 intent の要件成果物には、**合否を決める数値目標を持つ性能 NFR が宣言されていない**。

## 根拠(実測)

`<record>/inception/requirements-analysis/requirements.md` の `## Non-Functional Requirements` 節(:73-79)は次の 5 項目のみで構成され、いずれも数値目標を持たない。

1. TDD 必須(Red 実測 → 最小実装 → Green の vertical slice)
2. fail-closed 保存(新分岐は無音バイパス・環境変数逃げ道を作らない)
3. 後方互換レイヤー禁止(旧 `solo-election.trigger.mode` は loud fail で置換)
4. harness 移植性(対話検出は既存 HUMAN_TURN パイプライン再利用)
5. 監査・attestation の append-only / 非偽装

`## Constraints` / `## Assumptions` / `## Open Questions` にも数値の性能目標はない。`nfr-requirements`(3.2)はスコープ設定で SKIP されており、追加の性能 NFR 面も存在しない。

## この判定に基づく措置

`cid:build-and-test:c2-no-test-theatre-for-absent-nfr` と `cid:build-and-test:c1-build3029` に従い、**目標なきベンチマークを発明しない**。体裁のための性能テスト実体は作成しない。

## 将来この判定を覆す条件

次のいずれかが成立したら、本判定は無効になり性能テストの生成が必要になる。

- requirements / NFR に、時間・スループット・メモリのいずれかについて**数値の閾値**を持つ受け入れ基準が追加される。
- 本 intent が導入した経路(推薦梯子・waiting terminal・completion report 集計)に、実運用で観測された遅延の Issue が起票され、その Issue が数値目標を確定させる。

なお本 intent が触れた `amadeus-completion-report.ts` は AUTO_DECIDED 監査行と production auto-decision リストを最終ページまで走査するため件数線形の走査を持つが、要件側に上限値の宣言がないためベンチマークの合否基準を構成できない。長い本番タイムアウトを持つ性能要件が将来宣言された場合は、実時間の負荷試験ではなく同じ制御経路を通る短縮可能なタイミングシームとカウンタ検証で構成する(`cid:build-and-test:bt-timeout-verification-shape`)。
