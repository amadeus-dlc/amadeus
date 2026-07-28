# Intent Statement — plugin 運用 verb のスキル/ハンドラ化+runner-gen plugin 対応

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない。入力は Issue #1597 / #1598 本文とユーザー裁定)

## Problem Statement

plugin 機構(#1596 で E2E 適合まで着地済み)の運用入口が raw CLI の手叩き(`bun <harness-dir>/tools/amadeus-plugin.ts <verb>`)しかなく、他の Amadeus 機能(mirror 等)が備えるスキル/ユーティリティハンドラの入口と非対称である。加えて、compose 済み plugin stage には stage-runner スキル(`/amadeus-<slug>`)が生成されず(#1598)、stock stage との入口対称性が崩れている。upstream 2.3.0 も wrapper CLI を「designed but NOT yet wired」として持ち越しており、Amadeus 側で先に配線する。

## Target Customer

- **Amadeus を使う開発者(内部)**: plugin の状態確認・導入・削除・診断を、他機能と同じ `/amadeus plugin <verb>` / `/amadeus-plugin` の入口で行えるようになる。INSTALL.md の手作業(コピー→compose)も `install` verb で1操作になる
- **plugin 作者**: compose 後の stage が `/amadeus-<slug>` で単段実行できるようになり、plugin stage の動作確認・利用が stock stage と同じ体験になる

## Success Metrics

- `/amadeus plugin <status|compose|drop|doctor|install>` がユーティリティハンドラとして全ハーネスで動作する(11-contributing.md「Adding a Utility Handler」チェックリスト準拠)
- ユーザー起動スキル `amadeus-plugin` が存在し、amadeus-mirror 様式のガード付きライフサイクル操作を提供する
- `install <path>` が folder-drop コピー+compose を1操作で行い、trust 境界(compose の承認ゲート)を維持する
- compose 済み plugin stage に対し runner-gen が `/amadeus-<slug>` stage-runner スキルを生成し、drift guard(`check`)が plugin stage を含めて同期を検査する(#1598)
- docs(19-plugins EN/JA)の入口案内が raw CLI からスキル/ハンドラへ更新され、EN/JA 対訳が同一変更で同期する
- 既存 CI 基準(typecheck / lint / dist:check / promote:self:check / tests --ci)がすべて green

## Initiative Trigger

前提だった #1596(ホストルート統一・開発者視点 E2E)が 2026-07-27 に main 着地し、plugin 系バグが 0 件になった。機構の正しさが確保された今、利用者体験の入口整備(P2 #1597)が次の最優先であり、同テーマの入口対称性 Issue #1598 をユーザー裁定で同乗させた。

## Initial Scope Signal

`amadeus-feature`(Amadeus 自己開発の新機能)。スコープ境界はユーザー直接裁定(2026-07-27T14:58:20Z)で確定:

- **含む**: #1597 提案1〜4 フル — (1) `/amadeus plugin <verb>` ユーティリティハンドラ (2) `amadeus-plugin` スキル (3) 全ハーネス投影+docs 入口更新 (4) `install <path>` verb。加えて #1598 — runner-gen の plugin stage 対応
- **含まない**: plugin skills 貢献面(#1380)、book-plugin 再編(#1351)、opencode hook 実測(#1126)、trust 境界の変更(compose の承認ゲートは現行維持)
