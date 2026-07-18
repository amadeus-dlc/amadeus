上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# スケーラビリティ設計 — U1 サイズ分類台帳

本設計は `performance-requirements.md` の単一スイープ、`security-requirements.md` の repository 境界、`scalability-requirements.md` の規模増・別 OS 条件、`reliability-requirements.md` の決定性、`tech-stack-decisions.md` の Bun-only 方針、および `business-logic-model.md` の開いた tier 集計を具体化する。

## SCAL-D1: full-rescan による規模追随

テスト増減への追随方式は、実行ごとに `tests/` の `*.test.ts` を全域再列挙して台帳を再構築する full-rescan とする。incremental cache、差分 index、watch daemon は導入しない。これにより source の追加・削除、signal rule 変更、新 tier 追加を無効化契約なしで反映する。

計算量は総 source byte 数 B と file 数 N に対して、分類・集計 O(B + N)、決定的 sort O(N log N)、全体 O(B + N log N) である。N=442 は measurement ref のスナップショットであり、上限や autoscaling trigger ではない。

## SCAL-D2: 開いた Tier と有界な matrix

`Tier` は発見時 entry の logical tests-root-relative path の第1階層から導出する開いた文字列集合とし、`unit | integration | e2e | smoke` 以外の harness/lib や将来 tier も台帳へ可視化する。symlink でも canonical target の配置ではなく alias の logical path から導出し、台帳の `file` と tier の所属を一致させる。規約対象の `NamedTier` と台帳の `Tier` を同一 union に閉じない。

matrix は全組合せを事前確保せず、実在する `${tier}_${size}` key だけを持つ。key 数 K は最大でも実在 tier 数 × 3 size に比例し、row 数とは独立に疎なまま保つ。新 tier を自動で runner・coverage・purity policy の対象へ昇格させない。

## SCAL-D3: OS 可搬性

- 発見時 entry は separator の `/` / `\\` を受け、成果物用 `logicalRepoPath` と tier 用 `testsRelativePath` を `/` 区切りへ正規化する。
- containment/read 用 `canonicalTarget` は canonical tests root 配下の regular file に限定するが、成果物と tier へは使わない。
- normalized logicalRepoPath の一致と canonicalTarget identity の一致を全候補で別々に重複検査し、symlink alias による二重計上も fatal にする。複数衝突時は正規化済み collision pair の code-unit 辞書順最小を選ぶ。
- `buildLedgerRow` と `buildSizeLedger` は Bun/Node の FS APIや OS 分岐を持たない。

Bun の directory read 差異は FS 駆動側の責務とし、directory を source file として純関数へ渡さない。canonical/絶対 path と runtime 例外 message は outcome に含めないため、macOS・Linux・Windows で同じ logical path、source、failure kind、observed ref を渡した場合、同じ outcome を返すことを設計契約とする。

## SCAL-D4: 採用しないスケール機構

水平/垂直 autoscaling、load balancer、sharding、DB、read replica、cache、queue、worker pool、multi-region は、単発のローカル FS スイープに該当する負荷面がないため N/A とする。将来の性能実測なしに並列化しない。

現行 metrics snapshot の16 KiB serialisation limit は既存 snapshot envelope の制約であり、全行 `SizeLedger` の永続化上限として再利用しない。台帳の保存形式・出力先・容量制限は生成実装と同時に決める後続事項で、本 intent では adapter や dormant field を先行追加しない。
