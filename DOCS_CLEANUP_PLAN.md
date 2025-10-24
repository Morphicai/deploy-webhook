# 📚 文档清理计划

## 📋 文档分类

### ✅ 保留 - 核心用户文档 (16个)

| 文档 | 类型 | 说明 |
|------|------|------|
| `README.md` / `README.en.md` | 主文档 | 项目介绍 |
| `QUICKSTART.md` / `QUICKSTART.en.md` | 快速开始 | 快速上手指南 |
| `USER_GUIDE.md` | 用户指南 | 详细使用说明 |
| `MCP_GUIDE.md` | MCP指南 | MCP功能说明 |
| `MCP_QUICKSTART.md` | MCP快速开始 | MCP快速上手 |
| `MCP_ARCHITECTURE.md` | MCP架构 | MCP技术架构 |
| `DOCKER_APP_GUIDE.md` | Docker指南 | Docker部署说明 |
| `DOCKER_HUB_PAT.md` | Docker认证 | Docker Hub令牌 |
| `DOMAIN_MANAGEMENT.md` | 域名管理 | 域名配置说明 |
| `PORT_MAPPING_GUIDE.md` | 端口映射 | 端口配置指南 |
| `REPOSITORY_MANAGEMENT.md` | 仓库管理 | 镜像仓库管理 |
| `SECRET_PROVIDER_GUIDE.md` | 秘钥提供商 | 秘钥管理说明 |
| `WEBHOOK_MANAGEMENT.md` | Webhook管理 | Webhook配置 |
| `INFISICAL_SYNC_GUIDE.md` | Infisical同步 | Infisical集成 |
| `INFISICAL_WEBHOOK_GUIDE.md` | Infisical Webhook | Infisical webhook |
| `MONOREPO.md` | 项目结构 | Monorepo说明 |

### ✅ 保留 - Backend文档 (5个)

| 文档 | 说明 |
|------|------|
| `backend/CHANGELOG.md` | 变更日志 |
| `backend/ENV_VARS.md` | 环境变量 |
| `backend/FEATURES.md` | 功能列表 |
| `backend/TESTING_GUIDE.md` | 测试指南 |
| `backend/TESTING_QUICKSTART.md` | 测试快速开始 |
| `backend/tests/README.md` | 测试说明 |

### ✅ 保留 - UI文档 (2个)

| 文档 | 说明 |
|------|------|
| `ui/README.md` | UI项目说明 |
| `ui/DATA_TESTID_GUIDE.md` | 测试标识指南 |

---

## 🗑️ 删除 - 过期/过程性文档 (共54个)

### 1. 测试过程文档 (12个) - 已完成，不再需要

```
./E2E_TEST_RESULTS.md
./TEST_COLLECTION_COMPLETE.md
./TEST_ENV_SUCCESS.md
./TEST_RESULTS_SUMMARY.md
./TEST_SETUP_COMPLETE.md
./TEST_IMPROVEMENTS_COMPLETE.md
./UI_FORM_MISMATCH_ANALYSIS.md
./ISSUE_RESOLVED.md
./READY_TO_TEST.md
./DOM_WAIT_IMPROVEMENTS.md
./RUN_E2E_WITH_UI.md
./RUN_E2E_TESTS_MANUAL.md
```

**原因**: 这些是测试实施过程中的临时文档，测试完成后不再需要。

### 2. 测试问题分析文档 (7个) - 问题已解决

```
./TEST_ISSUES_ANALYSIS.md
./TEST_ISSUES_FLOWCHART.md
./TEST_ISSUES_QUICKREF.md
./TEST_ISSUES_SUMMARY.zh.md
./PHASE1_TEST_ANALYSIS.md
./PHASE2_TEST_COMPLETE.md
./PHASE2_TEST_PROGRESS.md
```

**原因**: 测试问题分析文档，问题已修复，不再需要保留。

### 3. 已实施的设计文档 (6个) - 已合并到代码

```
./DATA_MODEL_V2_DESIGN.md
./DATA_MODEL_V2_WORKFLOW.md
./WEBHOOK_UNIFICATION_DESIGN.md
./TARGET_URL_DESIGN.md
./IMPLEMENTATION_STATUS.md
./ENVIRONMENT_VARIABLES_UPDATE.md
```

**原因**: V2数据模型已实施完成，设计文档已过期。

### 4. UI API修复文档 (5个) - 已完成

```
./UI_API_COMPATIBILITY_AUDIT.md
./UI_API_FIXES_COMPLETED.md
./UI_API_FIXES_QUICK_REF.md
./UI_BUILD_FIX_SUMMARY.md
./UI_TEST_STRATEGY_SUMMARY.md
```

**原因**: UI API修复已完成，过程文档不再需要。

### 5. Backend测试过程文档 (9个) - 已完成

```
./backend/FINAL_TESTING_SUMMARY.md
./backend/LAYER4_DEBUG_SUMMARY.md
./backend/LAYER5_BUG_FIXES.md
./backend/LAYER5_CODE_REVIEW.md
./backend/LAYER5_TEST_COMPLETE.md
./backend/LAYER6_PRE_TEST_FIX.md
./backend/LAYER6_TEST_COMPLETE.md
./backend/LAYER6_TEST_PLAN.md
./backend/TESTING_PROGRESS_SUMMARY.md
```

**原因**: 分层测试过程文档，测试完成后不再需要。

### 6. UI测试过程文档 (12个) - 已完成

```
./ui/CONFIG_IMPROVEMENTS.md
./ui/E2E_TESTING_GUIDE.md
./ui/E2E_TEST_README.md
./ui/E2E_TEST_STRATEGY.md
./ui/PLAYWRIGHT_WEBSERVER_BEST_PRACTICES.md
./ui/RUN_E2E_TESTS.md
./ui/RUN_TESTS_GUIDE.md
./ui/START_TESTING.md
./ui/TEST_CONFIG.md
./ui/TEST_ENVIRONMENT_SUMMARY.md
./ui/UI_E2E_QUICK_START.md
./ui/UI_E2E_TEST_PLAN.md
```

**原因**: UI E2E测试配置和实施过程文档，已完成不再需要。

### 7. 测试策略文档 (2个) - 需要合并

```
./TESTING.md
./TESTING_STRATEGY_V2.md
```

**原因**: 两个测试策略文档内容重复，应该合并为一个。

---

## 📝 需要创建的文档 (1个)

### `TESTING.md` - 统一的测试文档

合并 `TESTING.md` 和 `TESTING_STRATEGY_V2.md`，创建一个清晰的测试说明文档。

**内容应包括**:
- 测试环境配置
- 运行测试的方法
- 测试覆盖范围
- 后端测试（6层分层测试）
- UI E2E测试（认证流程）

---

## 📊 清理统计

| 类别 | 保留 | 删除 | 合并 |
|------|------|------|------|
| 核心文档 | 16 | 0 | 0 |
| Backend文档 | 6 | 9 | 0 |
| UI文档 | 2 | 12 | 0 |
| 测试文档 | 0 | 21 | 2 |
| 设计文档 | 0 | 6 | 0 |
| API修复文档 | 0 | 5 | 0 |
| **总计** | **24** | **54** | **2** |

---

## ✅ 执行计划

1. **删除54个过期文档**
2. **保留24个核心文档**
3. **合并并创建1个统一的测试文档**

**预期结果**: 
- 从 80 个文档减少到 25 个文档
- 减少 **68.75%** 的文档数量
- 保留所有有用的核心文档
- 提高文档可维护性和可读性

