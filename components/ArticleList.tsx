// components/ArticleList.tsx
"use client";

import { useEffect, useState } from "react";
import DOMPurify from 'dompurify'; // 用于XSS防护


interface Article {
  id: number;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
}

export default function ArticleList({ refreshTrigger }: { refreshTrigger: number }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/articles");
        if (!response.ok) {
          throw new Error("获取文章失败");
        }
        const data = await response.json();
        setArticles(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, [refreshTrigger]); // 当 refreshTrigger 改变时重新获取

  if (isLoading) return <p className="text-center py-4">文章加载中...</p>;
  if (error) return <p className="text-center py-4 text-red-500">文章无法加载: {error}</p>;
  if (articles.length === 0) return <p className="text-center py-4 text-gray-500">暂无文章。</p>;

  return (
    <div className="space-y-8">
      {articles.map((article) => {
        // 在渲染前净化 HTML 内容
        const cleanHtml = typeof window !== 'undefined' ? DOMPurify.sanitize(article.content) : article.content;
        return (
          <article key={article.id} className="p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{article.title}</h2>
            <div className="text-sm text-gray-500 mb-4">
              <span>作者: {article.author_name}</span> | <span>发布于: {new Date(article.created_at).toLocaleDateString()}</span>
            </div>
            {/* 渲染净化后的 HTML 内容 */}
            <div
              className="prose max-w-none" // Tailwind CSS Typography 插件的 `prose` 类，用于美化文章样式
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
          </article>
        );
      })}
    </div>
  );
}