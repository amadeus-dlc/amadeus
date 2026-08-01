# Code Summary — u7-mirror-model

上流入力(consumes 全数): unit-of-work, functional-design, nfr-design, bolt-plan

## 実装結果(bolt-u7-mirror-model ブランチ、conductor へ --no-ff マージ済み `0007167bc`)

### Phase A(コミット acaf502fd)
- specs/tla/MirrorLifecycleCore.tla(648 行 — 状態変数・**14 遷移**・invariant 2 本・縮約申告全数)+AsIntended/AsImplemented 2 変種(共有 Core を INSTANCE...WITH で定数差替 — 二重管理回避)+MirrorLifecycleVacuity.cfg。
- **TLC 実測**: AsIntended = 完全探索完走(**208,628 generated / 89,099 distinct / 0 left on queue / depth 18 / No error** — 固定点到達、finite-exploration-not-detected-proof 充足)。AsImplemented = **NoDuplicateCreate 違反の反例トレース実出力**(#1838 の忠実写像、FR-C3 AC (ii))。Vacuity = CloseUnreachable 違反(close 到達性の実証 = invariant 非空文)。
- 工程文書: docs/reference/21-formal-model-following(.ja).md+22-formal-model-supply(.ja).md+索引・plugin README 参照。

### Phase B(コミット 73fd9e0bc / 76998d8d4 / 5eb3fa745)
- **model-map v2**: `{schemaVersion: 2, models: []}` — v1 読取互換なし(loud 拒否)。FormalElection は models[0] へ**バイト同一移行**(I4 — model/cfg/entries 全一致を JSON 比較で実測、frozen receipt identity 不変)。
- **MirrorLifecycle 登録**(models[1]): impl ピン 4 ファイル(coordinator 51cd686a… / project-reconciliation-reducer f9efa901… / state-reducer 2e189dc5… / types c8516b38… — #1876 修正済み断面)。AsImplemented は未登録(テストで不在 assert)。
- sensor matches glob へ `amadeus-mirror-*.ts` 追加(登録 13 ファイル全数照合 MISS 0)。
- テスト: t-formal-verif-model-map-v2.test.ts(20)+t-formal-verif-mirror-model-registration.integration.test.ts(5)— TDD Red 実測済み。SOURCE_DRIFT 落ちる実証(1 バイト追記 → 検出)を非実行モデル+4 実装ファイルで全数実測。
- FD T2 の repair-link 除外根拠を実測是正(:690 が正 — fix-diff-independent-reverify で .tla コメントも同時是正、TLC 再実測で統計完全一致)。
- **I5**: mirror 実装 4 ファイルは無変更(git diff 空で実測)。

## 検証(builder 実測+conductor マージ後)

typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci = 全 exit 0(RESULT: PASS)。push 前 lcov patch 未カバー **0**。swarm check converged ✓ tampered=false。

## 切り出し(ユーザー裁定・案1)

- TLC run/verify の複数モデル化 → enhancement Issue 起票(FormalElection 固定 6 ファイル+テスト 25 の実測列挙付き)。
- MirrorLifecycleCore.tla の identity 未ピン(EXTENDS 先が drift 監視外)→ bug Issue 起票(P2/S3)。
