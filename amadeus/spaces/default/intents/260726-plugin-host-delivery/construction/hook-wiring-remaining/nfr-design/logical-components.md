# 論理コンポーネント — U4 hook-wiring-remaining

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## 実装モジュール構成

パス・挿入点は component-methods.md C4 と `business-logic-model.md` フロー 1/2 からの転記(最終的な対象集合は U1 マトリクスの composeTrigger セルが正 — 本設計で面を確約しない):

| 面 | 挿入点(wiringPoint) | 配線内容 |
|---|---|---|
| codex | `harness/codex/hooks/` アダプタ(project 内 exact `.codex/hooks.json` 経由) | HookInvocation 1 点: `bun <harnessDir>/tools/amadeus-plugin.ts compose --if-stale` |
| cursor / kiro / kiro-ide | `harness/<name>/hooks/` アダプタ | 同上 |
| kimi | `~/.kimi-code/config.toml` の marker-fenced managed block | 同上(managed block 内 1 エントリ) |
| opencode | `plugin/amadeus-opencode-plugin.ts` | 同上 |
| manual-only / deferred 面 | 配線なし | DegradeContract(INSTALL 手順書へ手動 compose 1 コマンド+DropsRecord advisory — 書き手は compose 経路) |

新設ロジック: `resolveFaceDisposition(face): FaceDisposition`(reliability-design.md — 2 値判別 union)。マトリクスの機械可読列挙(BR-U1-7)から `HookWiring[]` を導出し手書き複製しない(scalability-design.md)。フック側に合成・判定コードを置かない(security-design.md SEC-U4-1)。

## 保証機構の層別

| 層 | 保証 | 対応 ID |
|---|---|---|
| 判定層(`resolveFaceDisposition` — 純関数) | 配線 XOR degrade の値域閉包(沈黙欠落の型レベル不能化) | `reliability-requirements.md` REL-U4-1、`scalability-requirements.md` SCALE-U4-2 |
| 配線層(各面アダプタ) | 1 点配線・argument-array 起動・ロジック非複製 | `security-requirements.md` SEC-U4-1 |
| 実行層(engine `--if-stale`) | no-op 高速路・冪等(既存実装へ委譲) | `performance-requirements.md` PERF-U4-1/2 |
| 失敗層 | stderr 1 行+exit 0 継続 | `security-requirements.md` SEC-U4-2、`reliability-requirements.md` REL-U4-2 |

## テスト層配置

fs / process を使う検証は integration 以上へ置く(team.md fs-tests-integration-first):

- **unit(純関数)**: `resolveFaceDisposition` の 2 軸全組合せ(manual-only × measured/deferred)— マトリクス fixture データのみで fs 非依存
- **integration(実 FS)**: XOR 全数 assert(配線実在の parse ⇔ DegradeContract 実在の照合)、配線面リストとマトリクス列挙の機械照合、compose 失敗 fixture のセッション継続+警告 1 行、doctor advisory 行の文字列 assert(U5 と共有)、dist 同期ガード
- **e2e(--ci 非対象)**: native hook 実起動観測(`business-logic-model.md` フロー 3)。実起動不能面は手動 fallback E2E で代替し代替事実を期待値固定
- 検証コマンド: `dist:check` / `promote:self:check` / 既存認可テスト群 green(REL-U4-4、SEC-U4-3)

## 障害分離(failure domains / blast radius / isolation / shared resources)

- **failure domains**: (1) **判定面**(`resolveFaceDisposition` — 純関数、マトリクス列挙のみ入力)、(2) **面別配線面**(codex / cursor / kiro / kiro-ide / kimi / opencode の各アダプタ — 面ごとに独立の障害単位。business-logic-model 実行順「面ごとに独立コミット」)、(3) **実行面**(engine `compose --if-stale` — フックから起動される別プロセス。合成・判定ロジックはこちら側にのみ存在)、(4) **degrade 面**(DegradeContract 文書+DropsRecord advisory — 実行時コードなし)。
- **blast radius**: 1 面の配線不備は当該ハーネスの自動 compose 欠落に閉じる — 他面の着地を塞がない(面別独立コミット)。欠落自体も XOR 全数 assert(配線 ⇔ DegradeContract)が沈黙欠落を型・テスト両面で遮断する(REL-U4-1)。実行面の compose 失敗は stderr 1 行+exit 0 でセッション継続(SEC-U4-2 / REL-U4-2)— ハーネスセッションへ波及しない。degrade 面は機能低下(手動 compose 床)のみで、doctor の advisory 行(U5)により可視 — 無音の機能喪失を作らない。
- **component isolation strategy**: フック側にロジックを置かない 1 点配線(argument-array 起動 — SEC-U4-1。障害時の調査面を engine 側 1 箇所へ集約)、判定の純関数化(2 軸全組合せを unit テストで閉包)、プロセス境界(hook 失敗と engine 失敗を分離)、no-op 高速路は既存 engine 実装へ委譲(U4 で再実装しない)。
- **shared resources**: **U1 マトリクスの機械可読列挙(BR-U1-7)**(読取のみ — `HookWiring[]` の導出元。手書き複製禁止)、**DropsRecord**(advisory エントリの書き手は compose 経路 — U4 は契約を定義するだけで書込呼出を持たない。U5 が読取)、**フック snippet の配布面(dist / self-install)**(U3 の投影が配布 — U4 は正本アダプタ側の配線を所有)、**kimi config.toml の managed block**(marker fence 内 1 エントリのみを所有 — fence 外はユーザー領域で非接触)。

(nfr-design Step 6 の必須内容 — U2 ND レビュー iteration 1 Major 指摘の是正 2026-07-27)
