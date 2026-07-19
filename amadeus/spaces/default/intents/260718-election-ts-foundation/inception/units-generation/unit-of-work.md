# Unit of Work — election-ts-foundation

> 上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## 分割方針

粒度=6ユニット(ユーザー裁定 2026-07-19、units-generation-questions.md Q1=A)。境界はコンポーネント凝集(components.md C1〜C7)、デプロイは全ユニット共通でチームローカル scripts/(decisions.md ADR-1 — standalone デプロイなし)。

## ユニット定義

| Unit | 内容 | 所有(components.md 対応) | 主要成果物 | 複雑度 | 見積り(実装/テスト) |
|---|---|---|---|---|---|
| U1 election-model | 判別ユニオン型(Election/Ballot/TallyResult)、GoA 集計・決定的シャッフル・票検証の純関数群 | C1 | scripts/amadeus-election-model.ts+unit テスト | M | 250-350 / 250-350 行 |
| U2 election-store | elections/<ID>/ の I/O(定義・受付台帳・開票時実体化・タイムライン記帳) | C2 | scripts/amadeus-election-store.ts+integration テスト | S | 150-220 / 120-180 行 |
| U3 election-record | 記録生成(GoA 行 parseGoaLine byte 互換・タイムライン・persist 素案)+照合(留保件数・票数・単調性) | C3+C4(様式変更理由で凝集 — component-dependency.md 変更理由表) | scripts/amadeus-election-record.ts+round-trip テスト | M | 220-330 / 180-260 行 |
| U4 election-transport | VoterTransport 抽象+agmsg 実装(spawn のみ)+subagent 実装。ShortNotification 型保証 | C5 | scripts/amadeus-election-transport.ts+integration テスト | S | 120-180 / 100-150 行 |
| U5 election-cli | next/report 指令ループ(6状態機械 — requirements.md FR-0/ADR-3)+全 verb 配線+機械実行器 e2e(ADR-6 CI 層) | C6 | scripts/amadeus-election.ts+e2e テスト | L | 200-280 / 200-300 行 |
| U6 election-skill | SKILL.md(contrib/skills/amadeus-election/)+禁止語彙 grep 検査+ノルム無参照 subagent 実演(ADR-6 実演層) | C7 | SKILL.md+検査テスト+実演記録 | S | 40-80 / 60-100 行 |

**合算(機械和)**: 実装 980-1,440 行(components.md 合算と一致 — U3=C3 120-180+C4 100-150=220-330)/ テスト 910-1,340 行。テスト行は components.md の粗い概算(600-900)を per-unit 再算出で**上方改訂**したもの — 本表が正であり、delivery-planning は 910-1,340 を採用する(components.md 側にも改訂注記を同期済み)。

## 制約・実装ノート(全ユニット共通)

- 判別ユニオン Result・Bun 直接実行・Biome/tsc 既存ゲート(requirements.md NFR-1、team-practices 準拠)
- U1 は fs 非依存の unit 層テスト、U2/U4 は integration 層(fs-tests-integration-first)
- U5 の機械実行器 e2e は decisions.md ADR-6 (i) の CI 常設層 — U6 の実演層と混同しない
- 逸脱時は実装前停止(deviation-stop-before-implement)。本 intent は Inception まで — 実装はこの unit 定義を消費する将来 intent(scope-document W-08)
