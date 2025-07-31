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

// Simple Popover for Settings
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

// Initial hierarchical WBS+activities data
const initialWBS = [
  {
    wbsId: "wbs1",
    wbsName: "Engineering",
    activities: [
      {
        id: "1",
        code: "ENG-001",
        description: "Basic Design",
        manHours: 30,
        startDate: new Date(2025, 5, 20),
        finishDate: new Date(2025, 5, 30),
        progress: 60,
      },
      {
        id: "2",
        code: "ENG-002",
        description: "Detail Design",
        manHours: 25,
        startDate: new Date(2025, 5, 25),
        finishDate: new Date(2025, 6, 10),
        progress: 40,
      },
    ],
  },
  {
    wbsId: "wbs2",
    wbsName: "Procurement",
    activities: [
      {
        id: "3",
        code: "PRC-001",
        description: "Vendor Selection",
        manHours: 20,
        startDate: new Date(2025, 6, 1),
        finishDate: new Date(2025, 6, 10),
        progress: 70,
      },
      {
        id: "4",
        code: "PRC-002",
        description: "Purchase Order",
        manHours: 15,
        startDate: new Date(2025, 6, 11),
        finishDate: new Date(2025, 6, 20),
        progress: 25,
      },
    ],
  },
  {
    wbsId: "wbs3",
    wbsName: "Construction",
    activities: [
      {
        id: "5",
        code: "CON-001",
        description: "Site Mobilization",
        manHours: 50,
        startDate: new Date(2025, 6, 15),
        finishDate: new Date(2025, 6, 25),
        progress: 10,
      },
      {
        id: "6",
        code: "CON-002",
        description: "Civil Works",
        manHours: 40,
        startDate: new Date(2025, 6, 18),
        finishDate: new Date(2025, 7, 1),
        progress: 5,
      },
    ],
  },
];

const generateTaskCode = (wbsId, activities) =>
  `${wbsId.split("-")[0].toUpperCase()}-${String(activities.length + 1).padStart(3, "0")}`;

