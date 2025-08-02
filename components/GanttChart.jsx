"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Settings2, ChevronDown, ChevronRight, ChevronsDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

// Mock components (replace with actual imports)
const DatePicker = ({ value, onChange, className }) => (
  <input
    type="date"
    value={value ? value.toISOString().split('T')[0] : ''}
    onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    className={`w-full px-2 py-1 text-xs rounded ${className}`}
  />
);

const NumericInput = ({ value, onChange, min = 0, max = Infinity }) => (
  <input
    type="number"
    value={value || ''}
    onChange={onChange}
    min={min}
    max={max}
    className="w-full px-1 py-1 text-xs text-center border-0 focus:ring-1 focus:ring-blue-300"
  />
);

// Date utilities
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const addWeeks = (date, weeks) => addDays(date, weeks * 7);
const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};
const differenceInDays = (date1, date2) => Math.floor((date1.getTime() - date2.getTime()) / (24 * 60 * 60 * 1000));
const format = (date, formatStr) => {
  const month = date.toLocaleDateString('en', { month: 'short' });
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  
  if (formatStr === "MMM dd") return `${month} ${day}`;
  if (formatStr === "MMM yyyy") return `${month} ${year}`;
  return `${month} ${day}`;
};
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

// Initial data with Project structure
const initialProject = {
  projectName: "Sample Construction Project",
  wbs: [
    {
      wbsId: "wbs1", wbsName: "Engineering", color: "#388bff",
      activities: [
        { id: "1", code: "ENG-001", description: "Basic Design", manHours: 30, 
          startDate: new Date(2025, 5, 20), finishDate: new Date(2025, 5, 30), progress: 60 },
        { id: "2", code: "ENG-002", description: "Detail Design", manHours: 25, 
          startDate: new Date(2025, 5, 25), finishDate: new Date(2025, 6, 10), progress: 40 },
      ],
    },
    {
      wbsId: "wbs2", wbsName: "Procurement", color: "#1e90ff",
      activities: [
        { id: "3", code: "PRC-001", description: "Vendor Selection", manHours: 20, 
          startDate: new Date(2025, 6, 1), finishDate: new Date(2025, 6, 10), progress: 70 },
        { id: "4", code: "PRC-002", description: "Purchase Order", manHours: 15, 
          startDate: new Date(2025, 6, 11), finishDate: new Date(2025, 6, 20), progress: 25 },
      ],
    },
    {
      wbsId: "wbs3", wbsName: "Construction", color: "#2778f0",
      activities: [
        { id: "5", code: "CON-001", description: "Site Mobilization", manHours: 50, 
          startDate: new Date(2025, 6, 15), finishDate: new Date(2025, 6, 25), progress: 10 },
        { id: "6", code: "CON-002", description: "Civil Works", manHours: 40, 
          startDate: new Date(2025, 6, 18), finishDate: new Date(2025, 7, 1), progress: 5 },
      ],
    },
  ]
};

// Context menu component
const ContextMenuPopover = ({ open, onOpenChange, onDelete, anchorRef }) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      <div ref={anchorRef} className="absolute invisible" style={{ pointerEvents: 'none' }} />
    </PopoverTrigger>
    <PopoverContent className="p-0 w-[160px]" side="bottom" align="start">
      <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50" onClick={onDelete}>
        Delete Activity
      </Button>
    </PopoverContent>
  </Popover>
);

// Column resizer
const ColumnResizer = ({ onMouseDown }) => (
  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-40" onMouseDown={onMouseDown} />
);

