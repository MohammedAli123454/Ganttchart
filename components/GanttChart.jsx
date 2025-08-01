"use client";
import React, { useState, useMemo, useRef } from "react";
import { Plus, Settings2, ChevronDown, ChevronRight, ChevronsDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DatePicker } from "../components/date-picker";
import { NumericInput } from "../components/NumericInput";
import { addDays, addWeeks, addMonths, differenceInDays, format, startOfDay, endOfDay } from "../lib/dateUtils";

// --- Initial Data ---
const initialWBS = [
  {
    wbsId: "wbs1",
    wbsName: "Engineering",
    color: "#388bff",
    activities: [
      { id: "1", code: "ENG-001", description: "Basic Design", manHours: 30, startDate: new Date(2025, 5, 20), finishDate: new Date(2025, 5, 30), progress: 60 },
      { id: "2", code: "ENG-002", description: "Detail Design", manHours: 25, startDate: new Date(2025, 5, 25), finishDate: new Date(2025, 6, 10), progress: 40 },
    ],
  },
  {
    wbsId: "wbs2",
    wbsName: "Procurement",
    color: "#1e90ff",
    activities: [
      { id: "3", code: "PRC-001", description: "Vendor Selection", manHours: 20, startDate: new Date(2025, 6, 1), finishDate: new Date(2025, 6, 10), progress: 70 },
      { id: "4", code: "PRC-002", description: "Purchase Order", manHours: 15, startDate: new Date(2025, 6, 11), finishDate: new Date(2025, 6, 20), progress: 25 },
    ],
  },
  {
    wbsId: "wbs3",
    wbsName: "Construction",
    color: "#2778f0",
    activities: [
      { id: "5", code: "CON-001", description: "Site Mobilization", manHours: 50, startDate: new Date(2025, 6, 15), finishDate: new Date(2025, 6, 25), progress: 10 },
      { id: "6", code: "CON-002", description: "Civil Works", manHours: 40, startDate: new Date(2025, 6, 18), finishDate: new Date(2025, 7, 1), progress: 5 },
    ],
  },
];

const generateTaskCode = (wbsId, activities) => `${wbsId.split("-")[0].toUpperCase()}-${String(activities.length + 1).padStart(3, "0")}`;

// --- Fixed Context Menu Component ---
function ContextMenuPopover({ open, onOpenChange, onDelete, anchorRef }) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          ref={anchorRef}
          className="absolute invisible"
          style={{ pointerEvents: 'none' }}
        />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[160px]" side="bottom" align="start">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-600 hover:bg-red-50" 
          onClick={onDelete}
        >
          Delete Activity
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// --- Column Resizer for Table ---
const ColumnResizer = ({ onMouseDown }) => (
  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400" onMouseDown={onMouseDown} style={{ zIndex: 35 }} />
);

const headerColsDef = (showManHours) => [
  { key: "code", label: "Code" },
  { key: "description", label: "Activity Description" },
  ...(showManHours
    ? [
        { key: "manHours", label: "Man Hours" },
        { key: "activityWeight", label: "Activity Weight (%)" },
      ]
    : []),
  { key: "startDate", label: "Start Date" },
  { key: "finishDate", label: "Finish Date" },
  { key: "progress", label: "Progress (%)" },
];

