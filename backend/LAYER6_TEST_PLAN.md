# 第六层测试计划 - Deployment Logs (V2)

## 📋 测试概述

**测试文件**: `tests/integration/deploymentLogs.test.ts`  
**测试模块**: Deployment Logs (部署日志系统)  
**预计测试数**: 10 个  
**预计耗时**: ~90-120 秒（包含 Docker 容器操作）

---

## 🎯 测试目标

验证 V2 部署日志系统的完整功能，包括：
1. 部署日志的自动记录
2. 成功和失败部署的日志记录
3. 部署日志的查询和过滤
4. 部署详细信息的完整性
5. 认证和授权

---

## 📊 测试分组详情

### Group 1: Deployment Log Recording (3 tests)

#### Test 1.1: 应该记录 webhook 触发的部署日志
**目的**: 验证 webhook 部署时自动创建日志记录

**测试步骤**:
1. 预注册应用（启用 webhook）
2. 通过 webhook 部署应用
3. 查询部署日志
4. 验证日志记录存在且内容正确

**验证点**:
- [x] 日志记录自动创建
- [x] `triggerType` 为 `webhook`
- [x] `applicationId` 正确
- [x] `version` 正确
- [x] `status` 为 `success`
- [x] `deploymentId` 匹配

**预期结果**: 200 OK，日志记录完整

---

#### Test 1.2: 应该记录失败的部署日志
**目的**: 验证部署失败时正确记录错误信息

**测试步骤**:
1. 预注册应用（使用不存在的镜像）
2. 尝试部署（预期失败）
3. 查询部署日志
4. 验证失败记录和错误信息

**验证点**:
- [x] 失败日志被记录
- [x] `status` 为 `failed`
- [x] `errorMessage` 存在且有意义
- [x] `triggerType` 正确

**预期结果**: 200 OK，失败日志包含错误详情

---

#### Test 1.3: 应该包含部署时长信息
**目的**: 验证部署耗时统计功能

**测试步骤**:
1. 预注册应用
2. 部署应用
3. 查询部署日志
4. 验证 `durationMs` 字段

**验证点**:
- [x] `durationMs` 字段存在
- [x] `durationMs` 为数字类型
- [x] `durationMs` 大于 0

**预期结果**: 200 OK，耗时信息准确

---

### Group 2: Deployment Log Queries (3 tests)

#### Test 2.1: 应该能够按应用ID查询部署日志
**目的**: 验证按应用过滤日志功能

**测试步骤**:
1. 创建两个应用
2. 各部署一次
3. 查询特定应用的日志
4. 验证只返回该应用的日志

**验证点**:
- [x] 查询参数 `applicationId` 生效
- [x] 返回的所有日志都属于指定应用
- [x] 不包含其他应用的日志

**预期结果**: 200 OK，正确过滤

---

#### Test 2.2: 应该能够获取所有部署日志
**目的**: 验证查询所有日志功能

**测试步骤**:
1. 创建应用并部署多次
2. 查询所有部署日志（不传 `applicationId`）
3. 验证返回所有记录

**验证点**:
- [x] 返回数组类型
- [x] 包含所有部署记录
- [x] 至少包含刚才部署的记录

**预期结果**: 200 OK，返回所有日志

---

#### Test 2.3: 应该按时间倒序返回部署日志
**目的**: 验证日志排序功能

**测试步骤**:
1. 创建应用并部署多次
2. 查询部署日志
3. 验证返回顺序

**验证点**:
- [x] 最新的部署在最前面
- [x] `startedAt` 时间戳倒序排列
- [x] 排序逻辑正确

**预期结果**: 200 OK，时间倒序

---

### Group 3: Deployment Log Details (3 tests)

#### Test 3.1: 应该记录触发来源信息
**目的**: 验证触发来源记录功能

**测试步骤**:
1. 通过 webhook 部署应用
2. 查询部署日志
3. 验证 `triggerSource` 字段

**验证点**:
- [x] `triggerSource` 字段存在
- [x] `triggerSource` 为字符串类型
- [x] 内容为 IP 地址或标识符

**预期结果**: 200 OK，触发来源已记录

---

#### Test 3.2: 应该包含应用名称和镜像信息 ⚠️
**目的**: 验证关联信息查询功能

**测试步骤**:
1. 部署应用
2. 查询部署日志
3. 验证关联信息

