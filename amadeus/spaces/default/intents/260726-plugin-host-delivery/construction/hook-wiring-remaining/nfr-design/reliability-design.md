# 信頼性設計 — U4 hook-wiring-remaining

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## REL-U4-1 への設計: 配線 XOR DegradeContract の全数 assert

`reliability-requirements.md` REL-U4-1(BR-U4-4 の 2 軸閉包)を、**マトリクス導出の全面列挙に対する XOR 判定関数+全数 assert テスト**として設計する:

```
resolveFaceDisposition(face: MatrixFace): FaceDisposition
  FaceDisposition … { kind: "wired", wiringPoint } | { kind: "degraded", contract: DegradeContract }
  判定: clazz == manual-only → degraded
        composeTrigger == deferred → degraded          // 2 軸目(iteration 1 で捕捉した沈黙欠落の芽の封鎖)
        それ以外(measured かつ非 manual-only) → wired
```

- 戻り値を **2 値判別 union に閉じる**(第 3 の「どちらでもない」を型で表現不能にする — parse-don't-validate)。これにより「配線なし かつ degrade なし」は関数の値域に存在せず、沈黙欠落が構造的に不能
- 全数 assert テスト: 全面(U1 マトリクスの機械可読列挙)へ `resolveFaceDisposition` を適用し、(a) 全面が 2 値のどちらかに落ちる (b) wired 面は配線実在(アダプタ内 HookInvocation の grep/parse)、degraded 面は DegradeContract 実在(手順書+DropsRecord advisory エントリ)を照合する。`scalability-requirements.md` SCALE-U4-2 のとおり面数増に自動追従
- degraded 面の可観測性: doctor advisory 行の文字列 assert(U5 BR-U5-2(a) と共有)。昇格経路(deferred → measured 時の配線移行+DegradeContract 除去)は `resolveFaceDisposition` がマトリクス再読込で自動反転する — 手動の集合更新を要しない

## REL-U4-2 への設計: 失敗時継続

`reliability-requirements.md` REL-U4-2 の設計は security-design.md の SEC-U4-2 設計(`security-requirements.md` SEC-U4-2 の stderr 1 行+exit 0 契約)と同一(参照継承 — 二重規定しない)。compose 失敗 fixture の「セッション起動成功+警告出力」テストで検証する。

## REL-U4-3 への設計: 実起動検証(verification theatre 禁止)

`reliability-requirements.md` REL-U4-3 と `business-logic-model.md` フロー 3 のとおり:

- 対応面: native hook を実起動し、compose `--if-stale` の実行(noop 経路含む — `performance-requirements.md` PERF-U4-1 の書込不発生 assert と同乗)を観測する。配線 manifest の実在 grep だけのテストは不合格とする
- 実起動が構造的に不能な面: U1 マトリクスの deferred 記録に従い、文書化された手動 fallback E2E で代替し、**代替した事実自体をテスト期待値として固定**する(暗黙成功禁止)。seam-writer-mode-precondition に従い、実起動テストは「フック起動側(書き手)がその面の起動モードで実際に発火するか」を検証対象へ含め、テスト自身が起動をスタブ代替しない

## REL-U4-4 への設計: dist 同期

`reliability-requirements.md` REL-U4-4 のとおり、配線の正本(`harness/<name>/hooks/` / opencode plugin)変更後に `bun scripts/package.ts` + `bun run promote:self` を同一変更で再生成し、`dist:check` / `promote:self:check` green を検証手順に固定する(project.md Mandated)。

## 非該当カテゴリ

N/A — `reliability-requirements.md` 非該当カテゴリ(可用性 SLO / 自動リトライ)の N/A を参照継承。
