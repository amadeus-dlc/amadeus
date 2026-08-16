# Bolt Plan — intent 260815-rfc-autonomy-modes

> 1 Bolt = 1 Unit = 1 PR(スカッシュマージ)。walking-skeleton stance(self-feature): **Bolt recommendation-core は単独・ゲート付き**で実行。バッチ内は git worktree 分離で並行、バッチ間は直列。裁定: 梯子 AUTO_DECIDED 48f2d2a5(シーケンシングは units DAG + 直列化制約から一意導出)。

## Bolt recommendation-core: FR-1 / FR-4 梯子面(U1)

- **Units:** `recommendation-core`
- Definition of Done: FR-1 受け入れ(定数 approve で contested 表現不能の Red → ユニオン実配線の Green)+ 梯子縮退除去の pin。PR 作成・required CI green・record checkpoint 同梱
- 期待デモ: 選挙 hold → contested 写像と AUTO_DECIDED 非放出の実測(**walking-skeleton**: 型 → 導出 → escalate の縦貫通)

## Bolt presence-detection: FR-2(U2)

- **Units:** `presence-detection`
- Definition of Done: 対話/非対話の実効判定が単一関数化され、fail-closed(不明→非対話)を実測。棄却代替の不実装を文書検査

## Bolt waiting-interruption: FR-3(U3)

- **Units:** `waiting-interruption`
- Definition of Done: park guard 廃棄の Red→Green、waiting の enter/resume 契約、3 終端遷移表 pin、新監査イベント 2 種 + event-registry/pin テスト同期

## Bolt interactive-carveout: FR-4 対話 arm(U4)

- **Units:** `interactive-carveout`
- Definition of Done: 対話 full の contested がターン返却で人間へ届き、非対話は継続強制のまま waiting へ倒れる mode×対話性の分岐テスト

## Bolt semi-authority-projection: FR-5 / FR-6 / FR-10(U5)

- **Units:** `semi-authority-projection`
- Definition of Done: mode 別マトリクス pin(semi = phase-gate/WS のみ人間)、投影 3 面同時改修、乖離 loud fail 全 mode 化の Red→Green、WS の Stance 従属、advisory-deferral の落ちる実証 2 本

## Bolt presence-closure: FR-12(U6)

- **Units:** `presence-closure`
- Definition of Done: D7/D8 の素通り Red 各 1 件 → fail-closed 化 pin、正当経路の無退行

## Bolt config-visibility: FR-7 / FR-8(U7)

- **Units:** `config-visibility`
- Definition of Done: 旧キー loud fail の Red→Green(trigger.mode 廃止 + consent 改名、同一 PR 全面同期)、実効値可視の同一ソース検査

## Bolt completion-report: ADR-3(U8)

- **Units:** `completion-report`
- Definition of Done: AUTO_DECIDED のみからの機械生成、非 blocking、散文混入なしの検査

## Bolt s13-zero: FR-11(U9)

- **Units:** `s13-zero`
- Definition of Done: surface digest 束縛の 0 件確定、自己申告のみで 0 件化できない落ちる実証、追加候補の disk 再導出検査

## Bolt merge-provenance: FR-9(U10)

- **Units:** `merge-provenance`
- Definition of Done: 委任マージ記録に standing ruling 参照 + 実測値、条件不成立時の人間承認要求の無退行

## Bolt grant-ceremony: ADR-7(U11)

- **Units:** `grant-ceremony`
- Definition of Done: preview 印字改善 + 相互必須不変量(preview なし発効拒否・digest 不一致拒否)の落ちる実証

## Bolt docs-norms: FR-14(U12)

- **Units:** `docs-norms`
- Definition of Done: stage-protocol.md 等の実装一致(mode 別マトリクス照合の落ちる実証 1 回)、ノルム改定案、RFC frontmatter #3116 記入

## Bolt d6-investigation: FR-13(U13)

- **Units:** `d6-investigation`
- Definition of Done: investigation-report.md(機序・file:line・再現・判定)。欠陥なら Issue 起票、修正はしない

## バッチ構成(トポロジー準拠)

- バッチ1: recommendation-core(**walking-skeleton ゲート** — 単独)
- バッチ2: presence-detection(U1 と intent-autonomy.ts 共有のため直列)
- バッチ3: waiting-interruption
- バッチ4: interactive-carveout / semi-authority-projection(file-disjoint 並行)
- バッチ5: presence-closure / s13-zero / merge-provenance / d6-investigation(相互 file-disjoint 並行)
- バッチ6: config-visibility / completion-report(file-disjoint 並行)
- バッチ7: grant-ceremony(bolt.ts を completion-report と共有のため直列)
- バッチ8: docs-norms(最終 — 全裁定確定後の文書一致)

```yaml
bolts:
  - name: recommendation-core
    units: [recommendation-core]
    batch: 1
  - name: presence-detection
    units: [presence-detection]
    batch: 2
  - name: waiting-interruption
    units: [waiting-interruption]
    batch: 3
  - name: interactive-carveout
    units: [interactive-carveout]
    batch: 4
  - name: semi-authority-projection
    units: [semi-authority-projection]
    batch: 4
  - name: presence-closure
    units: [presence-closure]
    batch: 5
  - name: s13-zero
    units: [s13-zero]
    batch: 5
  - name: merge-provenance
    units: [merge-provenance]
    batch: 5
  - name: d6-investigation
    units: [d6-investigation]
    batch: 5
  - name: config-visibility
    units: [config-visibility]
    batch: 6
  - name: completion-report
    units: [completion-report]
    batch: 6
  - name: grant-ceremony
    units: [grant-ceremony]
    batch: 7
  - name: docs-norms
    units: [docs-norms]
    batch: 8
```

- 検証は各 Bolt で push-first(remote CI 正)。ADR-9 の contested-0 fixture 群は U1 で基盤、U3/U4/U5 が経路側を追加、conductor が build-and-test で統合実測。
- Bolt 1 完了後のラダープロンプト(org.md)は Intent Autonomy full の既存グラントに従い自律続行(バッチ境界は自動)。