**验证点**:
- [x] `applicationName` 正确
- [x] ⚠️ `image` 字段存在（**需要修复**）
- [x] `version` 正确

**预期结果**: 200 OK，关联信息完整

**⚠️ 问题**: 当前 `DeploymentLogRecord` 接口缺少 `image` 字段

---

#### Test 3.3: 应该记录部署唯一ID
**目的**: 验证部署 ID 唯一性

**测试步骤**:
1. 同一应用部署两次
2. 查询部署日志
3. 验证每次部署的 ID 唯一

**验证点**:
- [x] 每次部署有唯一的 `deploymentId`
- [x] 多次部署的 ID 不重复
- [x] ID 格式正确（UUID）

**预期结果**: 200 OK，ID 唯一

---

### Group 4: Authentication (1 test)

#### Test 4.1: 应该拒绝未认证的部署日志访问
**目的**: 验证 API 认证保护

**测试步骤**:
1. 清除认证 token
2. 尝试访问部署日志 API
3. 验证被拒绝

**验证点**:
- [x] 返回 401 Unauthorized
- [x] `success` 为 `false`
- [x] 有明确的错误信息

**预期结果**: 401 Unauthorized

---

## 🐛 发现的问题

### P0 - 严重问题

#### 问题 1: `DeploymentLogRecord` 缺少 `image` 字段

**位置**: 
- `src/services/deploymentLogStore.ts:16-29`
- `tests/integration/deploymentLogs.test.ts:375`

**问题描述**:
测试用例期望 `deployLog.image` 存在，但 `DeploymentLogRecord` 接口和数据库查询都没有包含 `image` 字段。

**当前查询**:
```sql
SELECT 
  dl.*,
  a.name as application_name
FROM deployment_logs dl
LEFT JOIN applications a ON dl.application_id = a.id
```

**需要修改为**:
```sql
SELECT 
  dl.*,
  a.name as application_name,
  a.image as application_image
FROM deployment_logs dl
LEFT JOIN applications a ON dl.application_id = a.id
```

**修复方案**:
1. 更新 `DeploymentLogRecord` 接口添加 `image?: string` 字段
2. 更新所有查询 SQL（`getDeploymentLogById`, `getDeploymentLogByDeploymentId`, `listDeploymentLogs`）
3. 更新 `mapRow` 函数处理 `application_image` 字段

---

## 🔧 修复清单

### 必须修复（阻塞测试）

- [ ] **修复 1**: 添加 `image` 字段到 `DeploymentLogRecord` 接口
- [ ] **修复 2**: 更新 `listDeploymentLogs` SQL 查询
- [ ] **修复 3**: 更新 `getDeploymentLogById` SQL 查询
- [ ] **修复 4**: 更新 `getDeploymentLogByDeploymentId` SQL 查询
- [ ] **修复 5**: 更新 `mapRow` 函数

### 可选优化

- [ ] 添加按 `status` 过滤的测试
- [ ] 添加 `limit` 参数的测试
- [ ] 添加按 `triggerType` 过滤的测试
- [ ] 添加分页功能测试

---

## 📝 测试执行计划

### 阶段 1: 修复代码（预计 10 分钟）
1. 修改 `DeploymentLogRecord` 接口
2. 更新所有 SQL 查询
3. 更新 `mapRow` 函数
4. 验证编译无错误

### 阶段 2: 运行测试（预计 2 分钟）
1. 运行完整测试套件
2. 记录失败的测试
3. 分析失败原因

### 阶段 3: 调试修复（按需）
1. 针对失败测试进行调试
2. 修复发现的问题
3. 重新运行测试

### 阶段 4: 验证通过（预计 1 分钟）
1. 确认所有测试通过
2. 检查测试覆盖
3. 生成测试报告

---

## 🎯 预期结果

### 成功标准
- ✅ 10/10 测试通过
- ✅ 无 TypeScript 编译错误
- ✅ 无运行时错误
- ✅ 测试执行时间 < 120 秒
- ✅ 所有 Docker 容器正确清理

### 性能指标
- 平均每测试: ~10-12 秒
- 最慢测试: ~18 秒（多次部署测试）
- 最快测试: ~1 秒（认证测试）

---

## 🔐 安全验证点

- [x] 需要认证才能访问 API
- [x] 只能访问有权限的应用日志
- [x] 敏感信息不在日志中暴露
- [x] 触发来源正确记录

---

## 📊 数据完整性验证

