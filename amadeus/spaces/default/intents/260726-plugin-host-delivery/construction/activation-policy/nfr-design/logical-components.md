# 論理コンポーネント — U6 activation-policy

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

全設計確定後に導出した実装モジュール構成(component-methods C6 と business-logic-model フロー 1〜4 からの転記)。

## 実装モジュール構成

| モジュール | 位置 | 主要関数・内容 | 由来 |
|---|---|---|---|
| spec-hash 判定(C6 コア) | `packages/framework/core/tools/` の plugin 面(amadeus-plugin-compose.ts 同居 or 隣接小モジュール — 既存 plugin 面の実構造に合わせ実装時確定。export 必須 = in-process seam) | `computeSpecHash(globs): string`(辞書順ソート+path 込み sha256 — reliability-design)/ `readActivationState` / `writeActivationState`(temp+rename)/ ActivationJudgment 導出(changed \| current \| never-run の純比較) | reliability-design / performance-design |
| engine advisory パッチ | `packages/framework/core/tools/amadeus-orchestrate.ts` の next 経路(build-and-test 指令 emit 直前) | composition record の formal-model-check 存在確認(最初の分岐 — 不在なら即 return)→ 判定 → changed \| never-run で AdvisoryLine を stderr 1 行(ラッチで最大 1 行) | security-design(挿入点)/ scalability-design(0-plugin 分岐) |
| `--single` 撤廃 | `amadeus-orchestrate.ts` の `--stage` 受理判定+中立正本 `plugins/formal-model-check/stages/formal-model-check.md` の condition 文(投影配布 — dist 手編集禁止) | compose 済み plugin stage への明示 `--stage <slug>` を `--single` なしで single-stage 実行として受理。scope grid 非編入は既存 c9-tla-plugin-optin-grid 契約維持 | reliability-design(順序制御) |
| doctor 向け判定提供 | 判定関数を U5 の doctor ハンドラから呼出可能に export(表示は U5 の責務 — U6 は判定のみ) | ActivationJudgment の提供(read-only) | security-design(状態の単方向) |
| SpecHashState | composition record 隣接の JSON ファイル(gitignore 対象・機械ローカル) | `{ lastVerdictHash, recordedAt }` | reliability-design(ファイル境界) |

## テスト層配置(fs-tests-integration-first)

| テスト | 層 | 根拠 |
|---|---|---|
| ActivationJudgment 導出の純比較(hash 文字列 × state 値 → 3 値)全分岐 | tests/unit | 純関数(fs 不使用) |
| computeSpecHash の決定性(2 回一致・1 バイト変更・rename・復元の対照)、読取不能 fail-closed、state 読み書き(不在 = never-run / parse 不能縮退 / temp+rename)、発火経路の state bytes 不変、0-plugin next 出力 byte 同一、advisory stderr 1 行+stdout parse 成功、changed 経路に TLC 呼出なしの落ちる実証 | tests/integration | 実 FS(spec fixture・record・state ファイル)を触るため integration。in-process 駆動で lcov 有効 |
| `--stage formal-model-check`(--single なし)受理+scope grid 非出現、既存 next 消費テスト green | tests/integration(既存 orchestrate テスト面に追加) | reliability-design(撤廃の範囲限定) |

- 検証コマンド: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`(performance-design のとおり ms 予算テストは置かず、必要時のみ build-and-test で実測)
- 要件対応: 0-plugin 分岐・current 無音 = performance-requirements の構造合否 / stdout 純度・TLC 非起動・state 単方向 = security-requirements の各合否 / 少数・小規模境界 = scalability-requirements の N/A 根拠 / 決定性・fail-closed 縮退・撤廃範囲限定 = reliability-requirements の各合否へそれぞれ trace する

## 障害分離(failure domains / blast radius / isolation / shared resources)

- **failure domains**: (1) **spec-hash 判定面**(`computeSpecHash`+ActivationJudgment 純比較 — 決定的計算のみ)、(2) **state ファイル面**(SpecHashState の読み書き — 機械ローカル JSON、gitignore 対象)、(3) **engine advisory 面**(`amadeus-orchestrate next` の build-and-test 指令 emit 直前パッチ — stderr のみ)、(4) **`--single` 撤廃面**(`--stage` 受理判定+plugin 中立正本の condition 文 — 投影経由配布)。
- **blast radius**: 判定誤り・spec 読取不能は advisory の誤提示 / fail-closed 提示に閉じる — advisory は TLC を起動せずゲート・指令内容にも影響しない(changed 経路に TLC 呼出なしの落ちる実証で固定)。state 破損は parse 不能縮退 = never-run 扱い(fail-closed — 「見逃し」でなく「過剰提示」方向へ倒す)。advisory 面の失敗は stderr 1 行に閉じ、stdout の directive JSON 純度は不変(stdout-directive-stderr-advisory 契約)— next 消費側テスト・ツールへ波及しない。撤廃面は `--stage` の受理可否のみで、single-stage 実行が main workflow の Current Stage を前進させない既存契約は維持(誤受理しても隔離実行に閉じる)。0-plugin 時は最初の分岐で即 return し、全領域が不活性(ゼロ影響)。
- **component isolation strategy**: 状態の単方向(state を書くのは verdict 記録時のみ — advisory 発火は読むだけで書かない = 発火の冪等性)、temp+rename の原子的書込(state 半書きの残存防止)、stderr/stdout のチャネル分離、判定の純関数化(hash 文字列 × state 値 → 3 値の全分岐 unit テスト)。
- **shared resources**: **composition record**(読取のみ — formal-model-check の compose 済み存在確認。書き手は U2 compose 経路)、**SpecHashState**(U6 が唯一の書き手。U5 doctor は U6 の export 判定関数経由で read-only 消費 — 直接読まない)、**stderr advisory チャネル**(engine の advisory 面と共有 — ラッチで最大 1 行に制限し他 advisory を圧迫しない)、**plugin 中立正本 `plugins/formal-model-check/stages/formal-model-check.md`**(condition 文の書き手は U6 — dist は投影生成物で手編集禁止)。

(nfr-design Step 6 の必須内容 — U2 ND レビュー iteration 1 Major 指摘の是正 2026-07-27)
