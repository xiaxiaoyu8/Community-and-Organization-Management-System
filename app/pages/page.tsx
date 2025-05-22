// /app/pages/page.tsx
"use client"; // Next.js App Router 特性，声明为客户端组件

import { useState, useEffect, useMemo } from "react"; // React Hooks
import { useRouter } from 'next/navigation'; // Next.js 路由

// TypeScript 类型定义区域 (与后端 /api/people 返回的 Person, ScoreChange 一致)
// ----------------------
export interface ScoreChange { // 添加 export 以便后端API文件可以（可选地）引用此定义
  reason: string;
  newScore: number;
  oldScore: number;
  adjustmentAmount: number;
  adjustmentType: 'add' | 'deduct';
  timestamp: string; // ISO 格式字符串
  updatedBy: string;
}

export interface Person { // 添加 export
  id: string;
  user_name: string;
  user_identity: 'applicant' | 'activist' | 'member';
  add_timestamp: string; // ISO 格式字符串
  score: number;
  score_history: ScoreChange[];
}

type IdentityFilter = 'applicant' | 'activist' | 'member';

// API 响应体结构 (用于获取人员列表)
interface PeopleApiResponse {
    success: boolean;
    data?: Person[];
    error?: string;
}

// API 响应体结构 (用于调整分数)
interface AdjustScoreApiResponse {
    success: boolean;
    message?: string;
    updatedCount?: number;
    error?: string;
}
// ----------------------
// 主页面组件
// ----------------------
export default function MainPage() {
  const router = useRouter();

  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentFilter, setCurrentFilter] = useState<IdentityFilter>('applicant');
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<Set<string>>(new Set());
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [scoreUpdateReason, setScoreUpdateReason] = useState<string>("");
  const [scoreAdjustmentType, setScoreAdjustmentType] = useState<'add' | 'deduct'>('add');
  const [scoreAdjustmentAmount, setScoreAdjustmentAmount] = useState<string>("");

  // 定义从后端API获取数据的函数
  const fetchPeopleData = async () => {
    console.log("前端: 开始获取人员数据...");
    setIsLoading(true);
    try {
      const response = await fetch('/api/people'); // 调用后端 API
      const result: PeopleApiResponse = await response.json();

      if (response.ok && result.success && result.data) {
        console.log("前端: 成功获取人员数据", result.data);
        setAllPeople(result.data);
      } else {
        console.error("前端: 获取人员数据失败 (API响应)", result.error || response.statusText);
        alert(`获取人员数据失败: ${result.error || response.statusText || '请联系管理员检查服务器日志。'}`);
        setAllPeople([]); // 出错时清空或保持旧数据
      }
    } catch (error) {
      console.error("前端: 获取人员数据时发生网络或解析错误:", error);
      alert("获取人员数据时发生网络或解析错误，请检查您的网络连接和API响应是否符合预期。");
      setAllPeople([]);
    } finally {
      setIsLoading(false);
      console.log("前端: 获取人员数据流程结束。");
    }
  };

  // 组件挂载时获取初始数据
  useEffect(() => {
    fetchPeopleData(); 
  }, []);

  // 根据当前筛选条件过滤人员列表
  const filteredPeople = useMemo(() => {
    return allPeople.filter(person => person.user_identity === currentFilter);
  }, [allPeople, currentFilter]);

  // 获取当前用于显示历史记录的单个用户信息
  const activeUserForHistory = useMemo(() => {
    if (selectedPeopleIds.size === 1) {
      const selectedId = Array.from(selectedPeopleIds)[0];
      return allPeople.find(p => p.id === selectedId) || null;
    }
    return null;
  }, [selectedPeopleIds, allPeople]);

  // 切换身份筛选
  const handleFilterChange = (filter: IdentityFilter) => {
    setCurrentFilter(filter);
    setSelectedPeopleIds(new Set()); // 清空选择
  };

  // 处理复选框选择
  const handleCheckboxChange = (personId: string) => {
    setSelectedPeopleIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(personId)) newSelected.delete(personId);
      else newSelected.add(personId);
      return newSelected;
    });
  };

  // 全选/取消全选当前视图
  const handleSelectAllInView = () => {
    if (filteredPeople.length === 0) return;
    if (selectedPeopleIds.size === filteredPeople.length) {
      setSelectedPeopleIds(new Set());
    } else {
      setSelectedPeopleIds(new Set(filteredPeople.map(p => p.id)));
    }
  };
  
  // 打开分数调整弹窗
  const handleOpenModal = () => {
    if (selectedPeopleIds.size > 0) {
      setScoreUpdateReason("");
      setScoreAdjustmentType('add');
      setScoreAdjustmentAmount("");
      setIsModalOpen(true);
    } else {
      alert("请至少选择一个人员进行分数调整。");
    }
  };

  // 关闭弹窗
  const handleCloseModal = () => setIsModalOpen(false);

  // 确认分数调整并提交到后端
  const handleScoreUpdateConfirm = async () => {
    const amount = parseFloat(scoreAdjustmentAmount); 
    if (isNaN(amount) || amount < 0) {
      alert("请输入有效且非负的分数调整数值。");
      return;
    }
    if (!scoreUpdateReason.trim()) {
      alert("请输入调整理由。");
      return;
    }

    const actualAdjustment = scoreAdjustmentType === 'deduct' ? -Math.abs(amount) : Math.abs(amount);
    const updatedIds = Array.from(selectedPeopleIds);
    const updatedBy = 'admin_js_client'; // 实际应从认证状态获取

    const requestBody = { ids: updatedIds, reason: scoreUpdateReason, adjustmentAmount: actualAdjustment, adjustmentType: scoreAdjustmentType, updatedBy };
    console.log("前端: 发送分数调整请求到 /api/scores/adjust", requestBody);

    try {
      const response = await fetch('/api/scores/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result: AdjustScoreApiResponse = await response.json();

      if (response.ok && result.success) {
        console.log("前端: 分数调整成功 (API响应)", result);
        alert(result.message || "分数调整成功！");
        handleCloseModal();
        setSelectedPeopleIds(new Set());
        await fetchPeopleData(); // 重新加载数据以同步最新状态
      } else {
        console.error("前端: 分数调整失败 (API响应)", result.error || response.statusText);
        alert(`分数调整失败: ${result.error || response.statusText || '未知API错误，请联系管理员。'}`);
      }
    } catch (error) {
      console.error("前端: 分数调整API请求时发生网络或解析错误:", error);
      alert("分数调整请求失败，请检查您的网络连接或联系管理员。");
    }
  };
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try { return new Date(dateString).toLocaleDateString(); } 
    catch (e) { console.warn("前端: 格式化日期失败", dateString, e); return dateString; }
  };

  // 身份映射
  const identityMap: Record<IdentityFilter, string> = { applicant: '入党申请人', activist: '入党积极分子', member: '党员 (含预备党员)' };

  // 加载状态显示
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen text-gray-700 dark:text-gray-300">数据加载中，请稍候...预计等待总时间40s</div>;
  }

  // JSX 渲染主体 (保持不变，与上次提供的一致)
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* 页面头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">人员评分系统</h1>
          {/* 身份筛选按钮组 */}
          <div className="flex space-x-2">
            {(['applicant', 'activist', 'member'] as IdentityFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${currentFilter === filter 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              >
                {identityMap[filter]}
              </button>
            ))}
          </div>
          {/* 退出登录按钮 */}
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
          >
            退出登录
          </button>
        </div>
      </header>

      {/* 页面主内容区域 */}
      <main className="flex-grow container mx-auto p-4 flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
        {/* 左侧面板: 人员信息表格 */}
        <div className="flex-grow lg:w-2/3 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2 sm:mb-0">
              {identityMap[currentFilter]}列表 (共 {filteredPeople.length} 人)
            </h2>
            {filteredPeople.length > 0 && (
                 <button
                    onClick={handleSelectAllInView}
                    className="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 self-start sm:self-center"
                >
                    {selectedPeopleIds.size === filteredPeople.length ? '取消全选' : `全选当前 (${filteredPeople.length})`}
                </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th scope="col" className="p-3 w-12 text-center">选择</th>
                  <th scope="col" className="p-3">学号 (ID)</th>
                  <th scope="col" className="p-3">姓名</th>
                  <th scope="col" className="p-3">申请/记录日期</th>
                  <th scope="col" className="p-3">当前分数</th>
                </tr>
              </thead>
              <tbody>
                {allPeople.length === 0 && !isLoading && (
                    <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">
                        系统中暂无人员数据。
                        </td>
                    </tr>
                )}
                {filteredPeople.map(person => (
                  <tr key={person.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        checked={selectedPeopleIds.has(person.id)}
                        onChange={() => handleCheckboxChange(person.id)}
                        aria-label={`选择 ${person.user_name}`}
                      />
                    </td>
                    <td className="p-3">{person.id}</td>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{person.user_name}</td>
                    <td className="p-3">{formatDate(person.add_timestamp)}</td>
                    <td className="p-3">{person.score}</td>
                  </tr>
                ))}
                {filteredPeople.length === 0 && allPeople.length > 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">
                      当前筛选条件下无人员信息。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 右侧面板: 分数变更历史 */}
        <div className="lg:w-1/3 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 flex flex-col" style={{maxHeight: 'calc(100vh - 120px)'}}>
            <h2 className="text-xl font-semibold mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2 z-10 text-gray-800 dark:text-white">分数变更历史</h2>
            <div className="flex-grow overflow-y-auto">
            {activeUserForHistory ? (
                <div>
                <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">
                    {activeUserForHistory.user_name} (学号: {activeUserForHistory.id})
                </h3>
                {activeUserForHistory.score_history && activeUserForHistory.score_history.length > 0 ? (
                    <ul className="space-y-3">
                    {activeUserForHistory.score_history.slice().reverse().map((change, index) => (
                        <li key={`${activeUserForHistory.id}-change-${index}-${change.timestamp}`} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{change.reason}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                            分数: {change.oldScore} → <span className="font-bold text-green-600 dark:text-green-400">{change.newScore}</span>
                            &nbsp;({change.adjustmentType === 'add' ? '+' : ''}{change.adjustmentAmount})
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            时间: {new Date(change.timestamp).toLocaleString()} {/* 显示完整日期时间 */}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">操作人: {change.updatedBy}</p>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400">暂无分数更改历史。</p>
                )}
                </div>
            ) : (
                <p className="text-gray-500 dark:text-gray-400">
                {selectedPeopleIds.size > 1 
                    ? "已选择多名用户。请仅选择一名用户以查看其详细历史记录。" 
                    : "请从左侧列表选择一名用户以查看其分数更改历史。"}
                </p>
            )}
            </div>
        </div>
      </main>

      {/* 统一更改分数按钮 */}
      {selectedPeopleIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-20">
          <button
            onClick={handleOpenModal}
            className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-all flex items-center space-x-2"
            title={`为 ${selectedPeopleIds.size} 人调整分数`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
            <span>统一调整分数 ({selectedPeopleIds.size})</span>
          </button>
        </div>
      )}

      {/* 分数调整弹窗 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              为 {selectedPeopleIds.size} 名选定人员调整分数
            </h3>
            <div className="mb-4">
              <label htmlFor="scoreUpdateReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">调整理由</label>
              <input type="text" id="scoreUpdateReason" value={scoreUpdateReason} onChange={(e) => setScoreUpdateReason(e.target.value)} className="mt-1 p-2 w-full border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500" placeholder="例如: 积极参与XX活动"/>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">调整类型</label>
              <div className="mt-2 flex space-x-4">
                <label className="inline-flex items-center"><input type="radio" className="form-radio text-blue-600 dark:bg-gray-700 dark:border-gray-600" name="scoreAdjustmentType" value="add" checked={scoreAdjustmentType === 'add'} onChange={() => setScoreAdjustmentType('add')} /><span className="ml-2 text-gray-700 dark:text-gray-300">加分</span></label>
                <label className="inline-flex items-center"><input type="radio" className="form-radio text-red-600 dark:bg-gray-700 dark:border-gray-600" name="scoreAdjustmentType" value="deduct" checked={scoreAdjustmentType === 'deduct'} onChange={() => setScoreAdjustmentType('deduct')} /><span className="ml-2 text-gray-700 dark:text-gray-300">扣分</span></label>
              </div>
            </div>
            <div className="mb-6">
              <label htmlFor="scoreAdjustmentAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">分数调整值 (请输入正数)</label>
              <input type="number" id="scoreAdjustmentAmount" value={scoreAdjustmentAmount} onChange={(e) => setScoreAdjustmentAmount(e.target.value)} min="0" className="mt-1 p-2 w-full border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500" placeholder="例如: 5 或 10"/>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">取消</button>
              <button onClick={handleScoreUpdateConfirm} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">确认调整</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}