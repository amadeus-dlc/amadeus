# Software Design 原則集

j5ik2o/ai-tools の software-design プラグインから取り込んだ設計原則リファレンス。全エージェントが設計・実装・レビュー時に参照する。

- 出典: https://github.com/j5ik2o/ai-tools — `plugins/software-design/skills/`(取り込み時コミット: `244741bd633ca8808cfc44887a0d6f4f63ec272c`、取り込み日: 2026-07-08)
- 各ディレクトリは元スキルの `SKILL.md` + `references/` をそのまま保持する(原文は英語のまま。忠実性を優先し翻訳しない)
- 拘束力の源泉はこのディレクトリではなく memory 層のルール(下表参照)。ここは詳細・例・アンチパターンを引くための参照資料

## 分類と拘束ルールの対応

### 普遍原則 — 常時適用(memory のルールが拘束)

| 原則 | 一言要約 | 拘束ルールの場所 |
|---|---|---|
| [tell-dont-ask](tell-dont-ask/SKILL.md) | 状態を聞いて外で判断せず、持ち主に指示する | `memory/phases/construction.md` |
| [law-of-demeter](law-of-demeter/SKILL.md) | 直接の協力者とだけ会話する(列車事故チェーン禁止) | `memory/phases/construction.md` |
| [parse-dont-validate](parse-dont-validate/SKILL.md) | 検証の証明を型で運ぶ。無効状態を表現不能に | `memory/phases/construction.md` |
| [error-handling](error-handling/SKILL.md) | 回復可能性でエラー機構を選ぶ | `memory/phases/construction.md` |
| [error-classification](error-classification/SKILL.md) | error/fault/failure 等を区別してから対処を設計 | `memory/phases/construction.md` |
| [first-class-collection](first-class-collection/SKILL.md) | コレクションのルールはドメイン名を持つ型に集める | `memory/phases/construction.md` |
| [breach-encapsulation-naming](breach-encapsulation-naming/SKILL.md) | やむを得ない getter は「破り」を命名で可視化 | `memory/phases/construction.md` |
| [intent-based-dedup](intent-based-dedup/SKILL.md) | 重複排除は見た目でなく意図・変更理由で判断 | `memory/phases/construction.md` |
| [ddd-when-to-wrap-primitives](ddd-when-to-wrap-primitives/SKILL.md) | ラッパーが正しさを変えるときだけ包む | `memory/phases/construction.md` |
| [package-design](package-design/SKILL.md) | パッケージ設計は変更の制御(情報隠蔽・依存方向) | `memory/phases/inception.md` |
| [refactoring-packages](refactoring-packages/SKILL.md) | 構造の改善は小さく検証可能な手順で | `memory/phases/inception.md`(package-design と併記) |

### 方式依存 — 採用プロジェクトのみ適用(knowledge 参照のみ)

プロジェクトがその方式(DDD、CQRS/ES、Clean Architecture)を採用する場合に限り適用する。採用を決めたプロジェクトは `memory/project.md` からこの索引へのポインタルールを追加すること。

| 方式 | 原則 |
|---|---|
| DDD | [ddd-domain-building-blocks](ddd-domain-building-blocks/SKILL.md), [ddd-aggregate-design](ddd-aggregate-design/SKILL.md), [ddd-aggregate-transaction-boundary](ddd-aggregate-transaction-boundary/SKILL.md), [ddd-cross-aggregate-constraints](ddd-cross-aggregate-constraints/SKILL.md), [ddd-domain-model-first](ddd-domain-model-first/SKILL.md), [ddd-domain-model-extractor](ddd-domain-model-extractor/SKILL.md), [ddd-domain-primitives-and-always-valid](ddd-domain-primitives-and-always-valid/SKILL.md), [ddd-module-pattern](ddd-module-pattern/SKILL.md), [ddd-repository-design](ddd-repository-design/SKILL.md), [ddd-repository-placement](ddd-repository-placement/SKILL.md) |
| CQRS / ES | [cqrs-tradeoffs](cqrs-tradeoffs/SKILL.md), [cqrs-aggregate-modeling](cqrs-aggregate-modeling/SKILL.md), [cqrs-to-event-sourcing](cqrs-to-event-sourcing/SKILL.md) |
| CQRS/ES + Scala 3 / Pekko | [pekko-cqrs-es-implementation](pekko-cqrs-es-implementation/SKILL.md) |
| Clean Architecture | [clean-architecture](clean-architecture/SKILL.md)(スキル自身が「明示指定時のみ」を宣言) |
| Functional Domain Modeling (TypeScript) | [functional-domain-modeling-ts](functional-domain-modeling-ts/SKILL.md) — class/interface を使わない TS スタイル(type 契約、ファクトリ関数 + クロージャ、コンパニオンオブジェクト、ブランド型 + スマートコンストラクタ、Result/ADT)。**リポジトリ内 authored**(出典取り込みではない)。正準例: [event-store-adapter-js](https://github.com/j5ik2o/event-store-adapter-js/tree/main/packages/library) |

### 取り込み対象外(出典リポジトリにのみ存在)

`custom-linter-creator`、`migrate-skill-to-agent`、`reviewing-skills` は設計原則ではなく操作(アクション)のため取り込まない。原則を決定論的チェックに落とす際は出典の `custom-linter-creator` を参照し、sensor(`.claude/sensors/`)との `pairing:` を検討する。

## 更新方法

- **取り込みエントリ**(出典が ai-tools のもの): sparse clone で該当ディレクトリを取得して上書きし、この README の取り込みコミットハッシュを更新する。ローカルで原則本文を改変しない(改変が必要なら出典側へ反映してから取り込む)
- **authored エントリ**(`functional-domain-modeling-ts` 等、リポジトリ内で執筆したもの): このリポジトリで直接編集してよい。日本語で書く(コード例・識別子は除く)
