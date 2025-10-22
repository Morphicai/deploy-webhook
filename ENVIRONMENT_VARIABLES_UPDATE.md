# 环境变量系统更新说明

## 更新内容

本次更新将环境变量系统中的项目引用从 **项目名称（projectName）** 改为 **项目ID（projectId）**，提升了系统的可靠性和数据一致性。

## 主要变更

### 1. 数据库结构变更

**文件**: `backend/src/migrations/002_update_env_table_project_id.ts`

- 将 `environment_variables` 表的 `project_name` 列改为 `project_id`
- 添加外键关联到 `applications` 表
- 自动迁移现有数据：将项目名称转换为对应的项目ID
- 添加索引以提升查询性能

**变更详情**:
```sql
-- 旧结构
CREATE TABLE environment_variables (
  ...
  project_name TEXT NOT NULL DEFAULT '',
  ...
);

-- 新结构
CREATE TABLE environment_variables (
  ...
  project_id INTEGER,
  ...
  FOREIGN KEY (project_id) REFERENCES applications(id) ON DELETE CASCADE
);
```

### 2. 后端服务更新

**文件**: `backend/src/services/envStore.ts`

- 更新 `EnvEntry` 类型定义，使用 `projectId` 替代 `projectName`
- 修改 `upsertEnvEntry` 函数，验证项目ID的有效性
- 更新 `listEnvEntries` 函数，支持通过项目ID查询
- 更新 `deleteEnvEntry` 函数，使用项目ID删除
- 增强 `buildEnvironmentForProject` 函数，支持通过ID或名称查询（向后兼容）

**文件**: `backend/src/routes/env.ts`

- 更新 API 接口，使用 `projectId` 参数替代 `projectName`
- 更新 Swagger 文档注释

### 3. 前端界面更新

**文件**: `ui/src/pages/Environment.tsx`

**关键改进**:
- 项目字段从**输入框**改为**下拉选择框**
- 从应用列表（Applications）中选择项目
- 显示格式：`项目名称 (镜像名称)`
- 保存时存储项目ID而不是项目名称
- 自动加载应用列表

**示例**:
```typescript
// 旧方式：手动输入项目名称
<Input 
  placeholder="my-project"
  value={formData.projectName}
/>

// 新方式：下拉选择项目
<Select 
  value={formData.projectId?.toString() || ''}
  onValueChange={(value) => setFormData({ ...formData, projectId: Number(value) })}
>
  <SelectContent>
    {applications.map((app) => (
      <SelectItem key={app.id} value={app.id.toString()}>
        {app.name} ({app.image})
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**文件**: `ui/src/services/api.ts`

- 更新 API 方法签名，使用 `projectId` 参数

### 4. 其他修复

**文件**: `backend/src/services/secretSyncService.ts`
- 更新环境变量导入，使用新的 `upsertEnvEntry` 函数
- 修复 Infisical SDK 导入问题

**文件**: `backend/src/routes/webhooks.ts`
- 修复中间件导入错误：`adminAuth` → `requireAdmin`

**文件**: `ui/src/pages/Webhooks.tsx`
- 移除未使用的 Table 组件导入

## 向后兼容性

✅ **完全向后兼容**

`buildEnvironmentForProject` 函数支持两种调用方式：

```typescript
// 通过项目ID查询（推荐）
buildEnvironmentForProject(projectId: number)

