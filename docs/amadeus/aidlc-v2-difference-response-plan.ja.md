# AI-DLC v2 Difference Response Plan（AI-DLC v2 差分対応計画）

この文書は、Issue #401 の判断として、AI-DLC v2 との差分を扱う #391、#392、#393、#394 の対応順序と PR 境界を定義する。

Issue #395 の [Skill Language Policy](skill-language-policy.md) と、Issue #400 の代表 skill 英語化を前提にする。

## 方針

AI-DLC v2 との差分対応は、英語化 PR と意味変更 PR を分ける。

Amadeus DLC 固有の契約は、AI-DLC v2 との対応確認を理由に削らない。

各 PR は、次を PR 説明に明記する。

- 対象 Issue。
- 英語化だけか、意味変更を含むか。
- AI-DLC v2 から取り込む項目。
- Amadeus DLC の意図的差分として維持する項目。
- source skill と昇格先 skill の同期方法。
- 実行した検証。

## 対応順序

| 順序 | Issue | 分類 | 先に扱う理由 | PR 境界 |
|---:|---|---|---|---|
| 1 | #391 reviewer 指定の対応 | 意味変更の判断 | reviewer の扱いは、stage skill の承認、確認、差し戻しの語彙に影響するため。 | reviewer 指定がある AI-DLC v2 stage を一覧化し、Amadeus DLC で reviewer を実行するか、既存の成果物確認へ写像するかを stage ごとに決める。任意の reviewer agent 実装は含めない。 |
| 2 | #393 sensor と Learn の写像 | 意味変更の判断 | sensor と Learn は、#391 の reviewer 判断と同じく、stage 完了前後の確認と知見記録に関わるため。 | sensor ごとの検証先を `amadeus-validator`、build and test、stage 固有成果物へ写像する。Learn は `memory.md`、`decisions.md`、`traceability.md`、`grillings` のどこへ記録するかを明記する。`.amadeus-sensors/` 相当の仕組み追加は含めない。 |
| 3 | #392 Build and Test の失敗時処理 | 意味変更の判断 | Build and Test の失敗時処理は、#391 と #393 で決める確認と知見記録の境界を受けるため。 | 現在の halt-and-ask と Code Generation 責務分離を維持するか、AI-DLC v2 に寄せるかを決める。維持する場合は理由を lifecycle docs と skill に記録する。修正の自動再試行実装は含めない。 |
| 4 | #394 Operation phase の対象外理由 | 境界の明確化 | Operation phase は現在の Amadeus DLC 対象外であり、#391、#392、#393 の Construction までの判断後に境界を明文化するのが自然であるため。 | Operation phase を対象外にする理由を、成果物契約、gate、validator、PR 境界の観点で説明する。Operation skill の追加や取り込みは含めない。 |

## Issue ごとの PR 記述要件

| Issue | PR 説明に必ず書くこと |
|---|---|
| #391 | reviewer 指定がある AI-DLC v2 stage の一覧。stage ごとの Amadeus DLC 側の扱い。採用しない reviewer の理由と検証手段。 |
| #393 | sensor ごとの検証先。Learn の記録先。採用しない sensor または Learn 項目の理由。 |
| #392 | Build and Test の失敗時処理が従う契約。`test-results.md` に残す内容。Bolt gate との関係。 |
| #394 | Operation phase が現在の対象外である理由。AI-DLC v2 Operation skill 一覧と Amadeus 側の扱い。将来対応する場合の別 Issue または roadmap。 |

## 検証コマンド

各 PR は、変更範囲に応じて次を実行する。

```sh
npm run test:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
```

Amadeus skill を変更した PR は、加えて次を実行する。

```sh
bun run dev-scripts/promote-skill.ts <skill-name> --replace
npm run test:it:promote-skill
```

複数 skill を変更した場合は、変更した全 source skill を昇格フローで同期する。

## 衝突回避

#391、#392、#393、#394 は、残り skill の段階的英語化を扱う #402 と混ぜない。

ただし、#391 から #394 のいずれかで対象 skill を更新する場合、その PR 内で触った `SKILL.md` だけを英語化済みの文体へ寄せてもよい。

その場合でも、PR 説明では英語化部分と意味変更部分を分けて説明する。

## #401 の完了条件

Issue #401 は、この文書を含む PR が merge され、#391、#392、#393、#394 の対応順序と PR 境界を追跡できる状態になった時点で完了とする。

#391、#392、#393、#394 の個別 close は #401 の完了条件に含めない。
