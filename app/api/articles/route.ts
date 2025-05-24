// app/api/articles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET 所有文章
export async function GET() {
  try {
    const result = await pool.query(
        `SELECT articles.*, users.username as author_name
         FROM articles
         JOIN users ON articles.author_id = users.id
         ORDER BY articles.created_at DESC`
    );
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error('获取文章失败:', error);
    return NextResponse.json({ error: '获取文章失败' }, { status: 500 });
  }
}

// POST 新文章 (例如，来自简单的文本编辑器)
export async function POST(req: NextRequest) {
  try {
    const { title, content, authorId } = await req.json();

    if (!title || !content || !authorId) {
      return NextResponse.json({ error: '标题、内容和作者ID是必填项' }, { status: 400 });
    }

    const result = await pool.query(
      'INSERT INTO articles (title, content, author_id) VALUES ($1, $2, $3) RETURNING *',
      [title, content, authorId]
    );

    return NextResponse.json({ message: "文章创建成功", article: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json({ error: '创建文章失败' }, { status: 500 });
  }
}