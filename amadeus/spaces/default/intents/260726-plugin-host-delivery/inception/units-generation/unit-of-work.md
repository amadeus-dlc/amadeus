# Unit of Work — plugin-host-delivery

> 上流入力(consumes 全数): components、component-methods、services、component-dependency、decisions、requirements
> 分割原則: 各 Unit は単独で deployable な Bolt(= 1 PR)であり、片側だけでは利用者価値を出荷できない境界は統合する(units-generation:c1)。components.md C1-C9 と decisions.md ADR-1〜5 を Unit へ写像し、requirements.md FR/NFR へ trace する。services.md の「常駐サービスなし」判定により全 Unit は CLI/ビルド時/フック単発実行の範囲に収まる。

## Unit 一覧

| Unit | 名称 | 内容(コンポーネント写像) | trace(FR) | 規模見積り(行) |
|---|---|---|---|---|
| U1 | harness-capability-matrix | 7 ハーネスの導入機構・trigger 語彙・root 解決の実測プローブと能力マトリクス文書(C9)。ADR-4 の 3 クラス割当を確定し、以降の Unit の「対応面」集合を固定する。成果物は record 文書(コード変更なし)+プローブ記録 | FR-1 | 文書 600-900(コード 0) |
| U2 | walking-skeleton-claude | 最小 E2E スライス: engine の core 移設(C2)+ `amadeus-plugin.ts` CLI(C1)+ Claude Code 向け最小投影(C3 の claude 面のみ)+ claude SessionStart フック配線(C4 の claude 面)+「install → 自動 compose → 再 compile → 通常 scope 実行にプラグインステージ出現 → drop → baseline 復元」の統合テスト。walking-skeleton Bolt(単独ゲート) | FR-2(claude 面)、FR-3a/3b/3c、FR-4、FR-6 | 900-1,400(移設差分含む) |
| U3 | host-projection-all | C3 完全版: 残ハーネス(U1 で確定した対応面)の投影+marketplace metadata+outDir 拒否集合(ADR-5、上流 #27-32 同等)+ `--check` stale/orphan 編入+0-plugin byte-identical 検証 | FR-2(全面) | 500-800 |
| U4 | hook-wiring-remaining | C4 残面: U1 で trigger 対応と確定した残ハーネスのフック配線+非対応面の degrade 契約文書化。native hook 実起動テスト(ハーネス別) | FR-3b(残面) | 200-400 |
| U5 | doctor-observability | C5: `--doctor` への plugin 行([degraded]=FAIL / [advisory]=PASS(advisory)、activation 行含む) | FR-5、FR-1(degrade 可観測) | 150-250 |
| U6 | activation-policy | C6: ADR-1 案 A(裁定済み 2026-07-27)の実装 — spec-hash 計算・状態永続化・engine advisory(stderr 1 行)・`--single` 要求撤廃 | FR-7 | 150-250(engine 側パッチ含む) |
| U7 | conformance-suite | C7: 上流 t188 32 ケース追跡表+層別適合テスト(compose 意味論 1 回/投影・trigger 面別)+ upstream sync レポートの適合テスト結果欄(FR-10) | FR-8、FR-10 | テスト 1,200-2,000+表 |
| U8 | docs-sync | C8: `docs/guide/19-plugins{,.ja}.md` の実装後手順への更新(install / doctor / drop、ハーネス別クラスと degrade 契約) | FR-9 | 150-250 |

## deployable 境界の根拠(units-generation:c1 検証)

- **Bolt 1(walking-skeleton・単独ゲート)は U2 のみ**。U1 は skeleton に先行する調査 Bolt(record 文書 PR)であり skeleton ゲートに含めない — U1 の成果はコード不変でも「実装確約の可否を決める実測」という単独の出荷価値(record への恒久文書)を持ち、intent-first 運用では record 文書 PR が独立のレビュー・着地単位として成立する(units-generation:c1 の deployable 検証)
- U2 に C1+C2+claude 面 C3/C4 を**統合**した理由: CLI 単体(C1+C2)は「compose できるが投影物が無い」、投影単体(C3)は「置けるが compose 到達不能」で、どちらも単独では利用者価値を出荷できない。1 ハーネスの垂直スライスで初めて「インストールすると使える」が成立する(scope-document の walking skeleton 定義と一致)
- U3/U4 を U2 から分離した理由: U2 着地後は各ハーネス面が独立に価値を追加する(面ごとに deployable)。分割により Bolt/PR が肥大しない
- U5/U6/U8 は各々単独で利用者可視の価値(状態観測 / `--single` 撤廃 / 正しい手順書)を持つ
- U7 は「保守者価値」(sync 欠落の機械検出)として単独 deployable(FR-10 のレポート拡張を含む — 検出と記録の片側にならないよう追跡表とレポート欄を同一 Unit に置く)

## Deployment model(Unit 別)

全 Unit **standalone**(services.md の常駐サービスなし判定に基づく — 各 Unit は独立の Bolt/PR として単独デプロイ可能で、shared ランタイムや embedded 常駐面を持たない)。U1 のみコード非搬送の record 文書 standalone。

## NFR の帰属

- NFR-1(安全契約)は U2/U3/U7 の全テストに横断適用、NFR-2(起動レイテンシ)は U2(no-op 高速路)+build-and-test の実測固定、NFR-3(Bun-only)/NFR-4(count-free・境界)は全 Unit の実装規律。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T15:23:41Z
- **Iteration:** 1
- **Scope decision:** none

C1-C9 写像・FR 被覆・YAML DAG は整合。ただし walking-skeleton の単独ゲート指定が unit-of-work.md(U2 のみ)と story-map(U1+U2)で矛盾し Bolt 1 を一意に導出できない Major 1 件(Minor: U1 の deployable 根拠欠落、deployment model 列の不在)。

### Findings

- [Major] unit-of-work.md:11 と story-map:35 の walking-skeleton ゲート指定矛盾 — Bolt 1 の一意性が Delivery Planning で機械導出不能
- [Minor] U1(文書 Unit)の単独 deployable 根拠が「deployable 境界の根拠」節に欠落
- [Minor] Unit 一覧に deployment model(standalone/shared/embedded)の明示がない

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T15:25:13Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の 3 指摘は全て閉包確認。walking-skeleton 単独ゲートは U2 のみに統一(story-map / dependency と整合)、U1 の deployable 根拠と Deployment model 節を新設。

### Findings

- None
