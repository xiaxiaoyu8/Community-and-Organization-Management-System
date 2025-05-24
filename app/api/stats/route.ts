// app/api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET 获取当前访客统计
export async function GET() {
    console.log('GET /api/stats 接口被访问');
    try {
        const today = new Date().toISOString().split('T')[0]; // 格式：YYYY-MM-DD

        // 获取今天的统计数据和最新的总访问量
        const result = await pool.query(
            `SELECT daily_visits, total_visits
             FROM visitor_stats
             WHERE stat_date = $1`,
            [today]
        );

        let dailyVisits = 0;
        let totalVisits = 0;

        if (result.rows.length > 0) {
            dailyVisits = result.rows[0].daily_visits;
            totalVisits = result.rows[0].total_visits;
        } else {
            // 如果今天还没有记录，获取上一次记录的总访问量
            const latestTotalResult = await pool.query('SELECT get_latest_total_visits() as total');
            if (latestTotalResult.rows.length > 0) {
                totalVisits = latestTotalResult.rows[0].total;
            }
            // dailyVisits 保持为 0，因为今天还没有记录
        }

        console.log('获取的统计数据 - 今日:', dailyVisits, '总计:', totalVisits);
        return NextResponse.json({ dailyVisits, totalVisits }, { status: 200 });

    } catch (error) {
        console.error('获取统计数据失败 - 未捕获的错误:', error);
        return NextResponse.json({ error: '获取访问统计失败 (详情请查看服务器日志)' }, { status: 500 });
    }
}

// POST 增加访问次数
export async function POST() {
    console.log('POST /api/stats 接口被访问 - 增加访问次数');
    try {
        const today = new Date().toISOString().split('T')[0]; // 格式：YYYY-MM-DD

        // 获取本次增加前的最新总访问量
        const latestTotalResult = await pool.query('SELECT get_latest_total_visits() as total');
        let currentTotalVisits = 0;
        if (latestTotalResult.rows.length > 0 && latestTotalResult.rows[0].total !== null) {
            currentTotalVisits = latestTotalResult.rows[0].total;
        }

        const newTotalVisits = currentTotalVisits + 1;

        // Upsert (插入或更新) 逻辑：插入或更新每日和总访问次数
        // 对于总访问量，我们基于上一次已知的总数进行递增。
        const query = `
            INSERT INTO visitor_stats (stat_date, daily_visits, total_visits)
            VALUES ($1, 1, $2)
            ON CONFLICT (stat_date) DO UPDATE
            SET daily_visits = visitor_stats.daily_visits + 1,
                total_visits = $2;
        `;
        // total_visits 使用 $2 确保即使在新的一天有多个并发请求，
        // 它们都会尝试基于前一天的总数+1来设置总访问量。
        // 对于高并发的总访问量更新，更稳健的方法可能涉及一个单独的表或不同的更新策略，
        // 但目前的实现更简单。
        // 当前实现会更新当天的 total_visits 为新的全局总数。

        await pool.query(query, [today, newTotalVisits]);
        console.log('访问次数已增加。此请求估算的新总数:', newTotalVisits);

        // 返回新的计数，以便前端即时更新 (如果需要)
        const updatedStatsResult = await pool.query(
            `SELECT daily_visits, total_visits
             FROM visitor_stats
             WHERE stat_date = $1`,
            [today]
        );
        
        // 如果当天是第一次访问，updatedStatsResult 可能还没有 daily_visits
        const responseDailyVisits = updatedStatsResult.rows[0]?.daily_visits || 1;
        const responseTotalVisits = updatedStatsResult.rows[0]?.total_visits || newTotalVisits;


        return NextResponse.json({
            message: '访问已计数',
            dailyVisits: responseDailyVisits,
            totalVisits: responseTotalVisits
        }, { status: 200 });

    } catch (error) {
        console.error('增加访问次数失败 - 未捕获的错误:', error);
        return NextResponse.json({ error: '更新访问统计失败 (详情请查看服务器日志)' }, { status: 500 });
    }
}