// /app/api/people/route.ts

import { NextResponse } from 'next/server';
import { Pool, PoolClient } from 'pg';
// 假设 Person 和 ScoreChange 类型定义在一个共享文件中，或者我们在这里根据需要适配
// 为使此文件独立，我们定义从数据库查询返回的数据结构，并映射到前端期望的类型

// 前端期望的 ScoreChange 类型 (与 /app/pages/page.tsx 中的定义应一致)
interface ScoreChange {
  reason: string;
  newScore: number;
  oldScore: number;
  adjustmentAmount: number;
  adjustmentType: 'add' | 'deduct';
  timestamp: string; // ISO 格式字符串
  updatedBy: string;
}

// 前端期望的 Person 类型
interface Person {
  id: string;
  user_name: string;
  user_identity: 'applicant' | 'activist' | 'member';
  add_timestamp: string; // ISO 格式字符串
  score: number;
  score_history: ScoreChange[];
}

// 数据库 score_changes 表的行数据结构 (通常是 snake_case)
interface ScoreChangeFromDB {
  reason: string;
  new_score: number;
  old_score: number;
  adjustment_amount: number;
  adjustment_type: 'add' | 'deduct';
  timestamp: Date; // pg 库会将 timestamptz 转为 JavaScript Date 对象
  updated_by: string;
}

// 数据库 people 表的行数据结构
interface PersonFromDB {
  id: string;
  user_name: string;
  user_identity: 'applicant' | 'activist' | 'member';
  add_timestamp: Date; // pg 库会将 timestamptz 转为 JavaScript Date 对象
  current_score: number;
}

// --- 数据库连接池初始化 ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // 按需配置SSL
});

export async function GET() {
  console.log('API /api/people 接收到 GET 请求'); // 后端日志
  let client: PoolClient | null = null;

  try {
    client = await pool.connect(); // 从连接池获取客户端
    console.log('数据库连接已获取 (GET /api/people)');

    // 1. 查询所有人员的基本信息
    const peopleResult = await client.query<PersonFromDB>(
        'SELECT id, user_name, user_identity, add_timestamp, current_score FROM public.people ORDER BY user_name ASC'
    );
    const peopleFromDB = peopleResult.rows;

    // 2. 为每个人员查询其分数历史记录
    // 注意: N+1 查询问题。对于大量数据，建议优化。
    const peopleWithHistory: Person[] = []; // 这是最终要返回给前端的数据数组

    for (const personData of peopleFromDB) {
      const historyResult = await client.query<ScoreChangeFromDB>(
        'SELECT reason, new_score, old_score, adjustment_amount, adjustment_type, timestamp, updated_by FROM public.score_changes WHERE person_id = $1 ORDER BY timestamp DESC',
        [personData.id]
      );

      // 将从数据库获取的 score_changes 记录映射到前端期望的 ScoreChange 类型
      const scoreHistory: ScoreChange[] = historyResult.rows.map(dbHistoryRow => ({
        reason: dbHistoryRow.reason,
        newScore: dbHistoryRow.new_score,         // snake_case to camelCase
        oldScore: dbHistoryRow.old_score,         // snake_case to camelCase
        adjustmentAmount: dbHistoryRow.adjustment_amount, // snake_case to camelCase
        adjustmentType: dbHistoryRow.adjustment_type,   // snake_case to camelCase
        timestamp: dbHistoryRow.timestamp.toISOString(), // Date 对象转为 ISO 字符串
        updatedBy: dbHistoryRow.updated_by,       // snake_case to camelCase
      }));
      
      // 将从数据库获取的 people 记录和其处理过的 score_history 组合成前端期望的 Person 类型
      peopleWithHistory.push({
        id: personData.id,
        user_name: personData.user_name,
        user_identity: personData.user_identity,
        add_timestamp: personData.add_timestamp.toISOString(), // Date 对象转为 ISO 字符串
        score: personData.current_score,                      // current_score 映射为 score
        score_history: scoreHistory,
      });
    }

    console.log(`成功获取 ${peopleWithHistory.length} 条人员数据及其历史记录。`);
    return NextResponse.json({ success: true, data: peopleWithHistory }); // 返回成功响应和数据

  } catch (error: any) {
    console.error('API /api/people 处理时发生错误:', error); // 后端错误日志
    // 返回统一的错误响应结构
    const errorMessage = error.code ? `数据库查询失败 (错误码: ${error.code})` : `获取人员列表失败: ${error.message || '未知错误'}`;
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  } finally {
    if (client) {
      client.release(); // 释放数据库连接回连接池
      console.log('数据库连接已释放 (GET /api/people)');
    }
  }
}