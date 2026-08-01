# Requirements Analysis Questions — 260801-kimi-bootstrap-deadlock

Upstream inputs: codekb `business-overview.md` / `architecture.md` / `code-structure.md`(RE differential refresh, observed `861688c31`)、Issue #1922(cross-review ESTABLISHED_WITH_REFINEMENTS 2/2)

E-OC1 判定: 本ファイルの5問はいずれも修正方式・挙動変更受容の裁定であり、ソロモードでは仕様裁定はユーザー専権(エスカレーション正準リスト(4)・auto-solo-election の対象外)のため選挙を実施せず、AskUserQuestion によるユーザー直接裁定で回答を確定した。記入は裁定受領後(cid:code-generation:election-answer-after-ruling)。
ユーザー承認: 2026-08-01T12:50:00Z

## Q1: t10 の既存 pin(no state file で silent exit / no heartbeat)の扱い

修正で `writeCurrentSessionId` を state-file ガード(:70)より前に移すと、no-state SessionStart でも `.current-session` が書かれる挙動に**意図的に変わる**。tests/unit/t10-hook-session-start.test.ts:211,222 が現行 early-exit を直接 pin している。

- A. 挙動変更を受け入れ、t10 の pin を新仕様に改訂する(no-state でも `.current-session` は書く、heartbeat/audit は従来どおりガード後段で不発)
- B. 現行 pin を維持し、別の修正方式を取る(例: caller-authorization 側で `.current-session` 未作成を marker 一致として許容する — fail-closed 設計の緩和になる)
- C. ガード順序は変えず、SessionStart 以外の経路(例: engine `next` 起動時)で `.current-session` を自己修復する
- X. Other (please specify)

[Answer]: A. 挙動変更を受け入れ、t10 の pin を新仕様に改訂する

## Q2: `isTrustedMainStop`(kimi-lib :399-403)の同根面を本修正に含めるか

reviewer-2 の指摘: `.current-session` 未作成のワークスペースでは main Stop の core hook 転送も silent no-op になる(fail-open なのでデッドロックではない)。

- A. 本修正に含める — ただし `writeCurrentSessionId` 前段化で `.current-session` が書かれれば isTrustedMainStop 側は**無修正で自動的に解消**されるため、回帰テストの追加のみで対応する
- B. 本修正に含めない — Stop 面は別 Issue として切り出す
- C. isTrustedMainStop 自体の仕様も見直す(`.current-session` 以外の信頼根拠を追加)
- X. Other (please specify)

[Answer]: A. 本修正に含める — 前段化で自動解消、isTrustedMainStop は無修正、回帰テストのみ

## Q3: `supplyResourceAttribute("session.id", …)`(origin/main 追加分)の配置

origin/main でガード後段に追加された otel resource seam(監査イベントの session.id 属性)。`.current-session` を前段化する際の扱い。

- A. 現行位置(ガード後段)に残す — otel 属性は監査経路の関心事で、no-state では監査 emit 自体が不発なので deadlock とは無関係。最小差分
- B. `writeCurrentSessionId` と一緒に前段へ移す — セッション属性を workflow 有無に関わらず供給する
- X. Other (please specify)

[Answer]: A. 現行位置(ガード後段)に残す

## Q4: heartbeat(hooks-health `session-start.last`)の扱い

現行 heartbeat もガード後段(:75-77)にあり、no-state では書かれない。hooks-health は doctor/監視の入力。

- A. 現行のまま(no-state では heartbeat 不発) — 「workflow 無しでは何もしない」既存設計を heartbeat には維持し、変更は `.current-session` のみに限定する
- B. heartbeat も前段化する — フック稼働監視を workflow 有無から独立させる
- X. Other (please specify)

[Answer]: A. 現行のまま(no-state では heartbeat 不発)

## Q5: 回帰テストの追加面

- A. t10(unit, hook を CLI spawn)に no-state SessionStart で `.current-session` が書かれること・intent 有りでは従来どおり監査 emit されることの2ケースを追加(最小)
- B. A に加えて caller-authorization 結合テスト(scratch fixture で bootstrap 状態から `next` が通ること)を t365 系に追加
- C. A + B + isTrustedMainStop の結合テスト
- X. Other (please specify)

[Answer]: A. t10(unit)に no-state で .current-session が書かれること・intent 有りで監査 emit されることの2ケースを追加
