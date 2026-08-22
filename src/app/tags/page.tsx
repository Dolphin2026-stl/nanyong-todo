'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/app-context';
import { useAuth } from '@/hooks/use-auth';
import { useAppToast } from '@/lib/toast-provider';
import AppLayout from '@/components/app-layout';

const presetColors = [
  '#4A1A6B', // 南大紫
  '#E60033', // 紧急红
  '#3366CC', // 链接蓝
  '#FFB300', // 提醒黄
  '#00B894', // 青绿
  '#6C5CE7', // 紫罗兰
  '#FD79A8', // 粉色
  '#00B4D8', // 天蓝
  '#F59E0B', // 金色
  '#7F7F7F', // 灰色
];

export default function TagsPage() {
  const { tags, isLoading, refreshTags, addTag, updateTag, deleteTag } = useApp();
  const { getAccessToken } = useAuth();
  const toast = useAppToast();

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#4A1A6B');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  type TagColor = string;

  useEffect(() => {
    async function load() {
      const token = await getAccessToken();
      if (token) {
        await refreshTags();
        setHasLoaded(true);
      }
    }
    load();
  }, [refreshTags, getAccessToken]);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTagName.trim()) {
      toast.error('请输入标签名称');
      return;
    }

    try {
      await addTag(newTagName.trim(), newTagColor);
      setNewTagName('');
      setNewTagColor('#4A1A6B');
      toast.success('标签创建成功');
    } catch (err) {
      toast.error('创建失败，请重试');
    }
  };

  const startEdit = (tag: typeof tags[0]) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || '#4A1A6B');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    
    try {
      await updateTag(editingId, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingId(null);
      toast.success('标签已更新');
    } catch (err) {
      toast.error('更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个标签吗？')) return;
    try {
      await deleteTag(id);
      toast.success('标签已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">标签管理</h1>
          <p className="text-muted-foreground mt-1">自定义任务分类标签</p>
        </div>

        {/* 新建标签 */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">新建标签</h2>
          <form onSubmit={handleAddTag} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="输入标签名称，如 #课程 #项目"
                className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors"
              >
                创建
              </button>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">选择颜色</label>
              <div className="flex gap-2 flex-wrap">
                {presetColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTagColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                      newTagColor === color ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* 标签列表 */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">
              我的标签 <span className="text-sm font-normal text-muted-foreground">({tags.length})</span>
            </h2>
          </div>
          
          {!hasLoaded || isLoading ? (
            <div className="p-8 text-center text-muted-foreground">加载中...</div>
          ) : tags.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-5xl">🏷️</span>
              <p className="text-muted-foreground mt-3">还没有标签</p>
              <p className="text-sm text-muted-foreground mt-1">创建第一个标签来分类你的任务吧</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tags.map(tag => (
                <div key={tag.id} className="p-4 flex items-center gap-3">
                  {editingId === tag.id ? (
                    // 编辑模式
                    <div className="flex-1 flex items-center gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {presetColors.slice(0, 5).map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                              editColor === color ? 'ring-2 ring-offset-1 ring-foreground' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-muted-foreground hover:text-foreground text-sm"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    // 展示模式
                    <>
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-foreground font-medium flex-1">#{tag.name}</span>
                      <button
                        onClick={() => startEdit(tag)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                        title="编辑"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="删除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
