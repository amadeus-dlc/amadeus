# Decision Log — 260706-installer-versioning（Ideation phase）

上流入力: 各ステージの decision 記録（audit shard）と questions ファイル

| # | 判断 | 選択肢と不採用理由 | 出典 |
|---|---|---|---|
| D-1 | ピア協議 6 問すべて推奨案 A を採用（6 名全問一致） | 各問の B/C 案は feasibility-questions.md の候補欄を参照（併置型 = 非収束で契約衝突、md5 = 現役実装なし、削除尊重 = エンジン完全性と矛盾、等） | feasibility の decision（2026-07-06T09:01〜） |
| D-2 | 退避の配置 = 集中退避 dir（個別 _orig 直置きは不採用） | 直置きは BR-13 干渉（skills 配下で退避物が消える）と世代衝突を起こす | feasibility の decision（engineer1 / reviewer 補強） |
| D-3 | #579（fable 混入）は合流しない（バックログへ） | 合流は scope 肥大 + #554 依存追加。manifest 意味論（配布時に書き込んだ内容の hash）が分離を安全にする | scope-definition の decision |
| D-4 | 3-way merge・世代管理・自動清掃は作らない | Right-Sizing（暫定機構に堅牢化を作り込まない）。退避 + 利用者の再適用で足りる | scope-document / rough-mockups |
| D-5 | scope は feature を維持 | 実装 + eval + README の全部入りで縮退理由なし | scope-definition-questions |
| D-6 | mob は組まない（単独 + 独立 reviewer） | 接触面解消済み・協議確定済みで合議点は gate が担う | team-formation（mob-composition） |
