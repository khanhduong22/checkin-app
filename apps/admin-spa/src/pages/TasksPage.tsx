import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Check,
  X,
  ExternalLink,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Eye,
  Search,
  Filter,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { HeadlessCombobox } from "@/components/ui/headless-combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTasks,
  useTaskDefinitions,
  useTaskItems,
} from "@/hooks/useAdminData";
import type {
  AdminTaskItem,
  TaskDefinition,
  MarketplaceTaskItem,
} from "@/types";
import { toast } from "sonner";

export function TasksPage() {
  const { tasks, approveTask, reviewTask } = useTasks();
  const {
    definitions,
    isLoading: isLoadingDefs,
    createDefinition,
    updateDefinition,
    toggleActive,
    deleteDefinition,
  } = useTaskDefinitions();
  const {
    items: taskItems,
    isLoading: isLoadingItems,
    createTaskItem,
    resetTaskItem,
    closeTaskItem,
    deleteTaskItem,
  } = useTaskItems();

  // Pending review list (strictly tasks with status SUBMITTED)
  const pendingTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    return list.filter((t) => t.status === "SUBMITTED");
  }, [tasks]);

  // Review Dialog State
  const [reviewingTask, setReviewingTask] = useState<AdminTaskItem | null>(null);
  const [bonusPenalty, setBonusPenalty] = useState(0);
  const [adminNote, setAdminNote] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const openReview = (task: AdminTaskItem) => {
    setReviewingTask(task);
    setBonusPenalty(task.bonusPenalty || 0);
    setAdminNote(task.adminNote || "");

    // Auto-calculate penalty if overdue (> 7 days from start to submit)
    if (task.startedAt) {
      const submitted = task.submittedAt ? new Date(task.submittedAt) : new Date();
      const started = new Date(task.startedAt);
      const diffTime = Math.abs(submitted.getTime() - started.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 7 && !task.bonusPenalty) {
        const baseAmount = (task.ratePerUnit || 0) * (task.quantity || 1);
        const penalty = -(baseAmount * 0.5); // 50% penalty
        setBonusPenalty(penalty);
        setAdminNote(
          `Overdue by ${diffDays} days (Started: ${format(
            started,
            "dd/MM"
          )}). Auto penalty applied.`
        );
      }
    }
  };

  const handleReviewSubmit = async (decision: "APPROVED" | "REJECTED") => {
    if (!reviewingTask || isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      await reviewTask(reviewingTask.id, decision, {
        bonusPenalty,
        adminNote,
      });
      setReviewingTask(null);
      setBonusPenalty(0);
      setAdminNote("");
    } catch {
      // Toast handled by hook
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleQuickApprove = async (id: string) => {
    await approveTask(id);
  };

  // History Tab State
  const [historyMonth, setHistoryMonth] = useState("all");

  const reviewedTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const reviewed = list.filter(
      (t) => t.status === "APPROVED" || t.status === "REJECTED"
    );

    if (historyMonth === "all") {
      return reviewed.slice(0, 100);
    }

    const monthNum = parseInt(historyMonth, 10);
    return reviewed.filter((t) => {
      const dateStr = t.reviewedAt || t.submittedAt;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() + 1 === monthNum;
    });
  }, [tasks, historyMonth]);

  // Definitions Tab State
  const [defSearch, setDefSearch] = useState("");
  const [defStatusFilter, setDefStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    baseReward: 0,
    unit: "",
  });

  const [editingDef, setEditingDef] = useState<TaskDefinition | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    baseReward: 0,
    unit: "",
  });

  const filteredDefinitions = useMemo(() => {
    return definitions.filter((d) => {
      const matchStatus =
        defStatusFilter === "ALL"
          ? true
          : defStatusFilter === "ACTIVE"
          ? d.active
          : !d.active;

      const q = defSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        d.unit.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [definitions, defSearch, defStatusFilter]);

  const handleCreateDef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.unit.trim()) {
      toast.error("Vui lòng điền đầy đủ tên và đơn vị tính");
      return;
    }
    setIsSubmittingCreate(true);
    try {
      await createDefinition({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        baseReward: Number(createForm.baseReward) || 0,
        unit: createForm.unit.trim(),
        active: true,
      });
      setIsCreateOpen(false);
      setCreateForm({ name: "", description: "", baseReward: 0, unit: "" });
    } catch {
      // Toast handled by hook
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openEditDef = (def: TaskDefinition) => {
    setEditingDef(def);
    setEditForm({
      name: def.name,
      description: def.description || "",
      baseReward: def.baseReward,
      unit: def.unit,
    });
  };

  const handleUpdateDef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDef) return;
    if (!editForm.name.trim() || !editForm.unit.trim()) {
      toast.error("Vui lòng điền đầy đủ tên và đơn vị tính");
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await updateDefinition(editingDef.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        baseReward: Number(editForm.baseReward) || 0,
        unit: editForm.unit.trim(),
      });
      setEditingDef(null);
    } catch {
      // Toast handled by hook
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteDef = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task definition?")) return;
    try {
      await deleteDefinition(id);
    } catch {
      // Toast handled by hook
    }
  };

  // Marketplace Tab State
  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState<
    "ALL" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CLOSED"
  >("ALL");
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isSubmittingCreateItem, setIsSubmittingCreateItem] = useState(false);
  const [createItemForm, setCreateItemForm] = useState({
    taskDefId: "",
    title: "",
    description: "",
    deadline: "",
  });
  const [viewingItem, setViewingItem] = useState<MarketplaceTaskItem | null>(
    null
  );

  const filteredTaskItems = useMemo(() => {
    const list = Array.isArray(taskItems) ? taskItems : [];
    return list.filter((item) => {
      const matchStatus =
        itemStatusFilter === "ALL" ? true : item.status === itemStatusFilter;

      const q = itemSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.taskDefinition?.name &&
          item.taskDefinition.name.toLowerCase().includes(q)) ||
        (item.assignee?.name && item.assignee.name.toLowerCase().includes(q));

      return matchStatus && matchSearch;
    });
  }, [taskItems, itemSearch, itemStatusFilter]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createItemForm.taskDefId || !createItemForm.title.trim()) {
      toast.error("Please fill in required fields");
      return;
    }
    setIsSubmittingCreateItem(true);
    try {
      await createTaskItem({
        taskDefId: createItemForm.taskDefId,
        title: createItemForm.title.trim(),
        description: createItemForm.description.trim() || undefined,
        deadline: createItemForm.deadline || undefined,
      });
      setIsCreateItemOpen(false);
      setCreateItemForm({
        taskDefId: "",
        title: "",
        description: "",
        deadline: "",
      });
    } catch {
      // Toast handled by hook
    } finally {
      setIsSubmittingCreateItem(false);
    }
  };

  const handleResetItem = async (id: string) => {
    try {
      await resetTaskItem(id);
    } catch {
      // Toast handled by hook
    }
  };

  const handleCloseItem = async (id: string) => {
    try {
      await closeTaskItem(id);
    } catch {
      // Toast handled by hook
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this task item?")) return;
    try {
      await deleteTaskItem(id);
    } catch {
      // Toast handled by hook
    }
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Title */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          WFH & Packing Management
        </h1>
      </div>

      <Tabs defaultValue="review" className="space-y-6">
        {/* Warm beige rounded tabs bar */}
        <div className="overflow-x-auto no-scrollbar">
          <TabsList className="bg-[#EADFD7] p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1 w-full max-w-full h-auto border-0">
            <TabsTrigger
              id="tab-trigger-review"
              value="review"
              className="data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm text-stone-700 font-medium py-2.5 min-h-[38px] rounded-lg text-xs sm:text-sm transition-all"
            >
              Review Pending ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger
              id="tab-trigger-history"
              value="history"
              className="data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm text-stone-700 font-medium py-2.5 min-h-[38px] rounded-lg text-xs sm:text-sm transition-all"
            >
              History
            </TabsTrigger>
            <TabsTrigger
              id="tab-trigger-definitions"
              value="definitions"
              className="data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm text-stone-700 font-medium py-2.5 min-h-[38px] rounded-lg text-xs sm:text-sm transition-all"
            >
              Task Definitions
            </TabsTrigger>
            <TabsTrigger
              id="tab-trigger-items"
              value="items"
              className="data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm text-stone-700 font-medium py-2.5 min-h-[38px] rounded-lg text-xs sm:text-sm transition-all"
            >
              Marketplace ({taskItems.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. REVIEW PENDING TAB */}
        <TabsContent value="review">
          <Card className="bg-white border border-stone-200/80 shadow-sm rounded-2xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-bold text-stone-900">
                Review & Approval
              </CardTitle>
              <CardDescription className="text-stone-500 text-sm">
                Duyệt công việc nhân viên làm tại nhà (cộng lương) và các hoá đơn
                đóng gói (tích điểm).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h2 className="text-base font-semibold text-stone-900">
                Pending Reviews
              </h2>

              {pendingTasks.length === 0 ? (
                <div className="py-12 text-center text-stone-500 font-medium">
                  No pending tasks to review.
                </div>
              ) : (
                <div className="overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch] rounded-xl border border-stone-200/80">
                  <Table className="w-full min-w-[700px]">
                    <TableHeader className="bg-stone-50/60">
                      <TableRow className="border-b border-stone-200 hover:bg-transparent">
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          User
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Task
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Quantity
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Total Value
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Correctness
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Submitted
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTasks.map((task) => (
                        <TableRow
                          key={task.id}
                          className="border-b border-stone-100 hover:bg-stone-50/70 transition-colors"
                        >
                          <TableCell className="font-medium text-stone-900 py-3.5">
                            {task.user?.name || "Nhân viên"}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-stone-900 text-sm">
                                {task.title}
                              </span>
                              <span className="text-xs text-stone-500 mt-0.5">
                                {(task.ratePerUnit || 0).toLocaleString()} đ/
                                {task.unit || "điểm"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-stone-800 py-3.5 text-sm">
                            {task.quantity || 1} {task.unit || "điểm"}
                          </TableCell>
                          <TableCell className="font-bold text-stone-900 text-sm py-3.5">
                            {(task.totalReward || 0).toLocaleString()} đ
                          </TableCell>
                          <TableCell className="py-3.5">
                            {task.proofUrl || task.evidenceLink ? (
                              <a
                                href={task.proofUrl || task.evidenceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:underline text-sm font-medium"
                              >
                                View Proof{" "}
                                <ExternalLink className="ml-1 h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-stone-400 text-xs">
                                No link
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-stone-600 font-mono py-3.5">
                            {task.submittedAt
                              ? format(new Date(task.submittedAt), "dd/MM HH:mm")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right space-x-2 whitespace-nowrap py-3.5">
                            <Button
                              size="sm"
                              className="bg-[#8B5E3C] hover:bg-[#724C30] text-white text-xs px-4 py-1.5 h-9 min-h-[36px] rounded-lg shadow-sm font-medium"
                              onClick={() => openReview(task)}
                            >
                              Review
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 h-9 min-h-[36px] rounded-lg shadow-sm font-medium"
                              onClick={() => handleQuickApprove(task.id)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Duyệt
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. HISTORY TAB */}
        <TabsContent value="history">
          <Card className="bg-white border border-stone-200/80 shadow-sm rounded-2xl">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-stone-900">
                    Review History
                  </CardTitle>
                  <CardDescription className="text-stone-500 text-sm">
                    Xem lại danh sách các task đã được duyệt hoặc bị từ chối gần
                    đây.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-700">
                    Lọc theo:
                  </span>
                  <Select
                    value={historyMonth}
                    onValueChange={setHistoryMonth}
                  >
                    <SelectTrigger className="w-[160px] bg-white border-stone-200 h-10 sm:h-9 text-xs sm:text-sm">
                      <SelectValue placeholder="All/Recent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Gần đây (100)</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          Tháng {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reviewedTasks.length === 0 ? (
                <div className="py-12 text-center text-stone-500 font-medium">
                  No reviewed tasks found.
                </div>
              ) : (
                <div className="overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch] rounded-xl border border-stone-200/80">
                  <Table className="w-full min-w-[650px]">
                    <TableHeader className="bg-stone-50/60">
                      <TableRow className="border-b border-stone-200 hover:bg-transparent">
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Date
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          User
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Task
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Quantity
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Result
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5 text-right">
                          Admin Note
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewedTasks.map((task) => (
                        <TableRow
                          key={task.id}
                          className="border-b border-stone-100 hover:bg-stone-50/70 transition-colors"
                        >
                          <TableCell className="whitespace-nowrap text-xs text-stone-600 font-mono py-3.5">
                            {task.reviewedAt
                              ? format(new Date(task.reviewedAt), "dd/MM HH:mm")
                              : task.submittedAt
                              ? format(new Date(task.submittedAt), "dd/MM HH:mm")
                              : "-"}
                          </TableCell>
                          <TableCell className="font-medium text-stone-900 whitespace-nowrap py-3.5">
                            {task.user?.name || "Nhân viên"}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-stone-900 text-sm">
                                {task.title}
                              </span>
                              <span className="text-xs text-stone-500 mt-0.5">
                                {(task.ratePerUnit || 0).toLocaleString()} đ/
                                {task.unit || "điểm"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-stone-800 font-medium text-sm py-3.5">
                            {task.quantity || 1} {task.unit || "điểm"}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col items-start gap-1">
                              <Badge
                                variant={
                                  task.status === "APPROVED"
                                    ? "default"
                                    : "destructive"
                                }
                                className={
                                  task.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-red-100 text-red-800 border-red-200"
                                }
                              >
                                {task.status}
                              </Badge>
                              {task.status === "APPROVED" && (
                                <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">
                                  +{(task.totalReward || 0).toLocaleString()}{" "}
                                  {task.unit === "điểm" ? "điểm" : "đ"}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs text-stone-600 max-w-[200px] truncate py-3.5">
                            {task.adminNote || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. TASK DEFINITIONS TAB */}
        <TabsContent value="definitions">
          <Card className="bg-white border border-stone-200/80 shadow-sm rounded-2xl">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-stone-900">
                    Task Definitions
                  </CardTitle>
                  <CardDescription className="text-stone-500 text-sm">
                    Manage available tasks, prices, and units.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-[#8B5E3C] hover:bg-[#724C30] text-white text-xs h-9 rounded-lg"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50/60 p-3 rounded-xl border border-stone-200">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    placeholder="Search task name, unit, description..."
                    value={defSearch}
                    onChange={(e) => setDefSearch(e.target.value)}
                    className="pl-9 bg-white border-stone-200 h-10 sm:h-9 text-base sm:text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-stone-400" />
                  <select
                    value={defStatusFilter}
                    onChange={(e) => setDefStatusFilter(e.target.value as any)}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 h-10 sm:h-9 text-base sm:text-xs text-stone-700 shadow-sm"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {filteredDefinitions.length === 0 ? (
                <div className="py-12 text-center text-stone-500 font-medium">
                  {isLoadingDefs
                    ? "Loading task definitions..."
                    : "No task definitions found."}
                </div>
              ) : (
                <div className="overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch] rounded-xl border border-stone-200/80">
                  <Table className="w-full min-w-[600px]">
                    <TableHeader className="bg-stone-50/60">
                      <TableRow className="border-b border-stone-200 hover:bg-transparent">
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Name
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Unit
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Reward
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Status
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDefinitions.map((task) => (
                        <TableRow
                          key={task.id}
                          className="border-b border-stone-100 hover:bg-stone-50/70 transition-colors"
                        >
                          <TableCell className="font-medium text-stone-900 py-3.5">
                            <div>
                              <div className="font-semibold text-stone-900 text-sm">
                                {task.name}
                              </div>
                              {task.description && (
                                <div className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                                  {task.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs bg-stone-50 border-stone-300 text-stone-700"
                            >
                              {task.unit}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-stone-900 text-sm py-3.5 font-mono">
                            {task.baseReward.toLocaleString()} đ
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={task.active}
                                onCheckedChange={() => toggleActive(task)}
                              />
                              <span className="text-xs font-medium text-stone-600">
                                {task.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-1.5 py-3.5">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-stone-700 hover:text-stone-900 border-stone-200"
                              onClick={() => openEditDef(task)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleDeleteDef(task.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. MARKETPLACE TAB */}
        <TabsContent value="items">
          <Card className="bg-white border border-stone-200/80 shadow-sm rounded-2xl">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-stone-900">
                    Marketplace Items
                  </CardTitle>
                  <CardDescription className="text-stone-500 text-sm">
                    Post specific one-time jobs for employees to claim.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsCreateItemOpen(true)}
                  className="bg-[#8B5E3C] hover:bg-[#724C30] text-white text-xs h-9 rounded-lg"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Post New Task
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50/60 p-3 rounded-xl border border-stone-200">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    placeholder="Search title, description, assignee..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="pl-9 bg-white border-stone-200 h-10 sm:h-9 text-base sm:text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-stone-400" />
                  <select
                    value={itemStatusFilter}
                    onChange={(e) => setItemStatusFilter(e.target.value as any)}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 h-10 sm:h-9 text-base sm:text-xs text-stone-700 shadow-sm"
                  >
                    <option value="ALL">All Status</option>
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              {filteredTaskItems.length === 0 ? (
                <div className="py-12 text-center text-stone-500 font-medium">
                  {isLoadingItems
                    ? "Loading marketplace items..."
                    : "No marketplace tasks found."}
                </div>
              ) : (
                <div className="overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch] rounded-xl border border-stone-200/80">
                  <Table className="w-full min-w-[700px]">
                    <TableHeader className="bg-stone-50/60">
                      <TableRow className="border-b border-stone-200 hover:bg-transparent">
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Title
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Type
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Reward
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Assignee
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Status
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5">
                          Deadline
                        </TableHead>
                        <TableHead className="font-semibold text-stone-600 text-xs py-3.5 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTaskItems.map((item) => (
                        <TableRow
                          key={item.id}
                          className="border-b border-stone-100 hover:bg-stone-50/70 transition-colors"
                        >
                          <TableCell className="font-medium text-stone-900 py-3.5">
                            <button
                              type="button"
                              className="text-left hover:underline hover:text-stone-900 flex flex-col items-start group"
                              onClick={() => setViewingItem(item)}
                            >
                              <span className="flex items-center gap-1 font-semibold text-stone-900 text-sm">
                                {item.title}
                                <Eye className="h-3.5 w-3.5 opacity-0 group-hover:opacity-70 transition-opacity text-stone-500" />
                              </span>
                              {item.description && (
                                <span className="text-xs text-stone-500 line-clamp-1 max-w-[260px] mt-0.5">
                                  {item.description}
                                </span>
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="py-3.5 text-xs text-stone-700">
                            {item.taskDefinition?.name || "—"}
                          </TableCell>
                          <TableCell className="font-bold text-stone-900 text-sm font-mono py-3.5">
                            {item.taskDefinition?.baseReward.toLocaleString()} đ
                          </TableCell>
                          <TableCell className="py-3.5 text-xs text-stone-800">
                            {item.assignee?.name || (
                              <span className="text-stone-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge
                              variant={
                                item.status === "OPEN"
                                  ? "default"
                                  : item.status === "IN_PROGRESS"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={
                                item.status === "OPEN"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : item.status === "IN_PROGRESS"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-stone-100 text-stone-600 border-stone-200"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-stone-600 font-mono py-3.5">
                            {item.deadline
                              ? format(new Date(item.deadline), "dd/MM/yyyy HH:mm")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right space-x-1.5 whitespace-nowrap py-3.5">
                            {item.status === "OPEN" && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                                onClick={() => handleCloseItem(item.id)}
                                title="Close Task"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {item.status === "IN_PROGRESS" && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                onClick={() => handleResetItem(item.id)}
                                title="Reset về OPEN (cho nhận lại)"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleDeleteItem(item.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog
        open={Boolean(reviewingTask)}
        onOpenChange={(open) => !open && setReviewingTask(null)}
      >
        <DialogContent className="max-w-lg bg-white border border-stone-200/80 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-stone-900">
              Review Submission
            </DialogTitle>
            <DialogDescription className="text-stone-500 text-sm">
              Review work from <b>{reviewingTask?.user?.name}</b> for task{" "}
              <b>{reviewingTask?.title}</b>.
            </DialogDescription>
          </DialogHeader>

          {reviewingTask && (
            <div className="space-y-4 py-4 text-stone-800">
              <div className="grid grid-cols-2 gap-4 text-sm bg-stone-50/70 p-3.5 rounded-xl border border-stone-200">
                <div>
                  <span className="font-semibold block text-stone-600 text-xs uppercase tracking-wider">
                    Quantity:
                  </span>
                  <span className="font-medium text-stone-900 text-sm mt-0.5 block">
                    {reviewingTask.quantity || 1} {reviewingTask.unit || "điểm"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold block text-stone-600 text-xs uppercase tracking-wider">
                    Base Total:
                  </span>
                  <span className="font-medium text-stone-900 text-sm mt-0.5 block">
                    {(
                      (reviewingTask.quantity || 1) *
                      (reviewingTask.ratePerUnit || 0)
                    ).toLocaleString()}{" "}
                    đ
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold block text-stone-600 text-xs uppercase tracking-wider">
                    User Note:
                  </span>
                  <p className="bg-white p-2.5 rounded-lg border border-stone-200 text-xs text-stone-700 mt-1 whitespace-pre-wrap">
                    {reviewingTask.notes || reviewingTask.note || "No note"}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold block text-stone-600 text-xs uppercase tracking-wider">
                    Evidence:
                  </span>
                  {reviewingTask.proofUrl || reviewingTask.evidenceLink ? (
                    <a
                      href={reviewingTask.proofUrl || reviewingTask.evidenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline break-all text-xs inline-flex items-center gap-1 mt-1 font-medium"
                    >
                      {reviewingTask.proofUrl || reviewingTask.evidenceLink}{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-stone-400 text-xs mt-1 block">None</span>
                  )}
                </div>
              </div>

              <div className="border-t border-stone-200 pt-4 space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label
                    htmlFor="bonus"
                    className="text-right text-stone-700 font-medium text-xs"
                  >
                    Bonus/Penalty
                  </Label>
                  <Input
                    id="bonus"
                    type="number"
                    value={bonusPenalty}
                    onChange={(e) => setBonusPenalty(Number(e.target.value))}
                    className="col-span-3 bg-white border-stone-200"
                  />
                </div>
                <p className="text-[11px] text-stone-500 text-right italic">
                  Negative for penalty, positive for bonus.
                </p>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label
                    htmlFor="note"
                    className="text-right text-stone-700 font-medium text-xs pt-2"
                  >
                    Admin Note
                  </Label>
                  <Textarea
                    id="note"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="col-span-3 bg-white border-stone-200"
                    placeholder="Reason for penalty/bonus or rejection..."
                    rows={2}
                  />
                </div>

                <div className="bg-[#FAF6F0] border border-[#EADFD7] p-3.5 rounded-xl flex justify-between items-center shadow-sm">
                  <span className="font-bold text-stone-900 text-sm">
                    Final Payout:
                  </span>
                  <span className="text-xl font-bold text-[#8B5E3C] font-mono">
                    {Math.max(
                      0,
                      (reviewingTask.quantity || 1) *
                        (reviewingTask.ratePerUnit || 0) +
                        bonusPenalty
                    ).toLocaleString()}{" "}
                    đ
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => handleReviewSubmit("REJECTED")}
              disabled={isSubmittingReview}
              className="text-xs"
            >
              {isSubmittingReview ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
            <div className="flex-1" />
            <Button
              className="bg-[#8B5E3C] hover:bg-[#724C30] text-white text-xs"
              onClick={() => handleReviewSubmit("APPROVED")}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Definition Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-white border border-stone-200 rounded-2xl shadow-xl">
          <form onSubmit={handleCreateDef}>
            <DialogHeader>
              <DialogTitle className="text-stone-900 font-bold">
                Create New Task Definition
              </DialogTitle>
              <DialogDescription className="text-stone-500 text-xs">
                Define a new task that users can perform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-xs text-stone-700">
                  Name
                </Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className="col-span-3 bg-white border-stone-200"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit" className="text-right text-xs text-stone-700">
                  Unit
                </Label>
                <Input
                  id="unit"
                  placeholder="e.g. bài, video, điểm"
                  value={createForm.unit}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, unit: e.target.value })
                  }
                  className="col-span-3 bg-white border-stone-200"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="reward"
                  className="text-right text-xs text-stone-700"
                >
                  Reward (VND)
                </Label>
                <Input
                  id="reward"
                  type="number"
                  min="0"
                  value={createForm.baseReward}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      baseReward: Number(e.target.value),
                    })
                  }
                  className="col-span-3 bg-white border-stone-200"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label
                  htmlFor="desc"
                  className="text-right text-xs text-stone-700 pt-2"
                >
                  Description
                </Label>
                <Input
                  id="desc"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  className="col-span-3 bg-white border-stone-200"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmittingCreate}
                className="bg-[#8B5E3C] hover:bg-[#724C30] text-white text-xs"
              >
                {isSubmittingCreate ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Definition Edit Dialog */}
      <Dialog
        open={Boolean(editingDef)}
        onOpenChange={(open) => !open && setEditingDef(null)}
      >
        <DialogContent className="bg-white border border-stone-200 rounded-2xl shadow-xl">
          <form onSubmit={handleUpdateDef}>
            <DialogHeader>
              <DialogTitle className="text-stone-900 font-bold">
                Edit Task Definition
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="edit-name"
                  className="text-right text-xs text-stone-700"
                >
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="col-span-3 bg-white border-stone-200"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="edit-unit"
                  className="text-right text-xs text-stone-700"
                >
                  Unit
                </Label>
                <Input
                  id="edit-unit"
                  value={editForm.unit}
                  onChange={(e) =>
                    setEditForm({ ...editForm, unit: e.target.value })
                  }
                  className="col-span-3 bg-white border-stone-200"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="edit-reward"
                  className="text-right text-xs text-stone-700"
                >
                  Reward
                </Label>
                <Input
                  id="edit-reward"
                  type="number"
                  min="0"
                  value={editForm.baseReward}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      baseReward: Number(e.target.value),
                    })
                  }
                  className="col-span-3 bg-white border-stone-200"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label
                  htmlFor="edit-desc"
                  className="text-right text-xs text-stone-700 pt-2"
                >
                  Description
                </Label>
                <Input
                  id="edit-desc"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      description: e.target.value,
                    })
                  }
                  className="col-span-3 bg-white border-stone-200"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmittingEdit}
                className="bg-[#8B5E3C] hover:bg-[#724C30] text-white text-xs"
              >
                {isSubmittingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Post Task Item Dialog */}
      <Dialog open={isCreateItemOpen} onOpenChange={setIsCreateItemOpen}>
        <DialogContent className="sm:max-w-2xl bg-white border border-stone-200 rounded-2xl shadow-xl">
          <form onSubmit={handleCreateItem}>
            <DialogHeader>
              <DialogTitle className="text-stone-900 font-bold">
                Post a Task Item
              </DialogTitle>
              <DialogDescription className="text-stone-500 text-xs">
                Create a specific job for users to claim.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs text-stone-700">
                  Task Type
                </Label>
                <div className="col-span-3">
                  <HeadlessCombobox
                    items={definitions}
                    value={createItemForm.taskDefId}
                    onChange={(val) =>
                      setCreateItemForm({ ...createItemForm, taskDefId: val })
                    }
                    valueKey="id"
                    displayKey="name"
                    placeholder="Select a task type"
                    renderOption={(item) => (
                      <span className="flex justify-between w-full">
                        <span>{item.name}</span>
                        <span className="text-stone-500 text-xs ml-2 font-mono">
                          {item.baseReward.toLocaleString()}đ / {item.unit}
                        </span>
                      </span>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="item-title"
                  className="text-right text-xs text-stone-700"
                >
                  Title
                </Label>
                <Input
                  id="item-title"
                  value={createItemForm.title}
                  onChange={(e) =>
                    setCreateItemForm({
                      ...createItemForm,
                      title: e.target.value,
                    })
                  }
                  className="col-span-3 bg-white border-stone-200"
                  placeholder="e.g. Fix bug #123"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="item-deadline"
                  className="text-right text-xs text-stone-700"
                >
                  Deadline
                </Label>
                <Input
                  id="item-deadline"
                  type="datetime-local"
                  value={createItemForm.deadline}
                  onChange={(e) =>
                    setCreateItemForm({
                      ...createItemForm,
                      deadline: e.target.value,
                    })
                  }
                  className="col-span-3 bg-white border-stone-200"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label
                  htmlFor="item-desc"
                  className="text-right text-xs text-stone-700 pt-2"
                >
                  Description
                </Label>
                <Textarea
                  id="item-desc"
                  value={createItemForm.description}
                  onChange={(e) =>
                    setCreateItemForm({
                      ...createItemForm,
                      description: e.target.value,
                    })
                  }
                  className="col-span-3 bg-white border-stone-200"
                  placeholder="Details about this specific task..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmittingCreateItem}
                className="bg-[#8B5E3C] hover:bg-[#724C30] text-white text-xs"
              >
                {isSubmittingCreateItem ? "Posting..." : "Post Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Item Detail Dialog */}
      <Dialog
        open={Boolean(viewingItem)}
        onOpenChange={(open) => !open && setViewingItem(null)}
      >
        <DialogContent className="sm:max-w-lg bg-white border border-stone-200 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-stone-900 leading-snug">
              {viewingItem?.title}
            </DialogTitle>
            <DialogDescription asChild>
              <span className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-800 rounded px-2 py-0.5 mt-1 font-medium">
                {viewingItem?.taskDefinition?.name || "Nhiệm vụ"}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-stone-800">
            {viewingItem?.description ? (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm whitespace-pre-wrap leading-relaxed text-stone-700">
                {viewingItem.description}
              </div>
            ) : (
              <p className="text-sm text-stone-500 italic">
                Không có mô tả chi tiết.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm border-t border-stone-200 pt-3">
              <div>
                <span className="text-stone-500 text-xs block">Reward:</span>
                <span className="font-semibold text-emerald-600 font-mono">
                  {viewingItem?.taskDefinition?.baseReward.toLocaleString()} đ
                </span>
              </div>
              <div>
                <span className="text-stone-500 text-xs block">Assignee:</span>
                <span className="font-semibold text-stone-900">
                  {viewingItem?.assignee?.name || "—"}
                </span>
              </div>
              <div>
                <span className="text-stone-500 text-xs block">Status:</span>
                <Badge
                  variant={
                    viewingItem?.status === "OPEN"
                      ? "default"
                      : viewingItem?.status === "IN_PROGRESS"
                      ? "secondary"
                      : "outline"
                  }
                  className="mt-0.5"
                >
                  {viewingItem?.status}
                </Badge>
              </div>
              <div>
                <span className="text-stone-500 text-xs block">Deadline:</span>
                <span className="text-stone-900 text-xs font-mono">
                  {viewingItem?.deadline
                    ? format(new Date(viewingItem.deadline), "dd/MM/yyyy HH:mm")
                    : "—"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingItem(null)}
              className="text-xs"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
