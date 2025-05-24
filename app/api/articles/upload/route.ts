// app/api/articles/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import mammoth from 'mammoth';
import fs from 'fs/promises'; // 使用 fs.promises
import path from 'path';
import os from 'os'; // 用于获取临时目录

export async function POST(req: NextRequest) {
    console.log('上传文章API (/api/articles/upload) 被访问');
    try {
        const formData = await req.formData();

        const title = formData.get('title') as string | null;
        const authorIdString = formData.get('authorId') as string | null;
        const file = formData.get('articleFile') as File | null;

        if (!title || !authorIdString || !file) {
            console.error('上传API错误: 缺少标题、作者ID或文件');
            return NextResponse.json({ error: '标题、作者ID和文章文件是必填项。' }, { status: 400 });
        }

        const authorId = parseInt(authorIdString, 10);
        if (isNaN(authorId)) {
            console.error('上传API错误: 作者ID无效');
            return NextResponse.json({ error: '无效的作者ID。' }, { status: 400 });
        }

        // 校验文件类型 (可选但推荐)
        if (file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && file.name.split('.').pop()?.toLowerCase() !== 'docx') {
            console.error('上传API错误: 文件类型不支持, 需要 .docx 文件');
            return NextResponse.json({ error: '文件类型不支持，请上传 .docx 文件。' }, { status: 400 });
        }

        // 将文件内容读取为 ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // 转换为 Node.js Buffer 以便 mammoth 使用

        // 使用 mammoth 解析 Word 内容
        const { value: htmlContent } = await mammoth.convertToHtml({ buffer });
        console.log('上传API: Word 文件成功解析为 HTML');

        const result = await pool.query(
            'INSERT INTO articles (title, content, author_id, original_filename) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, htmlContent, authorId, file.name || 'untitled.docx']
        );
        console.log('上传API: 文章已成功存入数据库:', result.rows[0]);

        return NextResponse.json({ message: '文章上传成功', article: result.rows[0] }, { status: 201 });

    } catch (error: any) {
        console.error('上传API - 未捕获的严重错误:', error);
        // 在这里可以根据 error.code 或 error.message 提供更具体的错误反馈
        if (error.message.includes('mammoth')) { // 示例： mammoth 解析错误
             return NextResponse.json({ error: 'Word文档解析失败，请确保文件格式正确且未损坏。', details: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: '文章上传失败 (详情请查看服务器日志)', details: error.message }, { status: 500 });
    }
}