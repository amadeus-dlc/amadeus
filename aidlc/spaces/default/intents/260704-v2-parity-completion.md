# インテント：260704-v2-parity-completion

## 概要

AI-DLC v2（awslabs/aidlc-workflows、v2 branch）との完全一致を完成させる。柱は 3 本である。(A) 成果物の双方向一致（v2 規定なのに未生成・不一致の補完と、v2 の成果物で代替できる重複独自ファイルの削除）。(B) skill 一覧の一致（対応漏れ 15 skill の追加と、grilling、domain-modeling、validator を除く独自 skill の削除）。(C) TS エンジン駆動化（状態遷移、ルーティング、audit をエンジンに移し、skill を薄いラッパーにする）。基本戦略は、本家 `dist/claude/` からのコピーである（MIT-0）。親 Issue は #396、前提判断は #387 に由来する。

## 依存

| 依存 | 理由 |
|---|---|
| 260703-aidlc-v2-full-compliance | 現在の `aidlc/spaces/` 構造、`aidlc-state.md`、`intents.json` を前提にするため。 |
| 260703-amadeus-skill-english-rollout-plan | skill の英語化方針が、本家英語 skill のコピー戦略の前提になるため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | `business`、`technical`、`mixed` のいずれか。 |
| scope | feature | `enterprise`、`feature`、`mvp`、`poc`、`bugfix`、`refactor`、`infra`、`security-patch`、`workshop` のいずれか。 |
| labels | aidlc-v2, upstream-parity, engine | 検索、集計、補足分類に使う任意のラベル。複数ある場合はカンマ区切りにする。 |
