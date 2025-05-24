// /app/api/scores/adjust/route.ts

import { NextRequest, NextResponse } from 'next/server'; // Next.js 服务器请求和响应对象
import { Pool, PoolClient, QueryResultRow } from 'pg'; // PostgreSQL 客户端库

// --- TypeScript 类型定义区域 ---

// 与数据库 'people' 表对应的行记录类型 (简化版，仅包含分数和ID)
interface PersonRecord extends QueryResultRow {
  id: string;          // 学生学号
  current_score: number; // 当前分数
}

// 请求体结构 (前端发送过来的数据结构)
interface AdjustScoreRequestBody {
  ids: string[];                 // 学生ID (学号) 数组
  reason: string;                // 分数调整的原因
  adjustmentAmount: number;      // 实际调整的数值 (已包含正负号，代表加分或扣分)
  adjustmentType: 'add' | 'deduct'; // 调整类型: 'add' (加分) 或 'deduct' (扣分)
  updatedBy: string;             // 执行操作的管理员用户名
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  console.log('API /api/scores/adjust 接收到 POST 请求'); // 后端日志: 标记收到请求

  let client: PoolClient | null = null; // 数据库客户端连接，操作完成后务必释放

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
      return NextResponse.json({ success: false, error: '分数调整值 (adjustmentAmount) 必须是一个有效的数字。' }, { status: 400 });
    }
    if (adjustmentType !== 'add' && adjustmentType !== 'deduct') {
      return NextResponse.json({ success: false, error: '调整类型 (adjustmentType) 必须是 "add" (加分) 或 "deduct" (扣分)。' }, { status: 400 });
    }
    if ((adjustmentType === 'add' && adjustmentAmount < 0) || (adjustmentType === 'deduct' && adjustmentAmount > 0)) {
        console.warn(`后端警告: 请求中的 adjustmentAmount (${adjustmentAmount}) 的符号与 adjustmentType (${adjustmentType}) 可能不一致。将按 adjustmentAmount 的实际符号处理。`);
    }
    if (!updatedBy || typeof updatedBy !== 'string' || updatedBy.trim() === '') {
      return NextResponse.json({ success: false, error: '操作人 (updatedBy) 不能为空。' }, { status: 400 });
    }

    // 从连接池获取一个客户端连接
    client = await pool.connect();
    console.log('数据库连接已获取。');

    // --- 数据库事务开始 ---
    await client.query('BEGIN');
    console.log('数据库事务已开始。');

    const serverTimestamp = new Date(); // 使用服务器当前时间作为权威时间戳

    for (const personId of ids) {
      // 1. 查询当前人员的分数，并使用 FOR UPDATE 行级锁防止并发更新冲突
      const personResult = await client.query<PersonRecord>(
        'SELECT id, current_score FROM public.people WHERE id = $1 FOR UPDATE',
        [personId]
      );

      if (personResult.rows.length === 0) {
        await client.query('ROLLBACK'); 
        console.error(`事务错误: 未找到ID为 ${personId} 的人员。事务已回滚。`);
        if (client) client.release(); // 提前释放
        console.log('数据库连接因错误已释放。');
        return NextResponse.json({ success: false, error: `未找到学号为 ${personId} 的人员。操作已取消。` }, { status: 404 });
      }

      const person = personResult.rows[0];
      const oldScore = person.current_score;
      const newScore = oldScore + adjustmentAmount; 

      // 2. 更新 'people' 表中的分数
      const updateResult = await client.query(
        'UPDATE public.people SET current_score = $1 WHERE id = $2',
        [newScore, personId]
      );
      if (updateResult.rowCount === 0) { 
        await client.query('ROLLBACK');
        console.error(`事务错误: 更新人员 ${personId} 分数失败，可能ID在此期间被删除。事务已回滚。`);
        if (client) client.release(); // 提前释放
        console.log('数据库连接因更新失败已释放。');
        return NextResponse.json({ success: false, error: `更新学号为 ${personId} 的人员分数失败。` }, { status: 500 });
      }
      console.log(`数据库: 已更新人员 ${personId} 的分数，从 ${oldScore} 到 ${newScore}`);

      // 3. 在 'score_changes' 表中插入分数变更记录
      await client.query(
        `INSERT INTO public.score_changes 
           (person_id, reason, old_score, new_score, adjustment_amount, adjustment_type, timestamp, updated_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [personId, reason, oldScore, newScore, adjustmentAmount, adjustmentType, serverTimestamp, updatedBy]
      );
      console.log(`数据库: 已为人员 ${personId} 插入分数变更记录。`);
    }

    // --- 数据库事务提交 ---
    await client.query('COMMIT');
    console.log('数据库事务已成功提交。');

    return NextResponse.json({
      success: true,
      message: '分数调整成功！',
      updatedCount: ids.length,
    }, { status: 200 });

  } catch (error: any) {
    console.error('API /api/scores/adjust 处理时发生错误:', error);

    if (client) { 
      try {
        await client.query('ROLLBACK');
        console.log('数据库事务因错误已回滚。');
      } catch (rollbackError) {
        console.error('事务回滚失败:', rollbackError);
      }
    }
    
    if (error instanceof SyntaxError && error.message.includes("JSON")) { 
      return NextResponse.json({ success: false, error: '请求体JSON格式错误，无法解析。' }, { status: 400 });
    }
    if (error.code) { 
        return NextResponse.json({ success: false, error: `数据库操作失败 (错误码: ${error.code})。详情请查看服务器日志或联系管理员。` }, { status: 500 });
    }
    
    return NextResponse.json({ success: false, error: `服务器内部错误: ${error.message || '未知错误，请联系管理员。'}` }, { status: 500 });

  } finally {
    if (client) {
      client.release(); 
      console.log('数据库连接已释放。');
    }
  }
}