# Integration Test Instructions

Unit: u001-installer-versioning（feature scope）

## 適用

installer eval（dev-scripts/evals/installer/check.ts、342 assertion）が統合テスト本体である: 実インストーラを隔離 tmp workspace へ実走行し、manifest 生成・3-way 全象限・退避・廃止・bootstrap・冪等・version-info・path 注入拒否・AD-6 settings 特則・既存 #451 全機能の回帰を端から端まで検証する（FR-5.1 (a)〜(i) + sec + AD-6）。

## 実行方法

```sh
npm run test:it:installer
```

隔離 workspace は成功・失敗とも片付く（DR-3）。
