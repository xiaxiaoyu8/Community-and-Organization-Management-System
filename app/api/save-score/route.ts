import { NextRequest, NextResponse } from "next/server";
import { Pool, QueryResultRow } from "pg"; // QueryResultRow 用于定义返回行类型

// --- 数据库连接池初始化 ---
let pool: Pool;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "错误：DATABASE_URL 环境变量未设置。数据库功能将不可用。"
  );
  // 在实际生产中，如果数据库是关键，这里可能应该阻止应用启动或抛出更严重的错误
} else {
  pool = new Pool({
    connectionString: databaseUrl,
    // 建议为连接池添加更多配置，例如：
    max: 20, // 最大连接数
    // idleTimeoutMillis: 30000, // 空闲连接超时时间
    // connectionTimeoutMillis: 2000, // 连接超时时间
  });

  // 可选：测试连接池 (通常在应用启动时进行一次)
  pool.connect()
    .then(client => {
      console.log("数据库连接池已成功连接到 PostgreSQL。");
      client.release(); // 释放客户端回连接池
    })
    .catch(err => {
      console.error("错误：无法连接到 PostgreSQL 数据库连接池。", err);
    });
}

// 定义预期的请求体结构
interface SaveScorePayload {
  player_name?: string | null; // 根据您的表结构，允许 null
  score?: number | null;       // 根据您的表结构，允许 null (但下方逻辑会要求它非null)
}

// 定义数据库返回的行结构 (基于优化后的表结构)
interface ScoreRecord extends QueryResultRow {
  player_name: string | null;
  player_score: number;
}


export async function POST(req: NextRequest) {
  // 1. 检查数据库连接池是否已初始化
  if (!pool) {
    console.error(
      "API错误：数据库连接池未初始化。请检查 DATABASE_URL 环境变量。"
    );
    return NextResponse.json(
      { success: false, error: "服务器配置错误，数据库暂不可用。" },
      { status: 503 } // 503 Service Unavailable
    );
  }

  // 2. 解析请求体
  let payload: SaveScorePayload;
  try {
    payload = await req.json();
  } catch (error) {
    console.warn("API警告：解析请求JSON失败。", error);
    return NextResponse.json(
      { success: false, error: "请求体无效，期望收到JSON格式数据。" },
      { status: 400 } // 400 Bad Request
    );
  }

  const { player_name, score } = payload;

  // 3. 输入验证 (根据您的业务逻辑调整)
  // 即使数据库允许 player_name 为 NULL，API层面也可能要求它是字符串或特定格式
  if (player_name !== undefined && player_name !== null) {
    if (typeof player_name !== "string") {
      return NextResponse.json(
        { success: false, error: "player_name 必须是字符串或 null。" },
        { status: 400 }
      );
    }
    if (player_name.length > 255) { // 假设 VARCHAR(255)
      return NextResponse.json(
        { success: false, error: "player_name 过长，最多255个字符。" },
        { status: 400 }
      );
    }
  }

  // 对于 score，即使数据库允许 NULL，通常API层面会要求它是一个有效的数字
  if (score === undefined || score === null) {
    return NextResponse.json(
      { success: false, error: "score 是必填项。" },
      { status: 400 }
    );
  }
  if (typeof score !== "number" || isNaN(score)) {
    return NextResponse.json(
      { success: false, error: "score 必须是有效的数字。" },
      { status: 400 }
    );
  }
  // 可以添加更多分数范围的验证，例如：
  // if (score < 0 || score > 1000000) {
  //   return NextResponse.json({ success: false, error: "score 超出有效范围。" }, { status: 400 });
  // }


  // 4. 执行数据库操作
  try {
    // 使用 RETURNING * (或指定列) 来获取插入后的数据，这对于确认和返回很有用
    // 基于优化后的表结构，我们有 id 和 created_at
    const query = `
      INSERT INTO public.player_score(player_name, player_score) 
      VALUES ($1, $2)
      RETURNING player_name, player_score;
    `;
    // 如果 player_name 是 undefined (未在JSON中提供)，则显式传递 null
    const values = [player_name === undefined ? null : player_name, score];

    const result = await pool.query<ScoreRecord>(query, values);

    if (result.rows.length > 0) {
      return NextResponse.json(
        {
          success: true,
          message: "分数保存成功！",
          data: result.rows[0], // 返回插入的记录
        },
        { status: 201 } // 201 Created
      );
    } else {
      // 这种情况理论上在 INSERT ... RETURNING 成功时不应发生，但作为保险
      console.error("数据库错误：INSERT 操作成功但未返回任何行。");
      return NextResponse.json(
        { success: false, error: "保存分数失败，请稍后再试。" },
        { status: 500 }
      );
    }
  } catch (dbError: any) {
    console.error("数据库写入错误:", dbError);
    // 可以根据 dbError.code (PostgreSQL错误码) 提供更具体的错误处理或日志
    // 例如： if (dbError.code === '23505') { /* 处理唯一约束冲突 */ }
    return NextResponse.json(
      { success: false, error: "由于服务器内部错误，保存分数失败。" },
      { status: 500 }
    );
  }
}