# Intent Statement — 260810-swarm-directive-fixes

上流入力（consumes 全数）: なし。本ステージの入力はユーザー指示、[Issue #2833](https://github.com/amadeus-dlc/amadeus/issues/2833)、[Issue #2834](https://github.com/amadeus-dlc/amadeus/issues/2834)、および両 Issue の全コメントである。

## Problem Statement

Amadeus の per-unit Construction directive 発行経路には、成功時の成果物被覆と失敗時の裁定を後続の engine 判断へ忠実に接続できない2種類の欠陥がある。

- **#2834 — per-unit input の無効な解決:** 非 per-unit consumer が per-unit producer の成果物を要求すると、実 Unit ごとの入力ではなく `{unit-name}` を含む利用不能な required `consumes` を受け取る。同根は build-and-test だけでなく計7 stage に存在し、将来 reviewer が付いた場合を含め read scope の無音脱落を招く。
- **#2833 — halt-and-ask 裁定の未接続:** swarm / non-swarm の失敗後に Retry / Skip / Abort を選んでも、engine が Unit 単位の終端裁定を batch 選択へ反映できない。特に Abort 後も同じ `invoke-swarm` が再提示され、autonomous Construction は安全停止へ到達できない。

両者は「per-unit の生産・実行台帳を、非 per-unit の consumer / workflow cursor が正しく投影できない」という共有領域の欠陥である。`cid:intent-capture:c4-2` に従い、追跡 anchor は1 intentに保ち、独立性は Unit と Bolt で表現する。

## Target Customer

- Amadeus workflow の利用者: directive に実在する入力と、選択した停止意味論が忠実に反映される必要がある。
- conductor / builder: 非一時的失敗を再 dispatch せず、安全に retry / skip / abort を確定できる必要がある。
- stage agent / reviewer: 宣言された per-unit 成果物を欠落なく read scope に含める必要がある。
- maintainer / leader: 同根面を閉じる回帰テスト、Bolt 単位のレビュー可能な PR、no-AI-merge 境界を必要とする。

## Success Metrics

1. 非 per-unit で per-unit 成果物を required consume する7 stageすべてで、利用不能な `{unit-name}` パスが発行されない。
2. Unit が複数・0件・一部欠落の各場合に、directive が合意済み契約どおり実在入力を列挙するか、欠落を明示して fail-closed になる。
3. reviewer read scope が directive 上の実在する per-unit input を欠落なく保持する。
4. Retry / Skip / Abort の3裁定に engine-owned 遷移テストがあり、swarm と non-swarm の同根経路を覆う。
5. Abort 後の `next` は同一 Unit の `invoke-swarm` / `run-stage` を再提示せず、未達 stage を成功扱いしない。
6. autonomous Construction の安全停止後、既存 Stop hook が1回で turn 終了を許可し、worktree と failure evidence が保持される。
7. 各挙動変更は TDD の Red→Green で実装され、対象テスト、フル suite、typecheck、lint、build、source-only / distribution 同期検査が green になる。

## Initiative Trigger

2026-08-10 に、両 Issue の独立クロスレビュー2名がすべての中核症状を再現し、leader が `ESTABLISHED_WITH_REFINEMENTS` としてトリアージを確定した。

- [#2833](https://github.com/amadeus-dlc/amadeus/issues/2833): `bug` / `P1` / `S2-CRITICAL`。Codex 固有ではない core 欠陥として確定。
- [#2834](https://github.com/amadeus-dlc/amadeus/issues/2834): `bug` / `P2` / `S3-MAJOR` / `origin:bootstrap`。build-and-test 単独ではなく7 stageの同根欠陥として確定。

## Initial Scope Signal

`self-feature`。#2833 が engine に新しい停止遷移契約を追加するため、ユーザー裁定で確定済み。Intent autonomy は `full` grant 済みである。

## 制約と後続裁定

- #2834 の「全 Unit を N×M へ展開する」形状と、未解決 placeholder を `consumes_absent` から除外する現行明文契約の改訂可否は、実装前に Requirements Analysis で確定する。
- #2833 は Stop hook の変更を要求しない。既存の `parked` 終端許可を活用できる engine 発行側の契約を設計対象とする。
- 実装が承認済み要件・設計から逸脱する必要が生じた場合は、その場で停止して裁定を求める。
- Construction 成果は Bolt ごとに PR を分け、PR 作成後は収束ループを行う。マージはユーザー承認後に leader セッションが実行する。

