# 信頼性設計 — U3 host-projection-all

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## REL-U3-2 への設計: write⇔check の hash 共有(単一判定関数)

`reliability-requirements.md` REL-U3-2(write⇔check 対称)の中核設計は、**hash 判定関数を 1 つだけ持つ**ことである:

```
computeProjectionHash(bytes: Uint8Array): string        // 唯一の hash 定義
write 側: projectPluginForHarness が投影確定 bytes へ適用し、投影 metadata へ記録
check 側: checkPluginProjections が同関数で再計算し、記録値と比較
```

- 対称性は「同じ関数を両側が呼ぶ」構造で担保し、check 専用の再実装を禁止する(symmetric-pair-review を実装構造へ焼き込む)。`performance-requirements.md` PERF-U3-2 の「追加コストは stat + hash に限定」もこの共有の帰結
- `DriftEntry` は判別 union `{ kind: "stale", path } | { kind: "orphan", path }` とし、stale(正本変更後未再投影)と orphan(正本なき投影物)の**両方向**を型で強制列挙する(`business-logic-model.md` フロー 2)
- 落ちる実証: stale fixture / orphan fixture の両側で `--check` 赤を fixture 対照テストで固定。drift ガード編入(REL-U3-2 第 2 合否)は投影物の手編集 fixture で `dist:check` / `promote:self:check` 赤を実証

## REL-U3-1 への設計: 0-plugin byte-identical

`reliability-requirements.md` REL-U3-1 は performance-design.md の no-op 分岐(`ProjectionResult{noop-zero-plugin}` — `business-logic-model.md` フロー 1 末尾)が構造的に担保する。検証は 0-plugin build 出力の baseline hash 比較で、U7 適合テスト(t188 対応)と共有し二重実装しない。実行順序の前提: unit-of-work-dependency.md の DAG では U3 が U7 に先行するため、共有テストが未存在の間は U3 側で byte-identical 検証テストを新設し、U7 は追跡表からそれを covered-existing として参照する。

## REL-U3-3 への設計: 部分失敗 loud(収集 → 列挙 → 非 0)

`reliability-requirements.md` REL-U3-3 のとおり、面単位の投影失敗は**即 throw せず収集**し、全面処理後に失敗面を列挙して exit 非 0 とする:

```
results: ProjectionResult[]  … { kind: "ok" | "refused" | "io-failed", harness, detail }
失敗が 1 件でもあれば: stderr へ失敗面名を全列挙 → exit 1
```

- 「1 面の失敗で他面の診断情報が失われる」ことと「部分成功の無音継続」の両方を排除する(fail-loud かつ全面診断)。`security-requirements.md` SEC-U3-1 の refused も同じ results 収集へ合流し、エラー表面を単一化する

## REL-U3-4 への設計: アトミック性の維持

`reliability-requirements.md` REL-U3-4 のとおり、既存 engine のアトミック commit/recovery 経路には触れない(U3 の書込先は `dist/plugins/` 投影 outDir のみ)。面内の順序契約「plan 段拒否 → mutation」(security-design.md 層 2)により、拒否ケースでは書込ゼロ、I/O 失敗ケースでも check(REL-U3-2)が中間状態を stale/orphan として検出可能 — 中間状態の無音残存を作らない。既存 t253 系アトミック性テストの green 維持で退行を検証する。`scalability-requirements.md` SCALE-U3-1 の面間独立(共有可変状態なし)も、面 A の失敗が面 B の整合を壊さないことの担保として本設計と連動する。

## 非該当カテゴリ

N/A — `reliability-requirements.md` 非該当カテゴリ(可用性 SLO / リトライ)の N/A を参照継承。
