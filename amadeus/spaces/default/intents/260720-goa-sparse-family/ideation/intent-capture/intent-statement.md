# Intent Statement — 260720-goa-sparse-family

上流入力(consumes 全数): (本ステージは consumes 宣言なし)

## 解決する問題

GoA 行スキーマ整備の残ギャップ3件(#1226 修正 = PR #1256 の裁定済み followup ファミリ)を1 intent で解消する:

1. **#1254(スパース表記未達)**: `parseGoaLine` は canonical 8-bin 形のみ受理し、team.md 実 corpus の GoA 行9行(サブ問別スパース表記 `c1 1x2 2x1 / c2 …`)は head 拡張(#1256)後も bin 段(`amadeus-norm-metrics.ts:692`)で全行 fail する(実測: pass 0 / headFail 0 / binFail 9)。
2. **#1255(GoaLineCode 複節拡張)**: 選挙 CLI の `GOA_LINE_Code_RE`(`amadeus-election-record.ts:34`)は #1226 の既知 workaround として単節制約を維持しており、複節 election id は alnum 圧縮形(`E-SDECG4`)で record.md へ書かれる。#1256 着地により parse 側は複節を受理するため、撤去は安全に可能(E-GMERA3 裁定の前提)。
3. **#1257(ECODE_RE 同根整合)**: citation 走査の `ECODE_RE`(`amadeus-norm-metrics.ts:131`)は単節 prefix マッチのまま — count-only 消費(:393、#1256 後)につき現行実害ゼロだが、抽出用途への転用時に truncated code が混入する latent trap。

## 背景(確定済み事実)

- 3 Issue とも独立クロスレビュー2名成立済み(1人目 = 本 conductor)。#1254/#1255 は E-GMERA1/E-GMERA3 裁定(2026-07-19)の起票義務履行として、#1257 は PR #1256 レビューの same-root 棚卸しとして起票された。
- 実測値は各 Issue 本文と自レビュー verdict に転記済み(#1254: 9行の occurrence 単位対照実測 / #1255: t238:102 の圧縮形受理ピン / #1257: 旧新 regex 171=171 の count 不変対照)。

## スコープ境界

- **In**: `packages/framework/core/tools/amadeus-norm-metrics.ts`(parseGoaLine の bin 段 or スキーマ側の裁定に基づく対応+ECODE_RE 整合)、`scripts/amadeus-election-record.ts`(GOA_LINE_CODE_RE/GoaLineCode :26-49)、`scripts/amadeus-election.ts` の handleOpen エラーメッセージ(:241)、対応テスト(t238・t-norm-metrics 系)、dist/self-install 再生成(norm-metrics は core 正本)。
- **Out**: e2 intent 260720-hold-choice-resolution の面(HOLD_RESOLUTIONS / handleRender 合成 / rulingText / renderPersistDraft rulingOverride / t236)— 関数単位完全非交差を e2 と相互確認済み(2026-07-20 02:50Z 合意、スコープ変動時は即時相互通知)。GoA 集計(distill の GoA-variance)実装自体は対象外(NOT COLLECTED のまま)。

## 成功指標

1. team.md 実 GoA 行9行が(採用される対応方向に応じて)parse 可能または様式移行で読める状態になり、対照実測で赤 0(#1254 の閉包)。
2. 選挙 CLI が複節 election id を自然形で record.md の GoA 行へ書ける(圧縮 workaround 撤去、#1255 の閉包)。t238:102 の扱いは設計裁定どおりに更新。
3. ECODE_RE が複節整合し count 不変(171=171 級の対照実測)を維持(#1257 の閉包)。
4. 既存 CI ゲート(typecheck/lint/dist:check/promote:self:check/--ci/coverage)全 green。

## 制約・前提

- 設計判断(#1254 の対応方向 (a)parse 拡張/(b)persist 様式/(c)両対応、圧縮形の読み側後方互換、t238:102 の扱い)は選挙で裁定(単独決定禁止 — ディスパッチ要件(5))。逸脱は実装前停止。
- #1257 の消費行は #1256 着地後 :393(行シフト注意 — 着手時再実測)。
- スコープ: amadeus(ユーザー既定)。
