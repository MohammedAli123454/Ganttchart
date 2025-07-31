"use client";
import React, { useState, useMemo, useRef } from "react";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "../components/date-picker";
import { NumericInput } from "../components/NumericInput";

// You can use shadcn/ui popover, or below simple popover logic:
function Popover({ open, onClose, children, trigger }) {
  const ref = useRef();
  React.useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);
  return (
    <div className="relative">
      {trigger}
      {open && (
        <div
          ref={ref}
          className="absolute right-0 mt-2 bg-white rounded shadow-lg border border-gray-200 z-30 min-w-[230px] p-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}

import {
  addDays,
  addWeeks,
  addMonths,
  differenceInDays,
  format,
  startOfDay,
  endOfDay,
} from "../lib/dateUtils";

const generateTaskCode = (index) => `TASK-${String(index).padStart(3, "0")}`;

const GanttChart = () => {
  const [tasks, setTasks] = useState([
    {
      id: "1",
      code: "TASK-001",
      description: "Project Planning",
      manHours: 25,
      startDate: new Date(2025, 5, 24),
      finishDate: new Date(2025, 6, 10),
      progress: 60,
    },
    {
      id: "2",
      code: "TASK-002",
      description: "Design Phase",
      manHours: 25,
      startDate: new Date(2025, 6, 8),
      finishDate: new Date(2025, 6, 20),
      progress: 100,
    },
    {
      id: "3",
      code: "TASK-003",
      description: "Development",
      manHours: 25,
      startDate: new Date(2025, 6, 15),
      finishDate: new Date(2025, 7, 5),
      progress: 90,
    },
    {
      id: "4",
      code: "TASK-004",
      description: "Testing",
      manHours: 25,
      startDate: new Date(2025, 7, 6),
      finishDate: new Date(2025, 7, 20),
      progress: 0,
    },
  ]);
  const [showManHours, setShowManHours] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, taskId: null });
  const contextMenuRef = useRef(null);

  const [columnWidths, setColumnWidths] = useState({
    code: 80,
    description: 180,
    manHours: 90,
    activityWeight: 110,
    startDate: 120,
    finishDate: 120,
    progress: 90,
  });
  const [isResizing, setIsResizing] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

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
    setColumnWidths((prev) => ({
      ...prev,
      [isResizing]: newWidth,
    }));
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
  }, [isResizing, startX, startWidth]);

  React.useEffect(() => {
    const handleClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu((cm) => ({ ...cm, visible: false }));
      }
    };
    if (contextMenu.visible) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu.visible]);

  // Weight calculation
  const totalManHours = useMemo(() => tasks.reduce((sum, t) => sum + (Number(t.manHours) || 0), 0), [tasks]);
  const weightedProgresses = useMemo(() => tasks.map(
    t => ({
      weight: totalManHours ? ((Number(t.manHours) || 0) / totalManHours) : 0,
      progress: Math.max(0, Math.min(100, Number(t.progress) || 0))
    })
  ), [tasks, totalManHours]);
  const overallProgress = useMemo(() =>
    weightedProgresses.reduce((sum, t) => sum + t.weight * t.progress, 0)
    , [weightedProgresses]);

  const chartData = useMemo(() => {
    const validTasks = tasks.filter(
      (task) =>
        task.startDate &&
        task.finishDate &&
        !isNaN(task.startDate.getTime()) &&
        !isNaN(task.finishDate.getTime())
    );
    if (validTasks.length === 0) {
      const today = new Date();
      return {
        startDate: startOfDay(addDays(today, -7)),
        endDate: endOfDay(addDays(today, 30)),
        timeUnits: [],
      };
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
        case "day":
          label = format(currentDate, "MMM dd");
          nextDate = addDays(currentDate, 1);
          break;
        case "week":
          label = format(currentDate, "MMM dd");
          nextDate = addWeeks(currentDate, 1);
          break;
        case "month":
          label = format(currentDate, "MMM yyyy");
          nextDate = addMonths(currentDate, 1);
          break;
        default:
          label = format(currentDate, "MMM dd");
          nextDate = addWeeks(currentDate, 1);
          break;
      }
      timeUnits.push({ label, date: new Date(currentDate) });
      currentDate = nextDate;
    }
    return { startDate, endDate, timeUnits };
  }, [tasks, viewMode]);

  const addNewTask = () => {
    const newTask = {
      id: Date.now().toString(),
      code: generateTaskCode(tasks.length + 1),
      description: "",
      manHours: 0,
      startDate: new Date(),
      finishDate: addDays(new Date(), 7),
      progress: 0,
    };
    setTasks([...tasks, newTask]);
    setSelectedTaskId(newTask.id);
  };

  const updateTask = (id, field, value) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          let updatedValue = value;
          if (field === "startDate" || field === "finishDate") {
            updatedValue = value ? new Date(value) : null;
          }
          if (field === "progress") {
            updatedValue = Math.max(0, Math.min(100, Number(value) || 0));
          }
          if (field === "manHours") {
            updatedValue = Math.max(0, Number(value) || 0);
          }
          return { ...task, [field]: updatedValue };
        }
        return task;
      })
    );
  };

  const getTaskPosition = (task) => {
    if (
      !task.startDate ||
      !task.finishDate ||
      isNaN(task.startDate.getTime()) ||
      isNaN(task.finishDate.getTime())
    ) {
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
    task.description.trim() !== "" &&
    task.startDate &&
    task.finishDate &&
    !isNaN(task.startDate.getTime()) &&
    !isNaN(task.finishDate.getTime());

  const handleRowContextMenu = (e, taskId) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      taskId,
    });
    setSelectedTaskId(taskId);
  };

  const handleDelete = () => {
    setTasks(tasks.filter((t) => t.id !== contextMenu.taskId));
    setContextMenu({ ...contextMenu, visible: false });
    if (selectedTaskId === contextMenu.taskId) setSelectedTaskId(null);
  };

  const ganttMinWidth = chartData.timeUnits.length * 64;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 100,
            background: "white",
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            borderRadius: 6,
            minWidth: 140,
          }}
        >
          <button
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50"
            onClick={handleDelete}
          >
            Delete Activity
          </button>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="mt-2">
            <span className="inline-block font-semibold text-base text-green-700">
              Overall Progress: {overallProgress.toFixed(1)}%
            </span>
          </div>
          {/* Settings Button */}
          <Popover
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            trigger={
              <Button
                variant="ghost"
                className="ml-auto"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-label="Settings"
              >
                <Settings2 className="w-5 h-5" />
              </Button>
            }
          >
            {/* Settings content */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowManHours((v) => !v)}
              >
                {showManHours ? "Hide Man-Hours Loading" : "Show Man-Hours Loading"}
              </Button>
              <div>
                <Label className="text-sm font-medium mb-1 block">View Mode</Label>
                <Select value={viewMode} onValueChange={setViewMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">By Day</SelectItem>
                    <SelectItem value="week">By Week</SelectItem>
                    <SelectItem value="month">By Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Popover>
          <Button className="ml-4" onClick={addNewTask}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Task
          </Button>
        </CardHeader>
        <CardContent>
          {/* Gantt Chart */}
          <div className="border rounded-lg overflow-auto max-h-96">
            <div className="min-w-max">
              {/* Header */}
              <div className="bg-gray-100 border-b sticky top-0 z-10">
                <div className="flex">
                  {[
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
                    { key: "progress", label: "Progress (%)" }
                  ].map((col, idx, arr) => (
                    <div
                      key={col.key}
                      className={`p-3 bg-gray-200 text-center sticky left-0 z-20 relative group`}
                      style={{
                        width: `${columnWidths[col.key] || 90}px`,
                        left: `${arr
                          .slice(0, idx)
                          .reduce((acc, cur) => acc + (columnWidths[cur.key] || 90), 0)}px`,
                      }}
                    >
                      <div className="font-medium text-xs">{col.label}</div>
                      {/* Allow resizing except for weight (which is always calc) */}
                      {col.key !== "activityWeight" && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300"
                          onMouseDown={(e) => handleMouseDown(e, col.key)}
                        />
                      )}
                    </div>
                  ))}
                  <div className="bg-gray-200" style={{ minWidth: ganttMinWidth }}>
                    <div className="flex h-12">
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
              {/* Task Rows */}
              <div className="divide-y divide-gray-200">
                {tasks.map((task, taskIdx) => {
                  const weight = totalManHours ? (Number(task.manHours) || 0) / totalManHours : 0;
                  // Calculate left offsets depending on visible columns
                  let leftMap = {
                    code: 0,
                    description: columnWidths.code,
                    manHours: columnWidths.code + columnWidths.description,
                    activityWeight:
                      columnWidths.code + columnWidths.description + columnWidths.manHours,
                    startDate: showManHours
                      ? columnWidths.code +
                        columnWidths.description +
                        columnWidths.manHours +
                        columnWidths.activityWeight
                      : columnWidths.code + columnWidths.description,
                    finishDate: showManHours
                      ? columnWidths.code +
                        columnWidths.description +
                        columnWidths.manHours +
                        columnWidths.activityWeight +
                        columnWidths.startDate
                      : columnWidths.code + columnWidths.description + columnWidths.startDate,
                    progress: showManHours
                      ? columnWidths.code +
                        columnWidths.description +
                        columnWidths.manHours +
                        columnWidths.activityWeight +
                        columnWidths.startDate +
                        columnWidths.finishDate
                      : columnWidths.code +
                        columnWidths.description +
                        columnWidths.startDate +
                        columnWidths.finishDate,
                  };

                  return (
                    <div
                      key={task.id}
                      className={`flex cursor-pointer hover:bg-gray-50 select-none ${
                        selectedTaskId === task.id ? "bg-blue-50" : ""
                      }`}
                      style={{ minHeight: 44 }}
                      onContextMenu={(e) => handleRowContextMenu(e, task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      {/* Task Code */}
                      <div
                        className="p-2 flex items-center justify-center bg-white sticky left-0 z-10"
                        style={{ width: `${columnWidths.code}px`, minHeight: 44 }}
                      >
                        <span className="text-xs font-mono text-gray-600">
                          {task.code}
                        </span>
                      </div>
                      {/* Activity Description */}
                      <div
                        className="p-2 bg-white sticky z-10"
                        style={{
                          width: `${columnWidths.description}px`,
                          left: `${leftMap.description}px`,
                          minHeight: 44,
                        }}
                      >
                        <Input
                          value={task.description}
                          onChange={(e) =>
                            updateTask(task.id, "description", e.target.value)
                          }
                          placeholder="Enter activity description..."
                          className="border-0 shadow-none focus:ring-1 focus:ring-blue-300 h-8 text-xs"
                        />
                      </div>
                      {showManHours && (
                        <>
                          {/* Man Hours */}
                          <div
                            className="p-2 bg-white sticky z-10 flex items-center justify-center"
                            style={{
                              width: `${columnWidths.manHours}px`,
                              left: `${leftMap.manHours}px`,
                              minHeight: 44,
                            }}
                          >
                            <NumericInput
                              value={task.manHours ?? 0}
                              min={0}
                              onChange={(e) =>
                                updateTask(task.id, "manHours", e.target.value)
                              }
                            />
                          </div>
                          {/* Activity Weight */}
                          <div
                            className="p-2 bg-white sticky z-10 flex items-center justify-center"
                            style={{
                              width: `${columnWidths.activityWeight}px`,
                              left: `${leftMap.activityWeight}px`,
                              minHeight: 44,
                            }}
                          >
                            <span className="text-xs font-mono text-green-700">
                              {(weight * 100).toFixed(1)}%
                            </span>
                          </div>
                        </>
                      )}
                      {/* Start Date */}
                      <div
                        className="p-2 bg-white sticky z-10 flex items-center justify-center"
                        style={{
                          width: `${columnWidths.startDate}px`,
                          left: `${leftMap.startDate}px`,
                          minHeight: 44,
                        }}
                      >
                        <DatePicker
                          value={task.startDate}
                          onChange={(date) =>
                            date && updateTask(task.id, "startDate", date)
                          }
                        />
                      </div>
                      {/* Finish Date */}
                      <div
                        className="p-2 bg-white sticky z-10 flex items-center justify-center"
                        style={{
                          width: `${columnWidths.finishDate}px`,
                          left: `${leftMap.finishDate}px`,
                          minHeight: 44,
                        }}
                      >
                        <DatePicker
                          value={task.finishDate}
                          onChange={(date) =>
                            date && updateTask(task.id, "finishDate", date)
                          }
                        />
                      </div>
                      {/* Progress */}
                      <div
                        className="p-2 bg-white sticky z-10 flex items-center justify-center"
                        style={{
                          width: `${columnWidths.progress}px`,
                          left: `${leftMap.progress}px`,
                          minHeight: 44,
                        }}
                      >
                        <NumericInput
                          value={task.progress ?? 0}
                          min={0}
                          max={100}
                          onChange={(e) =>
                            updateTask(task.id, "progress", e.target.value)
                          }
                        />
                      </div>
                      {/* Gantt Timeline */}
                      <div
                        className="relative p-2 flex items-center"
                        style={{
                          minWidth: ganttMinWidth,
                          minHeight: 44,
                          background: "white",
                        }}
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
                                  width: `${Math.max(
                                    0,
                                    Math.min(100, Number(task.progress) || 0)
                                  )}%`,
                                  minWidth: "0px",
                                  maxWidth: "100%",
                                  opacity: task.progress > 0 ? 1 : 0.15,
                                  borderRadius: 0,
                                }}
                                title={`${task.code}: ${task.description} (${format(
                                  task.startDate,
                                  "MMM dd"
                                )} - ${format(task.finishDate, "MMM dd")})`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {tasks.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No tasks added yet. Click "Add New Task" to get started.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GanttChart;