// --- Main Gantt Chart Component ---
const GanttChart = () => {
  const [wbsList, setWbsList] = useState(initialWBS);
  const [showManHours, setShowManHours] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState({ wbsId: null, taskId: null });
  const [contextMenu, setContextMenu] = useState({ 
    visible: false, 
    wbsId: null, 
    taskId: null, 
    x: 0, 
    y: 0 
  });
  
  // Ref for the context menu anchor
  const contextMenuAnchorRef = useRef(null);

  // Collapsible state for each WBS
  const [collapsed, setCollapsed] = useState(Object.fromEntries(initialWBS.map(wbs => [wbs.wbsId, false])));
  const allCollapsed = Object.values(collapsed).every(Boolean);
  const toggleAll = (forceExpand) => setCollapsed(Object.fromEntries(wbsList.map(wbs => [wbs.wbsId, !forceExpand])));
  const [columnWidths, setColumnWidths] = useState({
    code: 80, description: 280, manHours: 90, activityWeight: 110, startDate: 120, finishDate: 120, progress: 90,
  });
  const [isResizing, setIsResizing] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // --- Drag-resize columns ---
  const handleMouseDown = (e, column) => {
    setIsResizing(column);
    setStartX(e.clientX);
    setStartWidth(columnWidths[column]);
    e.preventDefault();
  };
  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff);
    setColumnWidths((prev) => ({ ...prev, [isResizing]: newWidth }));
  };
  const handleMouseUp = () => setIsResizing(null);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Weighted progress and man hours
  const allActivities = useMemo(() => wbsList.flatMap(wbs => wbs.activities.map(act => ({ ...act, wbsId: wbs.wbsId }))), [wbsList]);
  const totalManHours = useMemo(() => allActivities.reduce((sum, t) => sum + (Number(t.manHours) || 0), 0), [allActivities]);
  const weightedProgresses = useMemo(
    () => allActivities.map(t => ({
      weight: totalManHours ? (Number(t.manHours) || 0) / totalManHours : 0,
      progress: Math.max(0, Math.min(100, Number(t.progress) || 0)),
    })),
    [allActivities, totalManHours]
  );
  const overallProgress = useMemo(() => weightedProgresses.reduce((sum, t) => sum + t.weight * t.progress, 0), [weightedProgresses]);

  // WBS Summary calculations
  const wbsSummaries = useMemo(() => wbsList.map(wbs => {
    const activities = wbs.activities;
    if (activities.length === 0) {
      return { totalManHours: 0, totalWeight: 0, earliestStart: null, latestFinish: null, progress: 0 };
    }
    const totalWbsManHours = activities.reduce((sum, act) => sum + (Number(act.manHours) || 0), 0);
    const totalWeight = totalManHours > 0 ? (totalWbsManHours / totalManHours) * 100 : 0;
    const validDates = activities.filter(act => act.startDate && act.finishDate && !isNaN(act.startDate.getTime()) && !isNaN(act.finishDate.getTime()));
    const earliestStart = validDates.length > 0 ? new Date(Math.min(...validDates.map(act => act.startDate.getTime()))) : null;
    const latestFinish = validDates.length > 0 ? new Date(Math.max(...validDates.map(act => act.finishDate.getTime()))) : null;
    const wbsProgress = totalWbsManHours > 0
      ? activities.reduce((sum, act) => sum + ((Number(act.manHours) || 0) / totalWbsManHours) * Math.max(0, Math.min(100, Number(act.progress) || 0)), 0)
      : 0;
    return { totalManHours: totalWbsManHours, totalWeight, earliestStart, latestFinish, progress: wbsProgress };
  }), [wbsList, totalManHours]);

  // Timeline data (min/max dates)
  const chartData = useMemo(() => {
    const validTasks = allActivities.filter(
      (task) => task.startDate && task.finishDate && !isNaN(task.startDate.getTime()) && !isNaN(task.finishDate.getTime())
    );
    if (validTasks.length === 0) {
      const today = new Date();
      return { startDate: startOfDay(addDays(today, -7)), endDate: endOfDay(addDays(today, 30)), timeUnits: [] };
    }
    const allDates = validTasks.flatMap((task) => [task.startDate, task.finishDate]);
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const startDate = startOfDay(addDays(minDate, -7));
    const endDate = endOfDay(addDays(maxDate, 7));
    const timeUnits = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      let label = "", nextDate;
      switch (viewMode) {
        case "day": label = format(currentDate, "MMM dd"); nextDate = addDays(currentDate, 1); break;
        case "week": label = format(currentDate, "MMM dd"); nextDate = addWeeks(currentDate, 1); break;
        case "month": label = format(currentDate, "MMM yyyy"); nextDate = addMonths(currentDate, 1); break;
        default: label = format(currentDate, "MMM dd"); nextDate = addWeeks(currentDate, 1); break;
      }
      timeUnits.push({ label, date: new Date(currentDate) });
      currentDate = nextDate;
    }
    return { startDate, endDate, timeUnits };
  }, [allActivities, viewMode]);

  // Helpers
  const addNewTask = (wbsId) => {
    setWbsList(prev =>
      prev.map(wbs =>
        wbs.wbsId === wbsId
          ? {
              ...wbs,
              activities: [
                ...wbs.activities,
                { id: Date.now().toString(), code: generateTaskCode(wbsId, wbs.activities), description: "", manHours: 0, startDate: new Date(), finishDate: addDays(new Date(), 7), progress: 0 },
              ],
            }
          : wbs
      )
    );
    setSelected({ wbsId, taskId: null });
  };

  const updateTask = (wbsId, id, field, value) => {
    setWbsList(prev =>
      prev.map(wbs =>
        wbs.wbsId === wbsId
          ? {
              ...wbs,
              activities: wbs.activities.map(task =>
                task.id === id
                  ? {
                      ...task,
                      [field]:
                        field === "startDate" || field === "finishDate"
                          ? value ? new Date(value) : null
                          : field === "progress"
                          ? Math.max(0, Math.min(100, Number(value) || 0))
                          : field === "manHours"
                          ? Math.max(0, Number(value) || 0)
                          : value,
                    }
                  : task
              ),
            }
          : wbs
      )
    );
  };

  // Task bar position
  const getTaskPosition = (task) => {
    if (!task.startDate || !task.finishDate || isNaN(task.startDate.getTime()) || isNaN(task.finishDate.getTime())) {
      return { left: "0px", width: "0px" };
    }
    const totalDays = differenceInDays(chartData.endDate, chartData.startDate);
    const taskStart = differenceInDays(task.startDate, chartData.startDate);
    const taskDuration = differenceInDays(task.finishDate, task.startDate) + 1;
    const columnWidth = 64;
    const totalWidth = chartData.timeUnits.length * columnWidth;
    const left = (taskStart / totalDays) * totalWidth;
    const width = (taskDuration / totalDays) * totalWidth;
    return { left: `${Math.max(0, left)}px`, width: `${Math.max(10, width)}px` };
  };
  const shouldShowBar = (task) =>
    task.description.trim() !== "" && task.startDate && task.finishDate && !isNaN(task.startDate.getTime()) && !isNaN(task.finishDate.getTime());

  // Fixed context menu logic
  const handleRowContextMenu = (e, wbsId, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Position the anchor element at the click position
    if (contextMenuAnchorRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      contextMenuAnchorRef.current.style.left = `${e.clientX - rect.left}px`;
      contextMenuAnchorRef.current.style.top = `${e.clientY - rect.top}px`;
    }
    
    setContextMenu({ 
      visible: true, 
      wbsId, 
      taskId, 
      x: e.clientX, 
      y: e.clientY 
    });
    setSelected({ wbsId, taskId });
  };

  const handleDelete = () => {
    setWbsList(prev =>
      prev.map(wbs =>
        wbs.wbsId === contextMenu.wbsId
          ? { ...wbs, activities: wbs.activities.filter(task => task.id !== contextMenu.taskId) }
          : wbs
      )
    );
    setContextMenu({ visible: false, wbsId: null, taskId: null, x: 0, y: 0 });
    setSelected({ wbsId: null, taskId: null });
  };

  // Close context menu when clicking elsewhere
  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, wbsId: null, taskId: null, x: 0, y: 0 });
  };

  // Header columns helpers
  const headerCols = headerColsDef(showManHours);
  const getLeftMap = () => {
    let map = {}, acc = 0;
    headerCols.forEach((col) => {
      map[col.key] = acc;
      acc += columnWidths[col.key] || 90;
    });
    return map;
  };
  const ganttMinWidth = chartData.timeUnits.length * 64;

  return (
    <div className="p-6 w-full min-h-screen" onClick={handleCloseContextMenu}>
      <Card className="mb-6 w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <span className="inline-block font-semibold text-lg text-green-700">
            Overall Progress: {overallProgress.toFixed(1)}%
          </span>
          <Button variant="outline" size="sm" className="ml-auto text-gray-700 flex items-center gap-1" onClick={() => toggleAll(allCollapsed)} title={allCollapsed ? "Expand All" : "Collapse All"}>
            <ChevronsDownUp className="w-4 h-4" />
            {allCollapsed ? "Expand All" : "Collapse All"}
          </Button>
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="ml-2" aria-label="Settings">
                <Settings2 className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => setShowManHours(v => !v)}>
                {showManHours ? "Hide Man-Hours Loading" : "Show Man-Hours Loading"}
              </Button>
              <div>
                <Label className="text-sm font-medium mb-1 block">View Mode</Label>
                <Select value={viewMode} onValueChange={setViewMode}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">By Day</SelectItem>
                    <SelectItem value="week">By Week</SelectItem>
                    <SelectItem value="month">By Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-auto" style={{ height: "70vh" }}>
            <div className="min-w-max relative">
              {/* Header */}
              <div className="bg-gray-100 border-b sticky top-0 z-20">
                <div className="flex">
                  {headerCols.map((col, idx, arr) => (
                    <div
                      key={col.key}
                      className="p-2 bg-gray-200 text-center sticky left-0 z-30 relative group"
                      style={{
                        width: `${columnWidths[col.key] || 90}px`,
                        left: `${arr
                          .slice(0, idx)
                          .reduce((acc, cur) => acc + (columnWidths[cur.key] || 90), 0)
                        }px`,
                        fontSize: "0.95rem",
                        borderRight: idx < arr.length - 1 ? "1px solid #e5e7eb" : "",
                      }}
                    >
                      {col.label}
                      {col.key !== "activityWeight" && (
                        <ColumnResizer onMouseDown={e => handleMouseDown(e, col.key)} />
                      )}
                    </div>
                  ))}
                  {/* Timeline header */}
                  <div
                    className="bg-gray-200 border-b border-gray-300"
                    style={{
                      minWidth: ganttMinWidth,
                      borderRadius: "0 8px 0 0"
                    }}
                  >
                    <div className="flex h-10">
                      {chartData.timeUnits.map((unit, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-center text-xs font-medium px-1 flex-shrink-0"
                          style={{ width: "64px" }}
                        >
                          {unit.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* WBS Sections */}
              {wbsList.map((wbs, wbsIndex) => {
                const leftMap = getLeftMap();
                const isCollapsed = collapsed[wbs.wbsId];
                const summary = wbsSummaries[wbsIndex];
                return (
                  <React.Fragment key={wbs.wbsId}>
                    {/* WBS Row */}
                    <div
                      className="flex items-center sticky left-0 z-15"
                      style={{
                        background: `linear-gradient(90deg, ${wbs.color}, #4d9dff 80%)`,
                        minHeight: 50,
                        marginTop: 5,
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        fontSize: "1rem",
                      }}
                    >
                      <button
                        onClick={() =>
                          setCollapsed(prev => ({ ...prev, [wbs.wbsId]: !prev[wbs.wbsId] }))
                        }
                        className="focus:outline-none ml-2 mr-2"
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          height: 28,
                          width: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        aria-label={isCollapsed ? "Expand" : "Collapse"}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="text-white w-5 h-5" />
                        ) : (
                          <ChevronDown className="text-white w-5 h-5" />
                        )}
                      </button>
                      {/* WBS Name */}
                      <div className="text-left text-white font-bold flex items-center"
                        style={{
                          width: `${columnWidths.code + columnWidths.description - 60}px`,
                          fontSize: "1.05rem",
                          paddingLeft: "8px"
                        }}>
                        {wbs.wbsName}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-4 text-white border border-white/40 font-medium rounded px-2 py-1 hover:bg-white/20"
                          style={{
                            fontSize: "0.93rem",
                            height: 28,
                            minWidth: 0,
                            boxShadow: "0 1px 4px 0 rgba(30,100,255,0.04)",
                          }}
                          onClick={() => addNewTask(wbs.wbsId)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Activity
                        </Button>
                      </div>
                      {showManHours && (
                        <>
                          <div className="text-center text-white text-xs" style={{ width: `${columnWidths.manHours}px` }}>
                            {summary.totalManHours}
                          </div>
                          <div className="text-center text-white text-xs" style={{ width: `${columnWidths.activityWeight}px` }}>
                            {summary.totalWeight.toFixed(1)}%
                          </div>
                        </>
                      )}
                      <div className="text-center text-white text-xs" style={{ width: `${columnWidths.startDate}px` }}>
                        {summary.earliestStart ? format(summary.earliestStart, "MMM dd") : "-"}
                      </div>
                      <div className="text-center text-white text-xs" style={{ width: `${columnWidths.finishDate}px` }}>
                        {summary.latestFinish ? format(summary.latestFinish, "MMM dd") : "-"}
                      </div>
                      <div className="text-center text-white text-xs" style={{ width: `${columnWidths.progress}px` }}>
                        {summary.progress.toFixed(1)}%
                      </div>
                      <div className="flex-1" />
                    </div>
                    {/* Activity Rows */}
                    {!isCollapsed && (
                      wbs.activities.length === 0 ? (
                        <div className="flex text-gray-400 text-xs px-4 py-2 relative">
                          No activities yet.
                          <div className="absolute bottom-0 left-0 h-px bg-blue-400" style={{ width: "100%" }} />
                        </div>
                      ) : (
                        wbs.activities.map((task, taskIndex, taskArray) => {
                          const weight = totalManHours > 0
                            ? ((Number(task.manHours) || 0) / totalManHours)
                            : 0;
                          return (
                            <div
                              key={task.id}
                              className={`relative cursor-pointer hover:bg-gray-50 select-none ${
                                selected.wbsId === wbs.wbsId && selected.taskId === task.id ? "bg-blue-100" : ""
                              }`}
                              style={{ minHeight: 38, zIndex: 5, width: "100%" }}
                              onContextMenu={e => handleRowContextMenu(e, wbs.wbsId, task.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected({ wbsId: wbs.wbsId, taskId: task.id });
                              }}
                            >
                              <div className="flex">
                                {/* Code */}
                                <div
                                  className="p-2 flex items-center justify-center bg-white sticky left-0 z-15"
                                  style={{ width: `${columnWidths.code}px`, minHeight: 38, fontSize: "0.92rem" }}
                                >
                                  <span className="text-xs font-mono text-gray-600">{task.code}</span>
                                </div>
                                {/* Description */}
                                <div
                                  className="p-2 bg-white sticky z-15"
                                  style={{ width: `${columnWidths.description}px`, left: `${leftMap.description}px`, minHeight: 38 }}
                                >
                                  <Input
                                    value={task.description}
                                    onChange={e => updateTask(wbs.wbsId, task.id, "description", e.target.value)}
                                    placeholder="Enter activity description..."
                                    className="border-0 shadow-none focus:ring-1 focus:ring-blue-300 h-8 text-xs"
                                  />
                                </div>
                                {/* Man Hours and Weight (if shown) */}
                                {showManHours && (
                                  <>
                                    <div className="p-2 bg-white sticky z-15 flex items-center justify-center"
                                      style={{ width: `${columnWidths.manHours}px`, left: `${leftMap.manHours}px`, minHeight: 38 }}>
                                      <NumericInput
                                        value={task.manHours ?? 0}
                                        min={0}
                                        onChange={e => updateTask(wbs.wbsId, task.id, "manHours", e.target.value)}
                                      />
                                    </div>
                                    <div className="p-2 bg-white sticky z-15 flex items-center justify-center"
                                      style={{ width: `${columnWidths.activityWeight}px`, left: `${leftMap.activityWeight}px`, minHeight: 38 }}>
                                      <span className="text-xs font-mono text-green-700">{(weight * 100).toFixed(1)}%</span>
                                    </div>
                                  </>
                                )}
                                {/* Start Date */}
                                <div className="p-2 bg-white sticky z-15 flex items-center justify-center"
                                  style={{ width: `${columnWidths.startDate}px`, left: `${leftMap.startDate}px`, minHeight: 38 }}>
                                  <div className="w-full">
                                    <DatePicker
                                      value={task.startDate}
                                      onChange={date => date && updateTask(wbs.wbsId, task.id, "startDate", date)}
                                      className="border-0 shadow-none focus:border focus:border-blue-300"
                                    />
                                  </div>
                                </div>
                                {/* Finish Date */}
                                <div className="p-2 bg-white sticky z-15 flex items-center justify-center"
                                  style={{ width: `${columnWidths.finishDate}px`, left: `${leftMap.finishDate}px`, minHeight: 38 }}>
                                  <div className="w-full">
                                    <DatePicker
                                      value={task.finishDate}
                                      onChange={date => date && updateTask(wbs.wbsId, task.id, "finishDate", date)}
                                      className="border-0 shadow-none focus:border focus:border-blue-300"
                                    />
                                  </div>
                                </div>
                                {/* Progress */}
                                <div className="p-2 bg-white sticky z-15 flex items-center justify-center"
                                  style={{ width: `${columnWidths.progress}px`, left: `${leftMap.progress}px`, minHeight: 38 }}>
                                  <NumericInput
                                    value={task.progress ?? 0}
                                    min={0}
                                    max={100}
                                    onChange={e => updateTask(wbs.wbsId, task.id, "progress", e.target.value)}
                                  />
                                </div>
                                {/* Gantt Timeline */}
                                <div
                                  className="relative p-2 flex items-center"
                                  style={{ minWidth: ganttMinWidth, minHeight: 38, background: "white" }}
                                >
                                  <div className="relative w-full h-8">
                                    {shouldShowBar(task) && (
                                      <div
                                        className="absolute top-1 left-0 h-6 w-full bg-gray-200 rounded-none"
                                        style={getTaskPosition(task)}
                                      >
                                        <div
                                          className="h-6 bg-green-500 rounded-none shadow-sm transition-all duration-300"
                                          style={{
                                            width: `${Math.max(0, Math.min(100, Number(task.progress) || 0))}%`,
                                            minWidth: "0px",
                                            maxWidth: "100%",
                                            opacity: task.progress > 0 ? 1 : 0.15,
                                            borderRadius: 0,
                                          }}
                                          title={`${task.code}: ${task.description} (${format(task.startDate, "MMM dd")} - ${format(task.finishDate, "MMM dd")})`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Blue horizontal line */}
                              <div className="absolute bottom-0 left-0 h-px bg-blue-400" style={{ width: "100%", zIndex: 1 }} />
                            </div>
                          );
                        })
                      )
                    )}
                  </React.Fragment>
                );
              })}
              {allActivities.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No activities added yet. Click "Add Activity" on any WBS to get started.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Context Menu - Fixed positioning */}
      <ContextMenuPopover
        open={contextMenu.visible}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseContextMenu();
          }
        }}
        onDelete={handleDelete}
        anchorRef={contextMenuAnchorRef}
      />
    </div>
  );
};

export default GanttChart;