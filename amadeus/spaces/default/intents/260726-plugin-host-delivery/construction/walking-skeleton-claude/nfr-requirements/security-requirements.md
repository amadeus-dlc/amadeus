# セキュリティ要件 — U2 walking-skeleton-claude

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## fail-closed CLI(mutation 前拒否)

business-rules の BR-U2-4(fail-closed CLI)を継承する。business-logic-model のフロー 1 は `argv → parsePluginCliArgs(fail-closed)` を先頭に置き、未知 verb・未知フラグ・余剰引数は合成処理へ到達する前に拒否する。

- 合否: 未知 verb・未知フラグ・余剰引数が mutation(discoverPlugins 以降の状態変更経路)へ不到達で usage を出し exit 2 を返す(ADR-3 セキュリティ契約)。落ちる実証として型不正・余剰引数ケースを注入し、拒否が mutation 前に成立することをテスト固定する
- 合否: フック起動の失敗(business-logic-model フロー 2 の hook 実行失敗)は stderr 1 行警告+セッション継続とし、起動をブロックしない(BR-U2-4)。construction.md Error Handling のサイレント失敗禁止に従い、失敗は必ず loud に出す

## 安全契約の維持(trust / no-clobber / atomic / path escape)

requirements の NFR-1(安全契約の維持)を継承する。business-logic-model のフロー 1 は inspectPlugin(trust / no-clobber 検査含む)・applyPluginPlan(atomic tx)を既存 engine のまま通す。business-rules の BR-U2-1(単一実装)のとおり、CLI・フックは合成ロジックを再実装せず、trust grant・no-clobber・path escape 拒否は engine 側の現行水準をそのまま継承する。

- 合否: trust grant・no-clobber・アトミック commit/recovery・drift 保護・path escape 拒否・same-name stage 拒否・unknown sensor 拒否が現行水準を下回らない(NFR-1 の全 7 項目 — フロー 1 の再コンパイル起動により same-name stage / unknown sensor の拒否も U2 の合否対象)。フロー 5(claude 最小投影)の出力先安全検査は、既存投影でない非空 dir / file / symlink outDir を plan 段で拒否する(ADR-5 拒否集合の claude 面最小 — 全集合は U3)
- 合否: 認可・監査面の変更は project.md Mandated の認可テスト群(directive contract / state transition / audit invariant / race / harness drift)で検証する

## 実起動検証(verification theatre 禁止)

business-rules の BR-U2-6(実起動検証)のとおり、claude SessionStart からの自動 compose は native hook の実起動テストで検証する。settings.json への配線実在のみの検査(manifest 実在のみの verification theatre)は不合格とする(requirements FR-3b 合否)。認可バイパスの見逃しを防ぐため、フックが「実際に起動して compose 入口を呼ぶ」ことを実測する。

- 合否: 自動経路が native hook の実起動テストで検証される。配線実在のみのテストは不合格

## 認証情報の非保持

technology-stack のとおり本フレームワークは HTTP・DB を持たず新規ランタイム依存ゼロで、資格情報を保持・出力する経路を持たない。CLI・フックが外部を呼ぶ場合も requirements NFR-3(Bun-only)と整合し、token を保存しない。
