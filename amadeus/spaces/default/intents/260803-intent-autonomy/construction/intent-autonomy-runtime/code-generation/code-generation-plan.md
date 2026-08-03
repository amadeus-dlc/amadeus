# Code Generation Plan — intent-autonomy-runtime

## スコープと追跡元

U3 `intent-autonomy-runtime`（Issue #2067）のみを実装する。追跡元は U3 の Functional / NFR Design、Intent-scoped grant、`none` / `semi` / `full` の三値モード、gate / question の事前裁定、durable reservation / replay、U1 loop monitor および U2 quality repair との統合境界である。テスト戦略は `Comprehensive` とし、pure contract、production coordinator、audit replay、5 harness projection、canonical event drift を同じ Bolt で閉じる。

Core は PR / merge / GitHub / 外部 runner / supervisor から独立させる。現在対象の Claude Code、Codex、Cursor、OpenCode、Kimi Code は同一 Core から投影し、将来の harness 追加に個別 Core 分岐を要求しない。U4 の完了後レビュー判断と U5 の credential-attested terminal live completion は実装しない。

## 実装手順

- [x] **Step 1 — mode / grant aggregate**: `none` を fail-closed default とし、`semi` / `full` への変更、grant 発行・置換・失効を real `HUMAN_TURN` と表示 digest に束縛する。legacy standing grant は診断情報に限定し、認可には使わない。
- [x] **Step 2 — gate / question authorization**: `none` は人間必須、`semi` は phase 内 stage gate のみ、`full` は active Intent-scoped grant のみを認可する。walking skeleton に例外的な自動承認規則を作らず、通常 gate と同じモード規則を適用する。
- [x] **Step 3 — decision precedence**: 事前確認済み policy、適用 norm、同一 selector / scope lineage / norm の human history、solo election、agent recommendation の順で解決する。norm conflict と capability degradation は黙って補完せず、park または明示的 degradation evidence とする。
- [x] **Step 4 — exact effect authorization**: option-effect registry を canonical source とし、current scope / norm の reversible workflow effect だけを許可する。new permission、irreversible、scope-out、norm waiver、quality waiver は自動適用しない。
- [x] **Step 5 — durable coordinator**: grant exercise を effect 前に予約し、再検証後に `INTENT_GRANT_EXERCISED` / `AUTO_DECIDED` / effect を一 transaction で確定する。crash 後 resume、registry drift abort、duplicate idempotency、revision conflict を fail-closed にする。
- [x] **Step 6 — park / resume / failure**: durable park envelope と typed resume condition を実装する。`REPAIR_STALLED` は U1 latch clear を先行させ、terminal invocation failure は retry 不可として authorization state を保持する。永続済み exercise reservation を failure 処理で破棄しない。
- [x] **Step 7 — audit replay / status**: `INTENT_AUTONOMY_TRANSACTION_COMMITTED` を canonical 84件目の audit event として登録し、transaction digest / before-after projection digest を検証して cross-session replay する。status は mode / grant / suspension を安全に公開し、U5 未実装を `terminalLiveCompletionCapable: false` で明示する。
- [x] **Step 8 — Comprehensive tests / projection**: pure unit、coordinator / replay integration、Claude Code / Codex / Cursor / OpenCode / Kimi Code の byte-identical projection、event registry / audit vocabulary / coverage / package / promote drift を検証する。

## 非対象

U4 の completed decision review、accept / flag、self-fix / self-feature proposal、U5 の credential-attested terminal live completion、PR / merge lifecycle、GitHub 固有処理、外部 runner / supervisor、新規 plugin / stage は実装しない。