### 必需字段
- [x] `id` - 日志唯一标识
- [x] `applicationId` - 应用 ID
- [x] `applicationName` - 应用名称
- [x] ⚠️ `image` - 镜像名称（需要添加）
- [x] `version` - 镜像版本
- [x] `deploymentId` - 部署唯一 ID
- [x] `triggerType` - 触发类型
- [x] `triggerSource` - 触发来源
- [x] `status` - 部署状态
- [x] `startedAt` - 开始时间
- [x] `completedAt` - 完成时间（可选）
- [x] `durationMs` - 耗时（可选）
- [x] `errorMessage` - 错误信息（可选）

---

## 📈 覆盖的场景

### 成功场景 (6)
1. ✅ Webhook 触发的成功部署
2. ✅ 查询所有日志
3. ✅ 按应用过滤日志
4. ✅ 时间倒序排列
5. ✅ 记录完整信息
6. ✅ 唯一 ID 生成

### 失败场景 (2)
1. ✅ 镜像拉取失败
2. ✅ 未认证访问

### 边界场景 (2)
1. ✅ 多次部署同一应用
2. ✅ 多应用并发部署

---

## 🚀 执行命令

```bash
# 运行第六层测试
npm test -- deploymentLogs.test.ts

# 运行特定测试组
npm test -- deploymentLogs.test.ts -t "Deployment Log Recording"
npm test -- deploymentLogs.test.ts -t "Deployment Log Queries"
npm test -- deploymentLogs.test.ts -t "Deployment Log Details"
npm test -- deploymentLogs.test.ts -t "Authentication"

# 查看详细输出
npm test -- deploymentLogs.test.ts --verbose

# 运行单个测试
npm test -- deploymentLogs.test.ts -t "应该记录 webhook 触发的部署日志"
```

---

## 📁 相关文件

### 核心文件
- `src/services/deploymentLogStore.ts` - 部署日志数据存储
- `src/routes/deploymentLogs.ts` - 部署日志 API 路由
- `src/routes/webhookDeploy.ts` - Webhook 部署（创建日志）
- `tests/integration/deploymentLogs.test.ts` - 测试文件

### 依赖文件
- `src/services/database.ts` - 数据库表定义
- `src/services/applicationStore.ts` - 应用数据存储
- `tests/helpers/apiClient.ts` - API 测试客户端
- `tests/helpers/fixtures.ts` - 测试数据生成器

---

## ✅ 准备工作检查清单

在开始测试前，确保：

- [x] 数据库表定义正确（`deployment_logs`）
- [x] API 路由已注册（`/api/deployment-logs`）
- [x] Docker 环境可用
- [ ] `DeploymentLogRecord` 接口完整（**需要添加 `image` 字段**）
- [x] 测试数据生成器就绪
- [x] 测试隔离机制正常
- [x] 容器清理机制正常

---

## 🎓 关键技术点

### 1. 部署日志的自动记录
- Webhook 部署开始时创建 `pending` 状态日志
- 部署完成/失败时更新状态和完成时间
- 自动计算耗时 `durationMs`

### 2. 关联查询
- LEFT JOIN applications 表获取应用信息
- 避免 N+1 查询问题
- 返回完整的关联数据

### 3. 时间排序
- ORDER BY started_at DESC
- 最新的部署在最前面
- 便于查看最近的部署历史

### 4. 错误处理
- 失败部署记录错误信息
- 错误信息不暴露敏感数据
- 便于问题排查

---

## 🎯 下一步行动

### 立即执行
1. **修复 `image` 字段缺失问题**
2. **运行测试验证修复**
3. **记录测试结果**

### 后续优化
1. 添加更多过滤条件测试
2. 添加分页功能测试
3. 添加统计功能测试
4. 性能测试和优化

---

## 📝 测试结果模板

```
第六层测试结果 - Deployment Logs

执行时间: [YYYY-MM-DD HH:mm:ss]
总测试数: 10
通过: __/10
失败: __/10
跳过: __/10
耗时: __ 秒

失败测试:
1. [测试名称] - [失败原因]
2. ...

待修复问题:
1. [问题描述] - [优先级]
2. ...

总结:
[测试总结]
```

---

## 🎉 目标

完成第六层测试，实现：
- ✅ 100% 测试通过
- ✅ 完整的部署日志功能
- ✅ 良好的查询性能
- ✅ 完善的错误处理
- ✅ 清晰的测试文档

**准备开始测试！** 🚀