const GanttChart = () => {
  const [wbsList, setWbsList] = useState(initialWBS);
  const [showManHours, setShowManHours] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState({ wbsId: null, taskId: null });
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, wbsId: null, taskId: null });
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

  // For all activities flat
  const allActivities = useMemo(
    () => wbsList.flatMap((wbs) =>
      wbs.activities.map((act) => ({ ...act, wbsId: wbs.wbsId }))
    ),
    [wbsList]
  );

  // Weighted progress and man hours
  const totalManHours = useMemo(
    () => allActivities.reduce((sum, t) => sum + (Number(t.manHours) || 0), 0),
    [allActivities]
  );
  const weightedProgresses = useMemo(
    () =>
      allActivities.map((t) => ({
        weight: totalManHours ? (Number(t.manHours) || 0) / totalManHours : 0,
        progress: Math.max(0, Math.min(100, Number(t.progress) || 0)),
      })),
    [allActivities, totalManHours]
  );
  const overallProgress = useMemo(
    () => weightedProgresses.reduce((sum, t) => sum + t.weight * t.progress, 0),
    [weightedProgresses]
  );

  // Timeline data (min/max dates)
  const chartData = useMemo(() => {
    const validTasks = allActivities.filter(
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
    const allDates = validTasks.flatMap((task) => [
      task.startDate,
      task.finishDate,
    ]);
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const startDate = startOfDay(addDays(minDate, -7));
    const endDate = endOfDay(addDays(maxDate, 7));

    const timeUnits = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      let label = "",
        nextDate;
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
  }, [allActivities, viewMode]);

  const addNewTask = (wbsId) => {
    setWbsList((prev) =>
      prev.map((wbs) =>
        wbs.wbsId === wbsId
          ? {
              ...wbs,
              activities: [
                ...wbs.activities,
                {
                  id: Date.now().toString(),
                  code: generateTaskCode(wbsId, wbs.activities),
                  description: "",
                  manHours: 0,
                  startDate: new Date(),
                  finishDate: addDays(new Date(), 7),
                  progress: 0,
                },
              ],
            }
          : wbs
      )
    );
    setSelected({ wbsId, taskId: null });
  };

  const updateTask = (wbsId, id, field, value) => {
    setWbsList((prev) =>
      prev.map((wbs) =>
        wbs.wbsId === wbsId
          ? {
              ...wbs,
              activities: wbs.activities.map((task) =>
                task.id === id
                  ? {
                      ...task,
                      [field]:
                        field === "startDate" || field === "finishDate"
                          ? value
                            ? new Date(value)
                            : null
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
    return {
      left: `${Math.max(0, left)}px`,
      width: `${Math.max(10, width)}px`,
    };
  };

  const shouldShowBar = (task) =>
    task.description.trim() !== "" &&
    task.startDate &&
    task.finishDate &&
    !isNaN(task.startDate.getTime()) &&
    !isNaN(task.finishDate.getTime());

  // Context menu logic
  const handleRowContextMenu = (e, wbsId, taskId) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      wbsId,
      taskId,
    });
    setSelected({ wbsId, taskId });
  };

  const handleDelete = () => {
    setWbsList((prev) =>
      prev.map((wbs) =>
        wbs.wbsId === contextMenu.wbsId
          ? {
              ...wbs,
              activities: wbs.activities.filter(
                (task) => task.id !== contextMenu.taskId
              ),
            }
          : wbs
      )
    );
    setContextMenu({ ...contextMenu, visible: false });
    setSelected({ wbsId: null, taskId: null });
  };

  const ganttMinWidth = chartData.timeUnits.length * 64;

  // Header columns (use same logic as before)
  const headerCols = [
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

  // For left positions
  const getLeftMap = () => {
    let map = {};
    let acc = 0;
    headerCols.forEach((col) => {
      map[col.key] = acc;
      acc += columnWidths[col.key] || 90;
    });
    return map;
  };

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
                {showManHours
                  ? "Hide Man-Hours Loading"
                  : "Show Man-Hours Loading"}
              </Button>
              <div>
                <Label className="text-sm font-medium mb-1 block">
                  View Mode
                </Label>
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
        </CardHeader>
        <CardContent>
          {/* Gantt Chart */}
          <div className="border rounded-lg overflow-auto max-h-96">
            <div className="min-w-max">
              {/* Header */}
              <div className="bg-gray-100 border-b sticky top-0 z-10">
                <div className="flex">
                  {headerCols.map((col, idx, arr) => (
                    <div
                      key={col.key}
                      className={`p-3 bg-gray-200 text-center sticky left-0 z-20 relative group`}
                      style={{
                        width: `${columnWidths[col.key] || 90}px`,
                        left: `${arr
                          .slice(0, idx)
                          .reduce(
                            (acc, cur) => acc + (columnWidths[cur.key] || 90),
                            0
                          )}px`,
                      }}
                    >
                      <div className="font-medium text-xs">{col.label}</div>
                      {col.key !== "activityWeight" && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300"
                          onMouseDown={(e) => setIsResizing(col.key) || setStartX(e.clientX) || setStartWidth(columnWidths[col.key]) || e.preventDefault()}
                        />
                      )}
                    </div>
                  ))}
                  <div
                    className="bg-gray-200"
                    style={{ minWidth: ganttMinWidth }}
                  >
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

              {/* WBS Sections */}
              {wbsList.map((wbs) => {
                const leftMap = getLeftMap();
                return (
                  <React.Fragment key={wbs.wbsId}>
                    {/* WBS Row */}
                    <div className="flex items-center bg-blue-50 font-semibold border-b border-blue-200">
                      <div
                        className="p-2 text-blue-900"
                        style={{
                          width: `${Object.values(columnWidths)
                            .reduce((a, b) => a + b, 0)}px`,
                          textAlign: "left",
                        }}
                      >
                        {wbs.wbsName}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2 text-xs px-2 py-1"
                          onClick={() => addNewTask(wbs.wbsId)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Activity
                        </Button>
                      </div>
                    </div>
                    {/* Activity Rows */}
                                   {wbs.activities.length === 0 ? (
                      <div className="flex text-gray-400 text-xs px-4 py-2">No activities yet.</div>
                    ) : (
                      wbs.activities.map((task) => {
                        const weight =
                          totalManHours > 0
                            ? ((Number(task.manHours) || 0) / totalManHours)
                            : 0;
                        return (
                          <div
                            key={task.id}
                            className={`flex cursor-pointer hover:bg-gray-50 select-none ${
                              selected.wbsId === wbs.wbsId && selected.taskId === task.id
                                ? "bg-blue-100"
                                : ""
                            }`}
                            style={{ minHeight: 44 }}
                            onContextMenu={(e) => handleRowContextMenu(e, wbs.wbsId, task.id)}
                            onClick={() => setSelected({ wbsId: wbs.wbsId, taskId: task.id })}
                          >
                            {/* Code */}
                            <div
                              className="p-2 flex items-center justify-center bg-white sticky left-0 z-10"
                              style={{
                                width: `${columnWidths.code}px`,
                                minHeight: 44,
                              }}
                            >
                              <span className="text-xs font-mono text-gray-600">
                                {task.code}
                              </span>
                            </div>
                            {/* Description */}
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
                                  updateTask(wbs.wbsId, task.id, "description", e.target.value)
                                }
                                placeholder="Enter activity description..."
                                className="border-0 shadow-none focus:ring-1 focus:ring-blue-300 h-8 text-xs"
                              />
                            </div>
                            {/* Man Hours and Weight (if shown) */}
                            {showManHours && (
                              <>
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
                                      updateTask(wbs.wbsId, task.id, "manHours", e.target.value)
                                    }
                                  />
                                </div>
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
                                  date &&
                                  updateTask(wbs.wbsId, task.id, "startDate", date)
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
                                  date &&
                                  updateTask(wbs.wbsId, task.id, "finishDate", date)
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
                                  updateTask(wbs.wbsId, task.id, "progress", e.target.value)
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
                      })
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
    </div>
  );
};

export default GanttChart;