const GanttChart = () => {
  const [projectData, setProjectData] = useState(initialProject);
  const wbsList = projectData.wbs;
  const [showManHours, setShowManHours] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState({ wbsId: null, taskId: null });
  const [contextMenu, setContextMenu] = useState({ visible: false, wbsId: null, taskId: null });
  const [collapsed, setCollapsed] = useState({});
  const [columnWidths, setColumnWidths] = useState({
    code: 80, description: 280, projectName: 200, manHours: 90, activityWeight: 110, 
    startDate: 120, finishDate: 120, progress: 90,
  });
  const [isResizing, setIsResizing] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  
  const contextMenuAnchorRef = useRef(null);

  // Column resize handlers
  const handleMouseDown = (e, column) => {
    setIsResizing(column);
    setStartX(e.clientX);
    setStartWidth(columnWidths[column]);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const newWidth = Math.max(50, startWidth + (e.clientX - startX));
    setColumnWidths(prev => ({ ...prev, [isResizing]: newWidth }));
  };

  const handleMouseUp = () => setIsResizing(null);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [isResizing, startX, startWidth]);

  // Calculations
  const allActivities = useMemo(() => 
    wbsList.flatMap(wbs => wbs.activities.map(act => ({ ...act, wbsId: wbs.wbsId }))), [wbsList]);
  
  const totalManHours = useMemo(() => 
    allActivities.reduce((sum, t) => sum + (Number(t.manHours) || 0), 0), [allActivities]);
  
  const overallProgress = useMemo(() => {
    if (totalManHours === 0) return 0;
    return allActivities.reduce((sum, t) => {
      const weight = (Number(t.manHours) || 0) / totalManHours;
      const progress = Math.max(0, Math.min(100, Number(t.progress) || 0));
      return sum + weight * progress;
    }, 0);
  }, [allActivities, totalManHours]);

  // Timeline calculation
  const chartData = useMemo(() => {
    const validTasks = allActivities.filter(task => task.startDate && task.finishDate);
    if (validTasks.length === 0) {
      const today = new Date();
      return { startDate: addDays(today, -7), endDate: addDays(today, 30), timeUnits: [] };
    }
    
    const allDates = validTasks.flatMap(task => [task.startDate, task.finishDate]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    const startDate = addDays(minDate, -7);
    const endDate = addDays(maxDate, 7);
    
    const timeUnits = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const increment = viewMode === "day" ? addDays : viewMode === "week" ? addWeeks : addMonths;
      timeUnits.push({ label: format(currentDate, viewMode === "month" ? "MMM yyyy" : "MMM dd"), date: new Date(currentDate) });
      currentDate = increment(currentDate, 1);
    }
    
    return { startDate, endDate, timeUnits };
  }, [allActivities, viewMode]);

  // WBS summaries with proportional calculations
  const wbsSummaries = useMemo(() => {
    return wbsList.map(wbs => {
      const activities = wbs.activities;
      if (activities.length === 0) return { totalManHours: 0, totalWeight: 0, earliestStart: null, latestFinish: null, progress: 0 };
      
      const totalWbsManHours = activities.reduce((sum, act) => sum + (Number(act.manHours) || 0), 0);
      // WBS weight is proportional to total project hours
      const totalWeight = totalManHours > 0 ? (totalWbsManHours / totalManHours) * 100 : 0;
      const validDates = activities.filter(act => act.startDate && act.finishDate);
      const earliestStart = validDates.length > 0 ? new Date(Math.min(...validDates.map(act => act.startDate))) : null;
      const latestFinish = validDates.length > 0 ? new Date(Math.max(...validDates.map(act => act.finishDate))) : null;
      
      // WBS progress is weighted average of all activities within this WBS
      const progress = totalWbsManHours > 0 
        ? activities.reduce((sum, act) => {
            const activityWeight = (Number(act.manHours) || 0) / totalWbsManHours;
            return sum + activityWeight * (Number(act.progress) || 0);
          }, 0) 
        : 0;
      
      return { totalManHours: totalWbsManHours, totalWeight, earliestStart, latestFinish, progress };
    });
  }, [wbsList, totalManHours]);
  
  // Project summary calculations
  const projectSummary = useMemo(() => {
    const totalProjectManHours = allActivities.reduce((sum, act) => sum + (Number(act.manHours) || 0), 0);
    const validDates = allActivities.filter(act => act.startDate && act.finishDate);
    const earliestStart = validDates.length > 0 ? new Date(Math.min(...validDates.map(act => act.startDate))) : null;
    const latestFinish = validDates.length > 0 ? new Date(Math.max(...validDates.map(act => act.finishDate))) : null;
    
    // Project progress is weighted average of all WBS based on their man-hours
    const projectProgress = totalProjectManHours > 0 
      ? wbsList.reduce((sum, wbs, index) => {
          const wbsWeight = wbsSummaries[index].totalManHours / totalProjectManHours;
          return sum + wbsWeight * wbsSummaries[index].progress;
        }, 0)
      : 0;
    
    return { totalManHours: totalProjectManHours, totalWeight: 100, earliestStart, latestFinish, progress: projectProgress };
  }, [allActivities, wbsList, wbsSummaries]);

  // Helper functions
  const headerCols = [
    { key: "code", label: "Code" },
    { key: "description", label: "Activity Description" },
    { key: "projectName", label: "Project Name" },
    ...(showManHours ? [
      { key: "manHours", label: "Man Hours" },
      { key: "activityWeight", label: "Activity Weight (%)" },
      { key: "startDate", label: "Start Date" },
      { key: "finishDate", label: "Finish Date" },
      { key: "progress", label: "Progress (%)" },
    ] : []),
  ];

  const getLeftPosition = (index) => 
    headerCols.slice(0, index).reduce((acc, col) => acc + columnWidths[col.key], 0);

  const addNewTask = (wbsId) => {
    const wbs = wbsList.find(w => w.wbsId === wbsId);
    const taskCode = `${wbsId.split("-")[0].toUpperCase()}-${String(wbs.activities.length + 1).padStart(3, "0")}`;
    
    setProjectData(prev => ({
      ...prev,
      wbs: prev.wbs.map(w => w.wbsId === wbsId ? {
        ...w,
        activities: [...w.activities, {
          id: Date.now().toString(),
          code: taskCode,
          description: "",
          manHours: 0,
          startDate: new Date(),
          finishDate: addDays(new Date(), 7),
          progress: 0
        }]
      } : w)
    }));
  };

  const updateTask = (wbsId, id, field, value) => {
    setProjectData(prev => ({
      ...prev,
      wbs: prev.wbs.map(wbs => wbs.wbsId === wbsId ? {
        ...wbs,
        activities: wbs.activities.map(task => task.id === id ? {
          ...task,
          [field]: field === "progress" ? Math.max(0, Math.min(100, Number(value) || 0)) :
                  field === "manHours" ? Math.max(0, Number(value) || 0) :
                  ["startDate", "finishDate"].includes(field) ? (value ? new Date(value) : null) : value
        } : task)
      } : wbs)
    }));
  };

  const getTaskPosition = (task) => {
    if (!task.startDate || !task.finishDate) return { left: "0px", width: "0px" };
    
    const totalDays = differenceInDays(chartData.endDate, chartData.startDate);
    const taskStart = differenceInDays(task.startDate, chartData.startDate);
    const taskDuration = differenceInDays(task.finishDate, task.startDate) + 1;
    const totalWidth = chartData.timeUnits.length * 64;
    
    return {
      left: `${Math.max(0, (taskStart / totalDays) * totalWidth)}px`,
      width: `${Math.max(10, (taskDuration / totalDays) * totalWidth)}px`
    };
  };

  const handleRowContextMenu = (e, wbsId, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (contextMenuAnchorRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      contextMenuAnchorRef.current.style.left = `${e.clientX - rect.left}px`;
      contextMenuAnchorRef.current.style.top = `${e.clientY - rect.top}px`;
    }
    
    setContextMenu({ visible: true, wbsId, taskId });
    setSelected({ wbsId, taskId });
  };

  const handleDelete = () => {
    setProjectData(prev => ({
      ...prev,
      wbs: prev.wbs.map(wbs => wbs.wbsId === contextMenu.wbsId ? {
        ...wbs,
        activities: wbs.activities.filter(task => task.id !== contextMenu.taskId)
      } : wbs)
    }));
    setContextMenu({ visible: false, wbsId: null, taskId: null });
  };

  const toggleCollapse = (wbsId) => {
    setCollapsed(prev => ({ ...prev, [wbsId]: !prev[wbsId] }));
  };

  const allCollapsed = Object.values(collapsed).every(Boolean);
  const ganttMinWidth = chartData.timeUnits.length * 64;

  return (
    <div className="p-6 w-full min-h-screen" onClick={() => setContextMenu({ visible: false, wbsId: null, taskId: null })}>
      <Card className="mb-6 w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCollapsed(Object.fromEntries(wbsList.map(wbs => [wbs.wbsId, !allCollapsed])))}>
              <ChevronsDownUp className="w-4 h-4 mr-1" />
              {allCollapsed ? "Expand All" : "Collapse All"}
            </Button>
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost"><Settings2 className="w-5 h-5" /></Button>
              </PopoverTrigger>
              <PopoverContent className="space-y-3">
                <Button variant="outline" className="w-full" onClick={() => setShowManHours(v => !v)}>
                  {showManHours ? "Hide" : "Show"} Man-Hours Loading
                </Button>
                <div>
                  <Label className="text-sm font-medium mb-1 block">View Mode</Label>
                  <Select value={viewMode} onValueChange={setViewMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">By Day</SelectItem>
                      <SelectItem value="week">By Week</SelectItem>
                      <SelectItem value="month">By Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="border rounded-lg overflow-auto" style={{ height: "70vh" }}>
            <div className="min-w-max relative">
              {/* Fixed Header */}
              <div className="bg-gray-100 border-b sticky top-0 z-30">
                <div className="flex">
                  {headerCols.map((col, idx) => (
                    <div
                      key={col.key}
                      className="p-2 bg-gray-200 text-center sticky z-40 border-r border-gray-300 last:border-r-0"
                      style={{
                        width: `${columnWidths[col.key]}px`,
                        left: `${getLeftPosition(idx)}px`,
                        fontSize: "0.95rem",
                      }}
                    >
                      {col.label}
                      {col.key !== "activityWeight" && <ColumnResizer onMouseDown={e => handleMouseDown(e, col.key)} />}
                    </div>
                  ))}
                  <div className="bg-gray-200 border-b border-gray-300" style={{ minWidth: ganttMinWidth }}>
                    <div className="flex h-10">
                      {chartData.timeUnits.map((unit, index) => (
                        <div key={index} className="flex items-center justify-center text-xs font-medium px-1" style={{ width: "64px" }}>
                          {unit.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Header bottom border - FIXED POSITIONING */}
                <div className="absolute bottom-0 left-0 w-full h-px bg-gray-300 z-50" />
              </div>

              {/* Project Header Row */}
              <div className="relative">
                <div className="flex items-center sticky left-0 z-20 mt-1" 
                     style={{ background: "linear-gradient(90deg, #2563eb, #3b82f6 80%)", minHeight: 50, borderRadius: "8px" }}>
                  
                  <div className="text-white font-bold flex items-center" style={{ width: `${columnWidths.code + columnWidths.description + columnWidths.projectName - 20}px`, paddingLeft: "20px" }}>
                    {projectData.projectName}
                  </div>
                  
                  {showManHours && (
                    <>
                      <div className="text-center text-white text-xs" style={{ width: `${columnWidths.manHours}px` }}>{projectSummary.totalManHours}</div>
                      <div className="text-center text-white text-xs" style={{ width: `${columnWidths.activityWeight}px` }}>{projectSummary.totalWeight.toFixed(1)}%</div>
                      <div className="text-center text-white text-xs" style={{ width: `${columnWidths.startDate}px` }}>
                        {projectSummary.earliestStart ? format(projectSummary.earliestStart, "MMM dd") : "-"}
                      </div>
                      <div className="text-center text-white text-xs" style={{ width: `${columnWidths.finishDate}px` }}>
                        {projectSummary.latestFinish ? format(projectSummary.latestFinish, "MMM dd") : "-"}
                      </div>
                      <div className="text-center text-white text-xs" style={{ width: `${columnWidths.progress}px` }}>
                        {projectSummary.progress.toFixed(1)}%
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* WBS Content */}
              {wbsList.map((wbs, wbsIndex) => {
                const isCollapsed = collapsed[wbs.wbsId];
                const summary = wbsSummaries[wbsIndex];
                
                return (
                  <div key={wbs.wbsId} className="relative">
                    {/* WBS Header Row */}
                    <div className="flex items-center sticky left-0 z-20 mt-1" 
                         style={{ background: `linear-gradient(90deg, ${wbs.color}, #4d9dff 80%)`, minHeight: 50, borderRadius: "8px 8px 0 0" }}>
                      <button onClick={() => toggleCollapse(wbs.wbsId)} className="ml-2 mr-2 p-1 hover:bg-white/20 rounded">
                        {isCollapsed ? <ChevronRight className="text-white w-5 h-5" /> : <ChevronDown className="text-white w-5 h-5" />}
                      </button>
                      
                      <div className="text-white font-bold flex items-center" style={{ width: `${columnWidths.code + columnWidths.description + columnWidths.projectName - 60}px`, paddingLeft: "8px" }}>
                        {wbs.wbsName}
                        <Button size="sm" variant="ghost" className="ml-4 text-white border border-white/40 hover:bg-white/20" onClick={() => addNewTask(wbs.wbsId)}>
                          <Plus className="w-4 h-4 mr-1" />Add Activity
                        </Button>
                      </div>
                      
                      {showManHours && (
                        <>
                          <div className="text-center text-white text-xs" style={{ width: `${columnWidths.manHours}px` }}>{summary.totalManHours}</div>
                          <div className="text-center text-white text-xs" style={{ width: `${columnWidths.activityWeight}px` }}>{summary.totalWeight.toFixed(1)}%</div>
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
                    </div>

                    {/* Activity Rows */}
                    {!isCollapsed && wbs.activities.map(task => {
                      const wbsManHours = wbs.activities.reduce((sum, act) => sum + (Number(act.manHours) || 0), 0);
                      const weight = wbsManHours > 0 ? ((Number(task.manHours) || 0) / wbsManHours) * 100 : 0;
                      const isSelected = selected.wbsId === wbs.wbsId && selected.taskId === task.id;
                      
                      return (
                        <div key={task.id} className={`relative hover:bg-gray-50 ${isSelected ? "bg-blue-100" : ""}`} 
                             style={{ minHeight: 38 }}
                             onContextMenu={e => handleRowContextMenu(e, wbs.wbsId, task.id)}
                             onClick={e => { e.stopPropagation(); setSelected({ wbsId: wbs.wbsId, taskId: task.id }); }}>
                          
                          <div className="flex">
                            {headerCols.map((col, idx) => (
                              <div key={col.key} className="p-2 bg-white sticky z-15" 
                                   style={{ width: `${columnWidths[col.key]}px`, left: `${getLeftPosition(idx)}px`, minHeight: 38 }}>
                                {col.key === "code" && <span className="text-xs font-mono text-gray-600">{task.code}</span>}
                                {col.key === "description" && (
                                  <Input value={task.description} onChange={e => updateTask(wbs.wbsId, task.id, "description", e.target.value)} 
                                         placeholder="Enter activity description..." className="border-0 shadow-none h-8 text-xs" />
                                )}
                                {col.key === "projectName" && <span className="text-xs text-gray-500">{projectData.projectName}</span>}
                                {col.key === "manHours" && (
                                  <NumericInput value={task.manHours} onChange={e => updateTask(wbs.wbsId, task.id, "manHours", e.target.value)} />
                                )}
                                {col.key === "activityWeight" && <span className="text-xs text-green-700">{weight.toFixed(1)}%</span>}
                                {(col.key === "startDate" || col.key === "finishDate") && (
                                  <DatePicker value={task[col.key]} onChange={date => updateTask(wbs.wbsId, task.id, col.key, date)} />
                                )}
                                {col.key === "progress" && (
                                  <NumericInput value={task.progress} min={0} max={100} onChange={e => updateTask(wbs.wbsId, task.id, "progress", e.target.value)} />
                                )}
                              </div>
                            ))}
                            
                            {/* Gantt Timeline */}
                            <div className="relative p-2 flex items-center bg-white" style={{ minWidth: ganttMinWidth, minHeight: 38 }}>
                              <div className="relative w-full h-8">
                                {task.description.trim() && task.startDate && task.finishDate && (
                                  <div className="absolute top-1 h-6 bg-gray-200" style={getTaskPosition(task)}>
                                    <div className="h-6 bg-green-500 transition-all duration-300" 
                                         style={{ width: `${Math.max(0, Math.min(100, task.progress))}%`, opacity: task.progress > 0 ? 1 : 0.15 }}
                                         title={`${task.code}: ${task.description}`} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Row bottom border - PROPERLY POSITIONED */}
                          <div className="absolute bottom-0 left-0 w-full h-px bg-blue-200" />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <ContextMenuPopover open={contextMenu.visible} onOpenChange={(open) => !open && setContextMenu({ visible: false, wbsId: null, taskId: null })} 
                          onDelete={handleDelete} anchorRef={contextMenuAnchorRef} />
    </div>
  );
};

export default GanttChart;