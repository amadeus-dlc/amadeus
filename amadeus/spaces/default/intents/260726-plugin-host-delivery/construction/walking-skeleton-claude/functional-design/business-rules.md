# Business Rules — U2 walking-skeleton-claude

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## BR 一覧

- **BR-U2-1(単一実装)**: 合成・drop・診断・復旧のロジックは移設済み engine のみ。CLI・フックに合成の再実装・分岐複製を置かない(requirements FR-3a。検証: CLI 経由の合成結果 = engine 直呼びテスト結果の同一性)
- **BR-U2-2(冪等)**: 同一プラグイン集合での compose 再実行後、host bytes・composition record は byte-identical、fragment 重複挿入なし(FR-3c-冪等)
- **BR-U2-3(no-op 高速路)**: composition record 最新時の `compose --if-stale` は apply 段へ不到達で早期 return(FR-3c-no-op。検証: 到達カウンタ or 書込不発生 assert)。セッション起動レイテンシの数値予算は build-and-test で実測固定(推定値を基準にしない)
- **BR-U2-4(fail-closed CLI)**: 未知 verb・未知フラグ・余剰引数は mutation 不到達で usage+exit 2(ADR-3 セキュリティ契約)。フック起動の失敗は stderr 1 行警告+セッション継続(起動ブロック禁止)
- **BR-U2-5(アトミック)**: compose 途中失敗時に host bytes / composition record / audit が不変(既存 t253 系の維持 — 移設後も同テストで担保)
- **BR-U2-6(実起動検証)**: claude SessionStart からの自動 compose は native hook の実起動テストで検証する。settings.json への配線実在のみの検査は不合格(verification theatre 禁止 — FR-3b 合否)
- **BR-U2-7(移設先頭)**: engine 移設+消費側 import 更新+既存テスト green を Unit 内の先頭手順とし、旧パスへの互換 re-export を置かない(org.md Forbidden。unit-of-work.md U2 / bolt-plan の Bolt 内順序)
- **BR-U2-8(baseline 復元)**: 最後のプラグイン drop 後の host ツリーは 0-plugin build と byte-identical(hash 比較 — FR-6)
- **BR-U2-10(claude 投影)**: claude 最小投影(business-logic-model フロー 5)は生成物の期待位置実在・トークン置換・0-plugin no-op(baseline hash 一致)をテストで固定する(requirements FR-2 の claude 面合否。outDir 拒否の全集合と --check 編入は U3 — 分担は unit-of-work.md U2/U3 行)
- **BR-U2-9(dist 同期)**: 移設・CLI 新設・フック配線の正本変更は同一変更で dist / self-install を再生成し drift ガード green(project.md Mandated)

- **BR-U2-11(DropsRecord 骨格 — U5 FD レビュー指摘の申告付き追加 2026-07-27)**: compose 適用経路は DropsRecord(composition record 隣接の drops 記録 — U5 domain-entities が形状の正本)を書く。claude 面では通常空、未解決 anchor 発生時に entries を記録(requirements FR-4(d) dropped-with-log の受け皿)。プラグイン別分離(他プラグインの drops を消さない)

## 検証への trace

各 BR は U2 の統合テスト(story-map ジャーニー 1 の E2E)と既存 t252-254(移設面)へ割付け。詳細のテスト設計は nfr 系ステージと code-generation の plan で確定(先取りしない)。
