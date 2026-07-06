# RAID Log — 260706-installer-versioning（Issue #543）

上流入力: [feasibility-assessment.md](feasibility-assessment.md)

| 種別 | 項目 | 対応 |
|---|---|---|
| Risk | bootstrap（manifest 不在の既導入環境）では 3-way が成立せず、旧版差分とカスタマイズを区別できない | ピア協議 Q6 で初回の扱いを確定（保守的に併置 / 明示 flag / 無条件上書き + 告知のいずれか） |
| Risk | 退避型は 2 回目の改変検出で _orig を上書きし初回退避を失う | 世代管理はせず、summary の明示告知で補う（協議で確認） |
| Risk | 併置型はエンジン改変が生き続け、配布契約と衝突する | 適用範囲の設計（エンジン = 収束優先、文書 = 保全優先の分割）を協議 Q5 で扱う |
| Assumption | インストーラは clone 済み repo から実行される（git rev-parse で配布元 commit を取得可能） | requirements で明文化 |
| Issue | #573 が scripts/amadeus-install.ts と installer eval に接触中 | 順序制約 C-6 で吸収済み（Construction は merge 後） |
| Dependency | 設計論点の確定は全メンバー同報ピア協議 + gate | feasibility 完了時に協議を発信（本ステージ） |
