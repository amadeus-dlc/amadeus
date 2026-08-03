# 再スキャン記録 — 260801-silent-drop-gate

## スキャンメタデータ

- 実施日: `2026-08-02`
- Repository: `amadeus`
- Base: `861688c31fd08cc0068318d71b0d5c5a87153b57`
- Observed: `d72f60b5a81fc6e45f99431d61b6561e91b2fc37`
- Distance: `54 commits`
- 方式: Brownfield 増分再スキャン
- Source: `/tmp/amadeus-re-scan-wdyCU8/repo` の detached observed revision（読取専用）
- Authored roots: `packages/framework/core/`、`packages/framework/harness/`、`scripts/`
- 除外: `dist/`、ルートの生成投影、`tests/` の fixture

## 今回の増分

本 intent の焦点は Issue #1979 の no-silent-drop static gate である。base から observed の54 commitsには [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の commit `deb7b91f3` が含まれる。したがって #1963 の state resync 修正は現行断面に存在し、今回の実装対象から外して回帰契約として扱う。

observed では ast-grep の依存・設定は `package.json`、`bun.lock`、`scripts/`、`packages/framework/`、`.github/` に存在しない。導入は新規依存となる。

## 観測事実

### 既存の静的 gate パターン

- `tests/callsite-guard.ts:1-36` は deterministic census と shrink-only allowlist の目的・CLI を定義する。
- 同 `:59-67` は scan roots と allowlist path、`:115-149` は detection と census、`:165-205` は増加拒否・減少許可の判定を分離する。
- `tests/complexity-gate.ts:12-24` は外部測定失敗、baseline 欠落・不正を fail-closed にする。
- 同 `:53-69` は root、baseline、tool command の注入 seam を持つ。
- `.github/workflows/ci.yml:93-143` の `lint` job は Biome、callsite guard、deletion gate、complexity gate を直列実行する。

### Shape 1 — 空またはログだけで終了する catch

authored roots には intentional best-effort、advisory、cleanup、fail-open の catch が混在する。文字列検索では意味を区別できないため、catch body が空、または logger／stderr／console 呼出しだけで終了し、throw、型付き failure return、state latch、durable write を持たない node を AST で分類する必要がある。

intentional drop の免除は `intentional-drop: <非空理由>` を catch node に隣接させ、1 AST node のみに作用させる。ファイル単位・行範囲単位の免除は、後から追加された別 catch を巻き込むため不可。

### Shape 2 — emit／Result の戻り値破棄

対象は非 `void` の既知 API が expression statement として捨てられる形。名前が `emit*` というだけでは `void` 通知 API を誤検出するため、型情報または明示 registry で対象 vocabulary を管理する必要がある。

#1878 の実 callsite は `packages/framework/core/tools/amadeus-mirror-executor.ts:171-201` の `persistBlocked`。`applyTransition` は `:77-129` で `StateResult` を返すが、`:188-196` の呼出結果は破棄され、`:197-201` で常に `safety-blocked` が返る。永続化失敗が利用者可視 outcome に反映されない。

既存の loud-failure 先例は `packages/framework/core/tools/amadeus-audit.ts:769-792` と `:983-1056`。canonical emit の `appended:false` を検査し、処理続行ではなく exit 1 へ昇格する。`tests/integration/t404-bolt-emit-audit-fatal-latch.test.ts:4-23` も非 throwing drop を消費する契約を固定する。

### Shape 3 — 永続化を伴わない偽成功

#1874 の実体は `packages/framework/core/tools/amadeus-lib.ts:5399-5429`。`setCheckbox` と `setStageSuffix` は bare `String.replace` の非一致を確認せず、slug 不在でも入力をそのまま返す。

