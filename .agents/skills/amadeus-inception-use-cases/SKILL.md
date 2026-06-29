---
name: amadeus-inception-use-cases
description: >-
  Amadeus Inception の内部 skill。ユーザーストーリー作成済み Intent に対して、ユースケースだけを実行し、
  use-cases.md、use-cases/<use-case-id>.md を作成または補修する必要がある場面では必ず使う。
  requirements、user-stories、units、bolts、traceability、decisions、Spec、実装は作らない。
---

# amadeus-inception-use-cases

## 目的

Inception phase の Use Cases だけを進める。

この skill は `amadeus-inception` の内部 skill である。
ユーザーストーリーから、システムとの相互作用をユースケースとして作る。

## 前提

対象 Intent が Ideation、要件定義、User Stories を完了していることを前提にする。

少なくとも次を読む。

- `.amadeus/intents.md`
- `.amadeus/intents/<intent-id>-<slug>.md`
- `.amadeus/intents/<intent-id>-<slug>/state.json`
- `.amadeus/intents/<intent-id>-<slug>/ideation/scope.md`
- `.amadeus/intents/<intent-id>-<slug>/ideation/ideation.md`
- `.amadeus/intents/<intent-id>-<slug>/inception/requirements.md`
- `.amadeus/intents/<intent-id>-<slug>/inception/acceptance.md`
- `.amadeus/intents/<intent-id>-<slug>/inception/user-stories.md`
- `.amadeus/intents/<intent-id>-<slug>/inception/user-stories/**`
- steering layer

User Stories の成果物が不足している場合は、`amadeus-inception-user-stories` を案内して停止する。

## テンプレート

新規作成または構造補修では、`amadeus-inception/templates/intents/inception/` のテンプレートを使う。

プロジェクト固有テンプレートが `.amadeus/settings/templates/intents/inception/` にある場合は、そちらを優先する。

## 成果物

作成または更新するものは次だけである。

- `.amadeus/intents/<intent-id>-<slug>/inception/use-cases.md`
- `.amadeus/intents/<intent-id>-<slug>/inception/use-cases/<use-case-id>-<slug>.md`
- 記録対象の質問と回答が親 skill から渡された場合だけ、`.amadeus/intents/<intent-id>-<slug>/inception/grillings.md`
- 記録対象の質問と回答が親 skill から渡された場合だけ、`.amadeus/intents/<intent-id>-<slug>/inception/grillings/Gxxx-*.md`

既存成果物がある場合は、同じ ID と同じファイル名を尊重する。
不明な値は空欄にせず、`未確認` と書く。

## 手順

1. ユーザーストーリーから、利用者とシステムの相互作用をユースケースとして切る。
2. ユースケースが Requirement の箇条書きになっている場合は、相互作用として書き直す。
3. Requirement、User Story、Use Case が常に 1:1 になる場合は、粒度不足を疑う。
4. 自然な粒度であれば、後続の追跡確定で理由を残せるように根拠を本文に残す。
5. 親 skill から記録対象の質問と回答が渡された場合だけ、`amadeus-grilling` の構造に従って Grilling Decision Trail を同じ変更で更新する。
6. 作成後に validator が使える場合は、対象 Intent を検証する。

## 禁止事項

- `requirements/**`、`acceptance.md`、`user-stories/**` を更新しない。
- `units/**`、`bolts/**` を作らない。
- `traceability.md`、`decisions/**`、`state.json` を更新しない。
- domain model、Spec、実装、CI を作らない。
- ユースケースを要求の箇条書きとして作らない。

## 次の skill

- Units Generation へ進む場合: `amadeus-inception-units-generation`
- Inception 全体を進める場合: `amadeus-inception`
