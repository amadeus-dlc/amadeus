# Business Logic Model: seam-bridge(U1)

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

フローは unit-of-work の U1 責務(seam の実 frontmatter 接続 — core のみ)に閉じ、unit-of-work-story-map の U1 列(FR-1a/1b・FR-2a〜2d・NFR-1 install 面)に対応する。services S1(install/uninstall フロー)の U1 担当部分を具体化する。

## install 時フロー(compose — 既存フローへの結線点のみ変更)

```
buildHostSnapshot(hostRoot)                 — amadeus-plugin.ts(変更点1)
  各ファイルについて:
    parseHostStageSeams(bytes)              — 既存: 合成バイト形(t301 固定・不変)
    ↓ null なら
    parseStageFrontmatter(bytes)            — 新設: 実ステージ frontmatter 受理
    ↓ 成功なら HostStage として snapshot へ(seamSpans を保持)
    ↓ 実ステージ様式だが parse 失敗(no-slug 等)なら loud error(無音 skip しない)
  → inspectPlugin / planPluginComposition   — 既存: seam 宣言の解決(unknown-seam 拒否が解消される)
  → applySeamContributions                  — 既存: merge・台帳記録
  → serializeStageFrontmatterSeams(doc, merged) — 新設: produces seam のみ書換え(変更点2)
     不変条件1-3 検証 → 書込
  → recompile                               — 既存: compile が実 frontmatter を読む → node.produces に反映
  → unitCovered が新 produces を検査        — C10 無変更(データ点火 — C-2)
```

## drop 時フロー(既存台帳復元への結線)

```
rebuildStageSeams(ledger)                   — 既存: base seam へ復元
  → serializeStageFrontmatterSeams(doc, base) — 新設 serializer で produces を原状へ
  → 不変条件1(バイト保存往復)により、install 前と byte-identical へ戻る(FR-1b の可逆性)
  → recompile
```

## FR-2d(trust 3層)との関係

U1 の frontmatter 書換えは **compose 時**の操作であり、trust 3層の各検証点と次のように整合する(実測: amadeus-graph.ts:1889-1901 の O_NOFOLLOW 検証は `plugins/<name>/stages/` 配下の **plugin stage ファイル**の run 時 read を対象とする):

- **compose 時(TrustGrant digest)**: 既存どおり — U1 は seam 台帳への記録(既存 `applySeamContributions`)に相乗りし、TrustGrant 機構を変更しない
- **compile 時(provenance stamp)**: 書換え後の host stage(core 出自)は plugin_source stamp の対象外のまま — produces 配列の値が変わるだけで、stage の出自区分は不変
- **run 時(O_NOFOLLOW 同一 inode)**: 検証対象は plugin stage ファイルであり、U1 が書き換える host stage(`code-generation.md` — core 出自)は対象外。したがって**干渉なし**。plugin stage 側のバイトは U1 が触れないため digest 検証も不変

## FR-1c(適用範囲)との関係

overlay は stage ファイル(code-generation.md)の produces へ働くため、code-generation を EXECUTE する**全 scope** に自動適用される — scope 別のフィルタリング機構は設けない(FR-1c の裁定 Q1 どおり。scope grid は stage の EXECUTE/SKIP を決めるだけで produces には関与しない)。

## 「実ステージ様式」の判定

`---` で始まるファイル(frontmatter 区切り実在)を実ステージ様式候補とする。frontmatter 実在で slug 不在・seam span 曖昧なら typed error(fail-closed)。frontmatter 非実在(既存の一般 md・非 md ファイル)は従来どおり stage 候補にしない(既存挙動不変 — 未 install 環境の byte 不変は compose を実行しないことで担保、NFR-1)。

## 落ちる実証の設計(NFR-1 の U1 面)

1. fixture workspace(seam 宣言のみの最小 plugin manifest)で compose → `code-generation.md` の produces に `pr-convergence-report` が追記され、compiled graph の node.produces に現れる
2. fixture record で当該 unit のレポート1件を削除 → `unitCovered` が false → `next` が同 batch を再発出(engine 実挙動での落ちる実証)
3. drop → frontmatter が install 前と byte-identical(cmp で機械確認)
4. 未 install workspace → 全ステージファイル byte 不変(compose 不実行の対照)

## エラー分類

| 異常 | 分類 | 挙動 |
|---|---|---|
| 実ステージの frontmatter parse 失敗 | defect(対象ファイル破損 or 様式変化) | typed error → compose 全体を中止(部分適用しない — 既存 rollback snapshot に相乗り) |
| serialize 往復不一致 | defect(serializer 欠陥) | roundtrip-mismatch → 書き込まず中止 |
| produces 以外の seam 書換え要求 | 呼び出し側の契約違反 | unsupported-target-seam で拒否(fail-closed) |

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T08:48:48Z
- **Iteration:** 2
- **Scope decision:** none

BLOCKER 2件(AD⇔FDシグネチャ乖離の無申告・FR-2d trust 3層未言及)は申告付き精密化節とFR-2d関係節+BR-U1-11で閉包。是正による新規矛盾なし。

### Findings

- FOLLOW-UP | components.md 側の AD C6 論点は U1 と非交差だが最終承認時に再確認要(iteration 1 からの引き継ぎ — AD 側は quality-repair 経路で閉包済み)