- `tests/unit/t108.test.ts:207-232` は `setCheckbox` の absent slug を no-op / no-throw として固定する。
- `tests/unit/t400-lib-record-path-and-field-helpers.test.ts:108-113` は `setStageSuffix` の absent stage を無変更として固定する。
- caller は `amadeus-jump.ts`、`amadeus-utility.ts`、`amadeus-state.ts` に分布するため、helper 単体を無条件 throwing API にするだけでは破壊範囲が広い。

設計上は `changed | not-found` の Result、または state mutation 境界の strict wrapper により不在を表現し、mutation caller が必ず消費する必要がある。既存 absent-slug テストは loud failure 期待へ改訂し、失敗時の state bytes 不変を確認する。

### #1963 の回帰契約

- `packages/framework/core/tools/amadeus-lib.ts:5476-5493` は Stage Progress の抽出と置換で regex を共有する。
- 同 `:5591-5650` は置換後の section を再抽出し、挿入対象 slug が実在しなければ `section-unrecognized` を返して書込みを止める。
- `packages/framework/core/tools/amadeus-plugin.ts:428-452` は invalid graph を `StateResyncRun` の first-class outcome とし、空配列による偽成功と区別する。
- `tests/integration/t407-resync-noop-detection.test.ts:97-168` は malformed／trailing section、decoy checkbox、happy pathを検証し、`:170-212` は compose と `--all-harnesses` の stderr + exit 1 を固定する。
- `tests/integration/t411-compose-invalid-graph-visibility.test.ts:1-22` は invalid graph の可視性を固定する。

これは [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) で修正済みであり、no-silent-drop では negative / regression fixture として再利用し、ロジックを再実装しない。

## アーキテクチャ所見

### 観測から直接導ける境界

1. contributor-only gate は既存 `tests/*-gate.ts` と CI lint job の境界に置ける。
2. AST rule は3 shape を別 rule ID にし、scanner／census／baseline／exemption／renderer から独立させる。
3. baseline は既存違反債務、exemption は意図的 drop の設計理由であり、別台帳にする。
4. scanner は authored roots の完全性を所有し、生成物・fixture を除外する。
5. CLI は tool／config／rule／baseline／scan の失敗を typed diagnostic と exit code に変換する唯一の adapter とする。

### 後続設計で確定すべき事項

- emit／Result API の型または registry vocabulary。
- ast-grep の固定バージョンと Bun／Linux での起動方式。
- baseline identity と exemption comment の正確な文法。
- #1874 の Result 型を helper 公開契約にするか、mutation 境界の strict wrapper に閉じるか。

## 品質・NFR 所見

- 性能: no-silent-drop gate 単独15秒以内。
- 精度: 初期 corpus の偽陽性率5%以下。
- fixture: 3 shape の positive／negative を100%分類。
- 完全性: approved roots 3件、expected rule 3件、expected tool/version を照合し、zero／partial scan を拒否。
- 更新: baseline と exemption は shrink-only。新規 violation の自動承認を禁止。
- 診断: tool／rule／baseline／exemption の欠落・不正は固有の typed failure と非0 exit。

## 未確認事項

- intentional best-effort catch の初期 census と exemption 件数。
- emit／Result registry の正準 API 集合。
- ast-grep の Bun 上の配布形、lockfile 更新、Linux runner cold-start。
- 15秒 budget と偽陽性率5%以下の実測値。
- partial scan をどの manifest／count で証明するか。

## 委譲偏差

Reverse Engineering の Developer 委譲は2回実施されたが、いずれも成果物確定前に停滞した。conductor が承認済みの revision、roots、除外、Issue 境界を変えず限定走査し、Developer code scan を作成した。Architect Synthesis はその scan と observed source の主要引用を入力にした。

この偏差により、通常の「Developer が独立 scan を完遂し、Architect が合成する」直列性は満たしていない。探索範囲を拡大して補完せず、未計測の corpus、性能、偽陽性率、ast-grep 実行性は未確認として残した。追加の網羅探索・テスト・prototype は実施していない。

## 更新した CodeKB

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`
- 本ファイル