// 通过项目名称查询（向后兼容）
buildEnvironmentForProject(projectName: string)
```

这确保了现有的部署脚本和服务不会受到影响。

## 数据迁移

迁移脚本会自动执行，无需手动操作：

1. 检查 `project_id` 列是否存在
2. 如果不存在，创建新表结构
3. 将现有数据从 `project_name` 迁移到 `project_id`
4. 只迁移能找到对应应用的环境变量
5. 创建必要的索引和触发器

**注意**: 
- 如果某个环境变量的 `project_name` 找不到对应的应用，该记录不会被迁移
- 全局作用域（global）的环境变量不受影响

## 部署步骤

1. **停止服务**
   ```bash
   docker-compose down
   ```

2. **拉取最新代码**
   ```bash
   git pull origin main
   ```

3. **重新构建**
   ```bash
   docker-compose build
   ```

4. **启动服务**（迁移会自动执行）
   ```bash
   docker-compose up -d
   ```

5. **验证迁移**
   - 检查日志：`docker-compose logs backend`
   - 应该看到：`[Migration 002] Completed: environment_variables table updated successfully`

## 使用方法

### 添加项目级环境变量

1. 进入"环境变量"页面
2. 点击"添加变量"按钮
3. 选择作用域为"项目"
4. **从下拉列表中选择项目**（不再需要手动输入）
5. 输入变量名和值
6. 保存

### API 调用示例

```bash
# 创建项目级环境变量
curl -X POST http://localhost:9000/api/env \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "project",
    "projectId": 1,
    "key": "DATABASE_URL",
    "value": "postgres://..."
  }'

# 查询项目的所有环境变量
curl -X GET "http://localhost:9000/api/env?scope=project&projectId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 删除项目级环境变量
curl -X DELETE "http://localhost:9000/api/env?scope=project&key=DATABASE_URL&projectId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 优势

1. **数据一致性**: 通过外键约束确保环境变量引用的项目真实存在
2. **自动清理**: 当项目被删除时，关联的环境变量会自动删除（CASCADE）
3. **防止错误**: 无法添加不存在项目的环境变量
4. **用户友好**: 下拉选择比手动输入更直观，减少输入错误
5. **查询优化**: 通过项目ID查询比名称查询更快

## 故障排除

### 迁移失败

如果迁移失败，可以手动运行迁移：

1. 进入数据库容器：
   ```bash
   docker-compose exec backend sh
   ```

2. 检查数据库：
   ```bash
   sqlite3 data/deploy-webhook.db
   .schema environment_variables
   ```

3. 如果需要回滚，删除新表并重命名备份：
   ```sql
   DROP TABLE environment_variables;
   ALTER TABLE environment_variables_backup RENAME TO environment_variables;
   ```

### 旧数据丢失

如果发现某些环境变量在迁移后消失：
- 这些变量的项目名称可能与实际的应用名称不匹配
- 检查 `applications` 表，确认项目名称
- 手动重新添加这些环境变量

## 技术细节

### 数据库约束

```sql
-- 唯一性约束
UNIQUE(scope, project_id, key)

-- 外键约束
FOREIGN KEY (project_id) REFERENCES applications(id) ON DELETE CASCADE

-- 索引
CREATE INDEX idx_environment_variables_project_id ON environment_variables(project_id);
CREATE INDEX idx_environment_variables_scope ON environment_variables(scope);
```

### API 数据格式

**请求体（创建/更新）**:
```json
{
  "scope": "project",
  "projectId": 1,
  "key": "API_KEY",
  "value": "secret-value"
}
```

**响应体（查询）**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "scope": "project",
      "projectId": 1,
      "projectName": "my-app",  // 从 applications 表关联获取
      "key": "API_KEY",
      "value": "secret-value",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

## 相关文件

- 数据库迁移: `backend/src/migrations/002_update_env_table_project_id.ts`
- 环境变量服务: `backend/src/services/envStore.ts`
- 环境变量路由: `backend/src/routes/env.ts`
- 前端页面: `ui/src/pages/Environment.tsx`
- API 服务: `ui/src/services/api.ts`
- 部署服务: `backend/src/services/deployService.ts`

## 测试建议

1. **单元测试**: 测试新的环境变量 CRUD 操作
2. **集成测试**: 测试环境变量在应用部署时的加载
3. **UI 测试**: 验证项目下拉选择功能
4. **迁移测试**: 在测试环境验证数据迁移的正确性

---

**更新日期**: 2025-10-22  
**版本**: v1.1.0

