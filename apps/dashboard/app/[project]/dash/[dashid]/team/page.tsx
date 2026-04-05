'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/lib/auth-client';
import {
  createSharedNode,
  getMySharedNodes,
  getSharedNodeByKey,
  submitSharedNodeData,
  deleteSharedNode,
} from './actions';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { toast } from 'sonner';
import {
  Share2,
  Plus,
  Key,
  Copy,
  Trash2,
  Check,
  Clock,
  ArrowRight,
  Users,
  RefreshCw,
  X,
} from 'lucide-react';

interface SharedNodeItem {
  id: string;
  shareKey: string;
  name: string;
  description: string | null;
  expectedColumns: any;
  data: any;
  status: string;
  createdAt: string;
}

export default function TeamPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [myNodes, setMyNodes] = useState<SharedNodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createColumns, setCreateColumns] = useState('');
  const [creating, setCreating] = useState(false);

  // Join form
  const [showJoin, setShowJoin] = useState(false);
  const [joinKey, setJoinKey] = useState('');
  const [joinedNode, setJoinedNode] = useState<any>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  const fetchMyNodes = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const nodes = await getMySharedNodes(userId);
      setMyNodes(nodes as any);
    } catch (err) {
      console.error('Failed to fetch shared nodes:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMyNodes();
  }, [fetchMyNodes]);

  // Create shared node
  const handleCreate = async () => {
    if (!userId || !createName.trim() || !createColumns.trim()) {
      toast.error('Please fill in name and columns');
      return;
    }

    setCreating(true);
    try {
      const cols = createColumns.split(',').map((c) => c.trim()).filter(Boolean);
      if (cols.length === 0) {
        toast.error('Enter at least one column');
        setCreating(false);
        return;
      }

      await createSharedNode({
        creatorId: userId,
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        expectedColumns: cols,
      });

      toast.success('Shared node created!');
      setCreateName('');
      setCreateDesc('');
      setCreateColumns('');
      setShowCreate(false);
      fetchMyNodes();
    } catch (err) {
      console.error('Create failed:', err);
      toast.error('Failed to create shared node');
    } finally {
      setCreating(false);
    }
  };

  // Join via key
  const handleJoinLookup = async () => {
    if (!joinKey.trim()) return;
    try {
      const node = await getSharedNodeByKey(joinKey.trim().toUpperCase());
      if (!node) {
        toast.error('Invalid share key');
        return;
      }
      setJoinedNode(node);
      // Initialize empty mappings
      const expectedCols = (node.expectedColumns as string[]) || [];
      const mappings: Record<string, string> = {};
      expectedCols.forEach((col) => {
        mappings[col] = '';
      });
      setColumnMappings(mappings);
    } catch (err) {
      console.error('Lookup failed:', err);
      toast.error('Failed to look up key');
    }
  };

  // Submit mapped data
  const handleJoinSubmit = async () => {
    if (!joinedNode) return;

    setJoinSubmitting(true);
    try {
      // Build mapped dataset
      const mappedData = {
        mappings: columnMappings,
        submittedAt: new Date().toISOString(),
        submittedBy: session?.user?.name || 'Unknown',
      };

      await submitSharedNodeData(joinedNode.shareKey, mappedData);
      toast.success('Data submitted successfully!');
      setShowJoin(false);
      setJoinedNode(null);
      setJoinKey('');
      setColumnMappings({});
    } catch (err) {
      console.error('Submit failed:', err);
      toast.error('Failed to submit data');
    } finally {
      setJoinSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!confirm('Delete this shared node?')) return;
    try {
      await deleteSharedNode(id, userId);
      toast.success('Deleted');
      setMyNodes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Share key copied!');
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="size-4 text-amber-500" />;
      case 'filled':
        return <Check className="size-4 text-green-500" />;
      case 'consumed':
        return <Check className="size-4 text-blue-500" />;
      default:
        return <Clock className="size-4" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Waiting for data';
      case 'filled':
        return 'Data received';
      case 'consumed':
        return 'Consumed';
      default:
        return status;
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please log in to access Team Sharing.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Sharing</h1>
            <p className="text-sm text-muted-foreground">
              Share data between team members via unique keys
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
          >
            <Key className="size-4 mr-1" /> Join via Key
          </Button>
          <Button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
          >
            <Plus className="size-4 mr-1" /> Create Shared Node
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Share2 className="size-4" /> Create a Shared Node
          </h3>
          <p className="text-sm text-muted-foreground">
            Define the columns you expect. A share key will be generated.
            Give this key to other users so they can send you data.
          </p>

          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Attendance Data - Section A"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="e.g. Need attendance from Jan to Mar"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expected Columns (comma-separated)</Label>
              <Input
                value={createColumns}
                onChange={(e) => setCreateColumns(e.target.value)}
                placeholder="e.g. Enrollment, Name, Total Present, Total Absent"
              />
              <p className="text-[10px] text-muted-foreground">
                These are the columns you expect the other user to fill in.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create & Generate Key'}
            </Button>
          </div>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="border rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Key className="size-4" /> Join via Share Key
          </h3>

          {!joinedNode ? (
            <div className="flex gap-2">
              <Input
                value={joinKey}
                onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
                placeholder="Enter share key (e.g. ABC1234XYZ)"
                className="flex-1 uppercase tracking-wider font-mono"
              />
              <Button onClick={handleJoinLookup}>
                <ArrowRight className="size-4" /> Look Up
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm">
                <div className="font-medium">{joinedNode.name}</div>
                {joinedNode.description && (
                  <div className="text-xs text-muted-foreground mt-1">{joinedNode.description}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  By: {joinedNode.creator?.name || 'User'}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">
                  Map your columns to expected columns:
                </Label>
                <div className="space-y-2">
                  {((joinedNode.expectedColumns as string[]) || []).map((expectedCol) => (
                    <div key={expectedCol} className="flex items-center gap-2">
                      <span className="text-xs font-medium min-w-[120px] px-2 py-1 bg-violet-100 dark:bg-violet-900 rounded">
                        {expectedCol}
                      </span>
                      <ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />
                      <Input
                        value={columnMappings[expectedCol] || ''}
                        onChange={(e) =>
                          setColumnMappings((prev) => ({ ...prev, [expectedCol]: e.target.value }))
                        }
                        placeholder="Your column name"
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setJoinedNode(null); setJoinKey(''); }}>
                  Cancel
                </Button>
                <Button onClick={handleJoinSubmit} disabled={joinSubmitting}>
                  {joinSubmitting ? 'Submitting...' : 'Submit Column Mappings'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* My shared nodes list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My Shared Nodes</h2>
          <Button variant="ghost" size="sm" onClick={fetchMyNodes} disabled={loading}>
            <RefreshCw className={`size-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600 mx-auto mb-2" />
            Loading...
          </div>
        ) : myNodes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Share2 className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No shared nodes yet</p>
            <p className="text-xs mt-1">Create one and share the key with your team</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {myNodes.map((node) => (
              <div
                key={node.id}
                className="border rounded-xl p-4 bg-card hover:border-violet-300 dark:hover:border-violet-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{node.name}</h3>
                    {node.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{node.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon(node.status)}
                    <span className="text-xs text-muted-foreground">{statusLabel(node.status)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  {/* Share key */}
                  <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
                    <Key className="size-3 text-violet-500" />
                    <span className="font-mono text-sm font-semibold tracking-widest">{node.shareKey}</span>
                    <button
                      onClick={() => copyKey(node.shareKey)}
                      className="p-0.5 rounded hover:bg-background transition"
                    >
                      <Copy className="size-3 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Columns preview */}
                  <div className="flex flex-wrap gap-1">
                    {((node.expectedColumns as string[]) || []).slice(0, 5).map((col, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
                        {col}
                      </span>
                    ))}
                    {((node.expectedColumns as string[]) || []).length > 5 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{(node.expectedColumns as string[]).length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Data preview if filled */}
                {node.status === 'filled' && node.data && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-xs text-green-700 dark:text-green-300 font-medium">
                      ✓ Data received! Use this in your workflow.
                    </div>
                    <pre className="text-[10px] text-muted-foreground mt-1 overflow-auto max-h-[60px]">
                      {JSON.stringify(node.data, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex justify-between items-center mt-3">
                  <span className="text-[10px] text-muted-foreground">
                    Created {new Date(node.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(node.id)}
                  >
                    <Trash2 className="size-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}