// /app/api/scores/adjust/route.ts

import { NextRequest, NextResponse } from 'next/server'; // Next.js 服务器请求和响应对象
import { Pool, PoolClient, QueryResultRow } from 'pg'; // PostgreSQL 客户端库

// --- TypeScript 类型定义区域 ---

// 与数据库 'people' 表对应的行记录类型 (简化版，仅包含分数)
interface PersonRecord extends QueryResultRow {
  id: string;          // 学生学号
  current_score: number; // 当前分数
}
// 注意: 完整的 Person 类型已在前端定义，后端主要关注数据库交互的字段。

// 请求体结构
interface AdjustScoreRequestBody {
  ids: string[];                 // 学生ID (学号) 数组
  reason: string;                // 分数调整的原因
  adjustmentAmount: number;      // 实际调整的数值 (可以为正数或负数)
  adjustmentType: 'add' | 'deduct'; // 调整类型: 'add' (加分) 或 'deduct' (扣分)
  updatedBy: string;             // 执行操作的管理员用户名
}

// --- 数据库连接池初始化 ---
// 确保你的 .env 文件中有 DATABASE_URL 环境变量
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // 根据需要配置其他连接池选项, 例如:
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// --- POST 请求处理函数 ---
export async function POST(request: NextRequest) {
  console.log('API /api/scores/adjust 接收到 POST 请求'); // 后端日志: 标记收到请求

  let client: PoolClient | null = null; // 数据库客户端连接，需要妥善释放

  try {
    const body = await request.json() as AdjustScoreRequestBody;
    console.log('请求体内容:', body); // 后端日志: 输出请求体内容

    // --- 输入数据验证 ---
    const { ids, reason, adjustmentAmount, adjustmentType, updatedBy } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: '学生ID列表 (ids) 不能为空。' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json({ success: false, error: '调整理由 (reason) 不能为空。' }, { status: 400 });
    }
    if (typeof adjustmentAmount !== 'number' || isNaN(adjustmentAmount)) {
      // isNaN 检查确保 adjustmentAmount 是一个可解析的数字
      return NextResponse.json({ success: false, error: '分数调整值 (adjustmentAmount) 必须是一个有效的数字。' }, { status: 400 });
    }
    if (adjustmentType !== 'add' && adjustmentType !== 'deduct') {
      return NextResponse.json({ success: false, error: '调整类型 (adjustmentType) 必须是 "add" (加分) 或 "deduct" (扣分)。' }, { status: 400 });
    }
    // 验证 adjustmentAmount 是否与 adjustmentType 的符号预期一致
    // (前端发送的 adjustmentAmount 已经包含了符号)
    if ((adjustmentType === 'add' && adjustmentAmount < 0) || (adjustmentType === 'deduct' && adjustmentAmount > 0)) {
        console.warn(`警告: adjustmentAmount (${adjustmentAmount}) 的符号与 adjustmentType (${adjustmentType}) 可能不匹配。将按 adjustmentAmount 的实际符号处理。`);
        // 注意: 通常前端应保证 adjustmentAmount 的符号与 adjustmentType 一致，或仅发送正值由后端处理符号。
        // 当前逻辑依赖 adjustmentAmount 已包含正确的符号。
    }
    if (!updatedBy || typeof updatedBy !== 'string' || updatedBy.trim() === '') {
      return NextResponse.json({ success: false, error: '操作人 (updatedBy) 不能为空。' }, { status: 400 });
    }

    // 从连接池获取一个客户端连接
    client = await pool.connect();
    console.log('数据库连接已获取。'); // 后端日志

    // --- 数据库事务开始 ---
    await client.query('BEGIN');
    console.log('数据库事务已开始。'); // 后端日志

    const serverTimestamp = new Date(); // 服务器生成的时间戳，更可靠

    for (const personId of ids) {
      // 1. 查询当前人员的分数
      const personResult = await client.query<PersonRecord>(
        'SELECT id, current_score FROM people WHERE id = $1 FOR UPDATE', // FOR UPDATE 用于行级锁，防止并发问题
        [personId]
      );

      if (personResult.rows.length === 0) {
        await client.query('ROLLBACK'); // 如果任何一个用户未找到，则回滚事务
        console.error(`事务错误: 未找到ID为 ${personId} 的人员。事务已回滚。`);
        return NextResponse.json({ success: false, error: `未找到学号为 ${personId} 的人员。操作已取消。` }, { status: 404 });
      }

      const person = personResult.rows[0];
      const oldScore = person.current_score;
      const newScore = oldScore + adjustmentAmount; // adjustmentAmount 已经带符号

      // 2. 更新 'people' 表中的分数
      await client.query(
        'UPDATE people SET current_score = $1 WHERE id = $2',
        [newScore, personId]
      );
      console.log(`数据库: 已更新人员 ${personId} 的分数，从 ${oldScore} 到 ${newScore}`);

      // 3. 在 'score_changes' 表中插入分数变更记录
      // 注意: score_changes 表中的 timestamp 字段推荐使用数据库的 DEFAULT CURRENT_TIMESTAMP
      // 如果需要精确控制或使用应用服务器时间，则如下传递 serverTimestamp
      await client.query(
        `INSERT INTO score_changes 
           (person_id, reason, old_score, new_score, adjustment_amount, adjustment_type, timestamp, updated_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [personId, reason, oldScore, newScore, adjustmentAmount, adjustmentType, serverTimestamp, updatedBy]
      );
      console.log(`数据库: 已为人员 ${personId} 插入分数变更记录。`);
    }

    // --- 数据库事务提交 ---
    await client.query('COMMIT');
    console.log('数据库事务已成功提交。'); // 后端日志

    return NextResponse.json({
      success: true,
      message: '分数调整成功！',
      updatedCount: ids.length,
    }, { status: 200 });

  } catch (error: any) {
    console.error('API /api/scores/adjust 处理时发生错误:', error); // 后端日志: API 错误详情

    if (client) {
      try {
        await client.query('ROLLBACK'); // 如果发生错误，尝试回滚事务
        console.log('数据库事务因错误已回滚。'); // 后端日志
      } catch (rollbackError) {
        console.error('事务回滚失败:', rollbackError); // 后端日志: 回滚本身也可能失败
      }
    }
    
    // 根据错误类型返回不同的响应
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      return NextResponse.json({ success: false, error: '请求体JSON格式错误，无法解析。' }, { status: 400 });
    }
    if (error.code) { // 通常数据库错误会有错误码
        return NextResponse.json({ success: false, error: `数据库操作失败 (代码: ${error.code})。请联系管理员。` }, { status: 500 });
    }
    
    return NextResponse.json({ success: false, error: `服务器内部错误: ${error.message || '未知错误，请联系管理员。'}` }, { status: 500 });

  } finally {
    if (client) {
      client.release(); // 无论成功或失败，最后都释放数据库客户端连接回连接池
      console.log('数据库连接已释放。'); // 后端日志
    }
  }
}