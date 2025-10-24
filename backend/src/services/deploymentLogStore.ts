import { getDb } from './database';

/**
 * 触发类型
 */
export type TriggerType = 'manual' | 'webhook' | 'api' | 'scheduled';

/**
 * 部署状态
 */
export type DeploymentStatus = 'pending' | 'success' | 'failed';

/**
 * 部署日志记录
 */
export interface DeploymentLogRecord {
  id: number;
  applicationId: number;
  applicationName?: string;        // 关联查询时填充
  image?: string;                  // 关联查询时填充（镜像名称）
  version: string;
  deploymentId: string;
  triggerType: TriggerType;
  triggerSource: string | null;
  status: DeploymentStatus;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

/**
 * 创建部署日志输入
 */
export interface CreateDeploymentLogInput {
  applicationId: number;
  version: string;
  deploymentId: string;
  triggerType: TriggerType;
  triggerSource?: string;
  status?: DeploymentStatus;
}

/**
 * 更新部署日志输入
 */
export interface UpdateDeploymentLogInput {
  status?: DeploymentStatus;
  errorMessage?: string;
  completedAt?: string;
}

/**
 * 映射数据库行到接口
 */
function mapRow(row: any): DeploymentLogRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    applicationName: row.application_name,
    image: row.application_image,  // 从关联查询获取
    version: row.version,
    deploymentId: row.deployment_id,
    triggerType: row.trigger_type as TriggerType,
    triggerSource: row.trigger_source,
    status: row.status as DeploymentStatus,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
  };
}

/**
 * 创建部署日志
 */
export function createDeploymentLog(input: CreateDeploymentLogInput): number {
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO deployment_logs (
      application_id, version, deployment_id, trigger_type, trigger_source, status
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    input.applicationId,
    input.version,
    input.deploymentId,
    input.triggerType,
    input.triggerSource || null,
    input.status || 'pending'
  );
  
  return Number(info.lastInsertRowid);
}

/**
 * 更新部署日志
 */
export function updateDeploymentLog(id: number, input: UpdateDeploymentLogInput): void {
  const db = getDb();
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }
  
  if (input.errorMessage !== undefined) {
    updates.push('error_message = ?');
    values.push(input.errorMessage);
  }
  
  if (input.completedAt !== undefined) {
    updates.push('completed_at = ?');
    values.push(input.completedAt);
    
    // 计算耗时
    const log = getDeploymentLogById(id);
    if (log) {
      const startTime = new Date(log.startedAt).getTime();
      const endTime = new Date(input.completedAt).getTime();
      const durationMs = endTime - startTime;
      
      updates.push('duration_ms = ?');
      values.push(durationMs);
    }
  }
  
  if (updates.length === 0) return;
  
  values.push(id);
  db.prepare(`UPDATE deployment_logs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

/**
 * 根据 ID 获取部署日志
 */
export function getDeploymentLogById(id: number): DeploymentLogRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT 
      dl.*,
      a.name as application_name,
      a.image as application_image
    FROM deployment_logs dl
    LEFT JOIN applications a ON dl.application_id = a.id
    WHERE dl.id = ?
  `).get(id);
  return row ? mapRow(row) : null;
}

/**
 * 根据 deploymentId 获取部署日志
 */
export function getDeploymentLogByDeploymentId(deploymentId: string): DeploymentLogRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT 
      dl.*,
      a.name as application_name,
      a.image as application_image
    FROM deployment_logs dl
    LEFT JOIN applications a ON dl.application_id = a.id
    WHERE dl.deployment_id = ?
  `).get(deploymentId);
  return row ? mapRow(row) : null;
}

/**
 * 列出部署日志
 */
export interface ListDeploymentLogsOptions {
  applicationId?: number;
  status?: DeploymentStatus;
  triggerType?: TriggerType;
  limit?: number;
  offset?: number;
}

export function listDeploymentLogs(options: ListDeploymentLogsOptions = {}): DeploymentLogRecord[] {
  const db = getDb();
  
  let query = `
    SELECT 
      dl.*,
      a.name as application_name,
      a.image as application_image
    FROM deployment_logs dl
    LEFT JOIN applications a ON dl.application_id = a.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (options.applicationId !== undefined) {
    query += ' AND dl.application_id = ?';
    params.push(options.applicationId);
  }
  
  if (options.status !== undefined) {
    query += ' AND dl.status = ?';
    params.push(options.status);
  }
  
  if (options.triggerType !== undefined) {
    query += ' AND dl.trigger_type = ?';
    params.push(options.triggerType);
  }
  
  query += ' ORDER BY dl.started_at DESC';
  
  if (options.limit !== undefined) {
    query += ' LIMIT ?';
    params.push(options.limit);
    
    if (options.offset !== undefined) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }
  
  const rows = db.prepare(query).all(...params);
  return rows.map(mapRow);
}

/**
 * 获取应用的部署历史
 */
export function getApplicationDeploymentHistory(applicationId: number, limit: number = 20): DeploymentLogRecord[] {
  return listDeploymentLogs({
    applicationId,
    limit,
  });
}

/**
 * 获取部署统计
 */
export interface DeploymentStats {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  pendingDeployments: number;
  averageDurationMs: number | null;
  deploymentsByTriggerType: Record<TriggerType, number>;
}

export function getDeploymentStats(applicationId?: number): DeploymentStats {
  const db = getDb();
  
  let whereClause = '';
  const params: any[] = [];
  
  if (applicationId !== undefined) {
    whereClause = 'WHERE application_id = ?';
    params.push(applicationId);
  }
  
  // 总体统计
  const overall = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms ELSE NULL END) as avg_duration
    FROM deployment_logs
    ${whereClause}
  `).get(...params) as any;
  
  // 按触发类型统计
  const byTrigger = db.prepare(`
    SELECT trigger_type, COUNT(*) as count
    FROM deployment_logs
    ${whereClause}
    GROUP BY trigger_type
  `).all(...params) as Array<{ trigger_type: TriggerType; count: number }>;
  
  const deploymentsByTriggerType: Record<string, number> = {
    manual: 0,
    webhook: 0,
    api: 0,
    scheduled: 0,
  };
  
  for (const item of byTrigger) {
    deploymentsByTriggerType[item.trigger_type] = item.count;
  }
  
  return {
    totalDeployments: overall.total,
    successfulDeployments: overall.successful,
    failedDeployments: overall.failed,
    pendingDeployments: overall.pending,
    averageDurationMs: overall.avg_duration,
    deploymentsByTriggerType: deploymentsByTriggerType as Record<TriggerType, number>,
  };
}

/**
 * 删除旧的部署日志
 * @param daysToKeep 保留的天数
 */
export function cleanupOldDeploymentLogs(daysToKeep: number = 90): number {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM deployment_logs
    WHERE started_at < datetime('now', '-' || ? || ' days')
  `).run(daysToKeep);
  
  return result.changes;
}

