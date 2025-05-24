// components/ArticleUpload.tsx
"use client";

import { useState, ChangeEvent, FormEvent } from "react";

interface ArticleUploadProps {
  loggedInUser: { id: number; username: string } | null;
  onUploadSuccess: () => void;
}

export default function ArticleUpload({ loggedInUser, onUploadSuccess }: ArticleUploadProps) {
  const [title, setTitle] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !title || !loggedInUser) {
      setError("请输入标题，选择 .docx 文件，并确保您已登录。");
      return;
    }
    setIsLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("articleFile", file);
    formData.append("authorId", String(loggedInUser.id));

    try {
      const response = await fetch("/api/articles/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "上传失败。");
      } else {
        setMessage("文章上传成功！");
        setTitle("");
        setFile(null);
        // 可视化清空文件输入框
        const fileInput = document.getElementById('articleFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        onUploadSuccess(); // 回调以刷新文章列表
      }
    } catch (err: any) {
      setError("上传过程中发生错误：" + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!loggedInUser) {
    return <p className="text-amber-600">请登录后上传文章。</p>;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">上传新文章 (Word .docx)</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            文章标题
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="articleFile" className="block text-sm font-medium text-gray-700 mb-1">
            选择 Word 文档 (.docx)
          </label>
          <input
            type="file"
            id="articleFile"
            onChange={handleFileChange}
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            required
          />
        </div>
        {isLoading && <p className="text-blue-600">上传中...</p>}
        {message && <p className="text-green-600 mb-2">{message}</p>}
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 disabled:opacity-50"
        >
          {isLoading ? "正在上传..." : "上传文章"}
        </button>
      </form>
    </div>
  );
}