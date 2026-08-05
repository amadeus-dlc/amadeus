# Code Summary — fix-1946-received-stamp

上流入力(consumes 全数): requirements.md（FR-2）, code-generation-plan.md

- Bolt branch: `bolt-fix-1946-received-stamp`、base `1043b7e67` から3コミット:
  - `aab904e9f` fix(election): stamp the ballot receipt time and resolve on it
  - `135cf3518` fix(formal-model): move the election model onto the arrival axis
  - `b74e52c49` test(formal-model): follow the revised module identity and line offset

## 検証（builder 報告値の転記、各コマンド自身の exit code）

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0（既存 warning のみ） |
| `bun run build` → `git status --porcelain` | 0 / 意図した変更のみ |
| `bun run source-only:check` | 0 |
| run-model-check（TLC exhaustive、`mise exec java@temurin-26.0.1+8` で束縛） | **0 / `NOT_DETECTED`** |
| `bash tests/run-tests.sh --ci` | **0** — 836 files / 0 failed / 11013 assertions / 0 failed |

- TLC 完了証拠: completion-marker `{"complete": true}`、manifest `"partial": false`、
  `5818173 states generated, 704329 distinct states found, 0 states left on queue`、stderr 0 bytes。
  runId `1f2562a8-8c1f-4574-9441-d6392be61cf1`（出力は worktree 外の新規 out dir）。

## TDD（2スライス + Branch B）

1. model 層: t234 へ2件先行追加 → RED（hijack: `Expected: 8 / Received: 1`、legacy: `Expected: 7 / Received: 1`）
   → `receivedAt` + `receiptAxis` 導入で 30 pass。
2. CLI/store 層: t451 先行追加 → RED（timeline `at` が 2099 のまま）→ 刻印 + 両レーン是正で GREEN。
3. 受け入れ再現（FR-2e）: scratch ストアで原票 2099 + amend GoA8 → **amend が勝ち `hold` / `reason: block`**、
   `render` / `verify` exit 0。歴史的 626 行は遡及修正なし。

## FR-2f — formal-model 整合（Branch B、逸脱停止 → conductor 執行裁定で続行）

- builder は SOURCE_DRIFT（11 files 赤）で正しく停止 → conductor 裁定: FR-2f の逐語事前承認 + Q2=A から
  一意に導かれる**執行**として Branch B 続行を指示（選挙不要 — `cid:requirements-analysis:always-elect` の執行クラス）。
- `FormalElection.tla` の `Later` / `ExpectedResolution` を受理軸の意味論へ改訂（Q2=A / FR-2f 引用コメント付き）。
  `tla-arm.ts` の TS ミラーも同期。
- model-map 更新は正規経路 `amadeus-sensor-model-completeness.ts updateModelMap`（`--impl-only` なし）で実施
  — 書込先が `specs/tla/model-map.json` のみ（audit 非接触）であることを実行前に確認済み。
- **順序の申告**: docs の「再走行 → map 更新」は run-model-check が drift で fail-closed するため実行不能。
  実際は spec 改訂 → map 更新 → TLC 再走行 → green。証拠は改訂後バイトへの TLC 実走行
  （manifest の moduleIdentity が更新後 `e8cc39a9…` と一致）。
- 旧軸のリテラル複製ピン3件を機械的帰結として申告付き改訂（t404:72 / loader:39 の module identity、
  source:220 の行オフセット 269→270）。`fixtures/arm-t/*.patch` は 260720 実験の履歴成果物のため無改変。

## 逸脱・申し送り

- **FR-2c 副作用（conductor 受理済み）**: `at` の受理軸化により production ballot 行で `at === receivedAt` となり、
  record.md の `(受理 …)` 併記（#1262 の遅延可視化）が新規行で発火しなくなる。申告時刻は ballot 本体に保存され
  監査情報の消失なし。裁定 Q2=A の直接帰結として受理。
- t234:399-425 のコメントのみ同期更新（assertion 不変 — 契約変更ではない）。
- 予約番号 t451 を新規 integration テストに使用。
