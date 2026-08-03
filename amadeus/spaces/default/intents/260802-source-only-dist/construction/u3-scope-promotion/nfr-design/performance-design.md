# Performance Design — u3-scope-promotion

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は engine nfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一存在する `business-logic-model` の正本移設→frontmatterタグ→compile→deep-equal検証をfallback入力とする。

## 性能方針

対象は build 時の静的コンパイルであり、常駐サービス向け cache や pool は不要。15 scope × stage graph の有限集合を1回走査し、既存 compile の計算量を維持する。scope-grid を別工程で再計算せず、単一 compile 出力を全投影先へ再利用する。

## 退行検査

- `scripts/package.ts` の `buildTree` 1回につきgraph compile 1回をtest spyでassertし、昇格前後とも呼出し回数1を維持する
- 10→15 scope の増加で処理が stage数×scope数に対して線形であることを fixture counter で確認する
- `bun scripts/package.ts --check` を測定コマンドとし、同一fixtureの昇格前baselineに対するwall time +20%以内を参考値、stage×scopeのcounter上限をblocking判定とする
- deep-equal は各投影面につき1回、canonical grid と比較する

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T22:35:27Z
- **Iteration:** 1
- **Scope decision:** none

文書構造と consumes 名の網羅は満たすが、独立oracle、測定可能な性能契約、実装所有境界が不足している。

### Findings

- Critical: ステージ条件と必須上流契約の扱いが不明確。directive の expected absent fallback を成果物内で明示する必要がある。
- Major: canonical compile 出力との全面deep-equalだけではcompiler共通モード障害を検出できない。独立oracleが必要。
- Major: compile回数と性能退行条件に測定コマンド・相対閾値・counter所有箇所がない。
- Major: 論理コンポーネントが具体的な既存module/function/生成先へ対応付いていない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T22:40:35Z
- **Iteration:** 2
- **Scope decision:** none

前回Critical/Majorは解消。expected-absent fallback、独立oracle、性能測定契約、実装所有箇所が明示され、新規Critical/Majorはない。

### Findings

- Resolved: expected absent fallbackを全成果物へ明示。
- Resolved: 移行前15-key fixtureを独立oracle化。
- Resolved: compile回数・測定コマンド・閾値を追加。
- Minor: fixture counterの具体操作を実装時に固定する。
- Minor: sensor manifestとTS実行器の関係を実装時に明記する。
