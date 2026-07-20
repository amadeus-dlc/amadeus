# Unit of Work — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

## Unit 分割: 単一 Unit(U1)

| Unit | 名称 | 内容 | 規模見積り(行) |
| --- | --- | --- | --- |
| U1 | ballot-acceptance-failclosed | FR-1〜FR-5 の全実装: (1) Ballot.parse の 6 分類化(invalid-timestamp、regex+Date 二段 — ADR-4 の順序) (2) parseBallotShape の kind/ref 対応+AmendBallot 生成 (3) resolveBallots 純関数と適用点 #1〜#3・#5(component-methods 表) (4) appendBallot の unknown-ref 照合(ADR-2) (5) normalizeAt 恒等コメント(ADR-1) (6) テスト(t234/t235/t236 追記+落ちる実証+corpus sweep) | 実装 +95 / テスト +160(components.md 見積りを継承) |

## 単一 Unit の正当化(分割しない根拠)

- **同一ファイル交差**: B-1(timestamp)と B-2/B-3(amend)は同一関数 `Ballot.parse` / `parseBallotShape`(model.ts:160-204)の同一分類ラダーを触る — c6 の非交差判定で交差確定のため、分割しても直列化必須で並行効果ゼロ。
- **裁定の完結**: B-3 の前提だった設計裁定(E-BFARA2/3)は RA で成立済み — バックログの依存(B-2←B-3)は解消済みで、分割の理由だった「裁定待ち分離」が消滅。
- **規模**: 合計 ≒255 行は 1 Bolt の通常規模内。分割は PR 2 本と再接地 2 回(e1 #1261 直列合意)のオーバーヘッドだけを増やす。

## Unit の受け入れ条件(要件トレース)

U1 完了 = FR-1(a)〜(d) / FR-2(落ちる実証+glob 全数 sweep)/ FR-3(a)〜(d) / FR-4(a)〜(c) / FR-5(typecheck・lint・--ci green、deslop、lcov)の全受け入れ基準green。t238 非接触(W-1)/ t241 非接触(components.md の非変更確認 — W-1 の対象は t238 のみ)。#1261 着地後の base-advance-regrounding を CG 完了条件に含む(直列合意 — decisions.md 出典節)。
