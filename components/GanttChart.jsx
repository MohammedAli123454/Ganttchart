"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Settings2, ChevronDown, ChevronRight, ChevronsDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import ganttData from "@/data/ganttData.json";
import {
  addDays,
  format,
  convertDatesToObjects,
  flattenWbs,
  getAllActivities,
  calculateTotalManHours,
  calculateChartData,
  calculateWbsSummaries,
  calculateProjectSummary,
  getTaskPosition,
  addNewTaskToWbs,
  updateTaskInWbs,
  deleteTaskFromWbs
} from "@/utils/ganttUtils";

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


// Initial data loaded from JSON and converted
const initialProject = convertDatesToObjects(ganttData);

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
    code: 80, description: 280, manHours: 90, activityWeight: 110, 
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

  // Calculations using utility functions
  const flattenedWbs = useMemo(() => flattenWbs(wbsList), [wbsList]);
  const allActivities = useMemo(() => getAllActivities(flattenedWbs), [flattenedWbs]);
  const totalManHours = useMemo(() => calculateTotalManHours(allActivities), [allActivities]);
  const chartData = useMemo(() => calculateChartData(allActivities, viewMode), [allActivities, viewMode]);

  const wbsSummaries = useMemo(() => calculateWbsSummaries(flattenedWbs, totalManHours), [flattenedWbs, totalManHours]);
  
  const projectSummary = useMemo(() => calculateProjectSummary(allActivities, wbsList, flattenedWbs, wbsSummaries), [allActivities, wbsList, flattenedWbs, wbsSummaries]);

  // Helper functions
  const headerCols = [
    { key: "code", label: "Code" },
    { key: "description", label: "Activity Description" },
    ...(showManHours ? [
      { key: "manHours", label: "Hours" },
      { key: "activityWeight", label: "Weight (%)" },
      { key: "startDate", label: "Start Date" },
      { key: "finishDate", label: "Finish Date" },
      { key: "progress", label: "Progress" },
    ] : []),
  ];

  const getLeftPosition = (index) => 
    headerCols.slice(0, index).reduce((acc, col) => acc + columnWidths[col.key], 0);

  const addNewTask = (wbsId) => {
    setProjectData(prev => addNewTaskToWbs(prev, wbsId));
  };

  const updateTask = (wbsId, id, field, value) => {
    setProjectData(prev => updateTaskInWbs(prev, wbsId, id, field, value));
  };

  const getTaskPos = (task) => getTaskPosition(task, chartData);

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
    setProjectData(prev => deleteTaskFromWbs(prev, contextMenu.wbsId, contextMenu.taskId));
    setContextMenu({ visible: false, wbsId: null, taskId: null });
  };

  const toggleCollapse = (wbsId) => {
    setCollapsed(prev => ({ ...prev, [wbsId]: !prev[wbsId] }));
  };

  const allCollapsed = Object.values(collapsed).every(Boolean);
  const ganttMinWidth = chartData.timeUnits.length * 64;

  // Helper function to render WBS row with proper indentation and colors
  const renderWbsRow = (wbs, wbsIndex) => {
    const isCollapsed = collapsed[wbs.wbsId];
    const summary = wbsSummaries[wbsIndex];
    const indentation = wbs.level * 30; // 30px indentation per level
    
    return (
      <div key={wbs.wbsId} className="relative">
        {/* WBS Header Row */}
        <div className="flex items-center sticky left-0 z-20 border-t border-transparent" style={{ minHeight: 38 }}>
          
          {/* WBS columns with colored background */}
          <div className="flex items-center sticky left-0 z-15" style={{ 
            background: `linear-gradient(90deg, ${wbs.color}, #4d9dff 80%)`, 
            borderRadius: wbs.level === 0 ? "6px 0 0 0" : "4px 0 0 0"
          }}>
            <button onClick={() => toggleCollapse(wbs.wbsId)} className="p-1 hover:bg-white/20 rounded" style={{ marginLeft: `${indentation + 8}px`, marginRight: "4px" }}>
              {isCollapsed ? <ChevronRight className="text-white w-4 h-4" /> : <ChevronDown className="text-white w-4 h-4" />}
            </button>
            
            <div className="text-white font-bold flex items-center" style={{ 
              width: `${columnWidths.code + columnWidths.description - 50}px`, 
              paddingLeft: "6px", 
              minHeight: 38, 
              fontSize: wbs.level === 0 ? "0.8rem" : "0.75rem" 
            }}>
              {wbs.wbsName}
              <Button size="sm" variant="ghost" className="ml-3 text-white border border-white/40 hover:bg-white/20 text-xs" onClick={() => addNewTask(wbs.wbsId)}>
                <Plus className="w-3 h-3 mr-1" />Add
              </Button>
            </div>
            
            {showManHours && (
              <>
                <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.manHours}px`, minHeight: 38 }}>{summary.totalManHours}</div>
                <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.activityWeight}px`, minHeight: 38 }}>{summary.totalWeight.toFixed(1)}%</div>
              </>
            )}
            <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.startDate}px`, minHeight: 38 }}>
              {summary.earliestStart ? format(summary.earliestStart, "MMM dd") : "-"}
            </div>
            <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.finishDate}px`, minHeight: 38 }}>
              {summary.latestFinish ? format(summary.latestFinish, "MMM dd") : "-"}
            </div>
            <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.progress}px`, minHeight: 38 }}>
              {summary.progress.toFixed(1)}%
            </div>
          </div>
          
          {/* WBS Gantt Timeline - White background */}
          <div className="relative p-2 flex items-center bg-white" style={{ minWidth: ganttMinWidth, minHeight: 38 }}>
            <div className="relative w-full h-8">
              {summary.earliestStart && summary.latestFinish && (
                <div className="absolute top-1 h-6 bg-gray-200" style={getTaskPos({ startDate: summary.earliestStart, finishDate: summary.latestFinish })}>
                  <div className="h-6 transition-all duration-300" 
                       style={{ 
                         width: `${Math.max(0, Math.min(100, summary.progress))}%`, 
                         background: wbs.color,
                         opacity: summary.progress > 0 ? 1 : 0.15 
                       }}
                       title={`${wbs.wbsName}: ${summary.progress.toFixed(1)}%`} />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Blue line after WBS row */}
        <div className="h-px bg-blue-300" style={{ width: `${headerCols.reduce((acc, col) => acc + columnWidths[col.key], 0) + ganttMinWidth}px` }} />

        {/* Activity Rows */}
        {!isCollapsed && wbs.activities.map(task => {
          const wbsManHours = wbs.activities.reduce((sum, act) => sum + (Number(act.manHours) || 0), 0);
          const weight = wbsManHours > 0 ? ((Number(task.manHours) || 0) / wbsManHours) * 100 : 0;
          const isSelected = selected.wbsId === wbs.wbsId && selected.taskId === task.id;
          
          return (
            <div key={task.id} className={`relative hover:bg-gray-50 ${isSelected ? "bg-blue-100" : ""} border-b border-blue-300`} 
                 style={{ minHeight: 32 }}
                 onContextMenu={e => handleRowContextMenu(e, wbs.wbsId, task.id)}
                 onClick={e => { e.stopPropagation(); setSelected({ wbsId: wbs.wbsId, taskId: task.id }); }}>
              
              <div className="flex">
                {headerCols.map((col, idx) => (
                  <div key={col.key} className="px-2 py-1 bg-white sticky z-15" 
                       style={{ width: `${columnWidths[col.key]}px`, left: `${getLeftPosition(idx)}px`, minHeight: 32 }}>
                    {col.key === "code" && <span className="text-xs font-mono text-gray-600 flex items-center h-full">{task.code}</span>}
                    {col.key === "description" && (
                      <Input value={task.description} onChange={e => updateTask(wbs.wbsId, task.id, "description", e.target.value)} 
                             placeholder="Enter activity description..." className="border-0 shadow-none h-6 text-xs" />
                    )}
                    {col.key === "manHours" && (
                      <NumericInput value={task.manHours} onChange={e => updateTask(wbs.wbsId, task.id, "manHours", e.target.value)} />
                    )}
                    {col.key === "activityWeight" && <span className="text-xs text-green-700 flex items-center justify-center h-full">{weight.toFixed(1)}%</span>}
                    {(col.key === "startDate" || col.key === "finishDate") && (
                      <DatePicker value={task[col.key]} onChange={date => updateTask(wbs.wbsId, task.id, col.key, date)} />
                    )}
                    {col.key === "progress" && (
                      <NumericInput value={task.progress} min={0} max={100} onChange={e => updateTask(wbs.wbsId, task.id, "progress", e.target.value)} />
                    )}
                  </div>
                ))}
                
                {/* Gantt Timeline */}
                <div className="relative px-2 py-1 flex items-center bg-white" style={{ minWidth: ganttMinWidth, minHeight: 32 }}>
                  <div className="relative w-full h-8">
                    {task.description.trim() && task.startDate && task.finishDate && (
                      <div className="absolute top-1 h-6 bg-gray-200" style={getTaskPos(task)}>
                        <div className="h-6 bg-green-500 transition-all duration-300" 
                             style={{ width: `${Math.max(0, Math.min(100, task.progress))}%`, opacity: task.progress > 0 ? 1 : 0.15 }}
                             title={`${task.code}: ${task.description}`} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Render child WBS if not collapsed */}
        {!isCollapsed && wbs.children && wbs.children.map(childWbs => {
          const childIndex = flattenedWbs.findIndex(w => w.wbsId === childWbs.wbsId);
          return renderWbsRow(childWbs, childIndex);
        })}
      </div>
    );
  };

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
              <div className="border-b sticky top-0 z-30" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)" }}>
                <div className="flex">
                  {headerCols.map((col, idx) => (
                    <div
                      key={col.key}
                      className="p-2 text-center sticky z-40 border-r border-gray-300 last:border-r-0"
                      style={{
                        width: `${columnWidths[col.key]}px`,
                        left: `${getLeftPosition(idx)}px`,
                        fontSize: "0.9rem",
                        background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)",
                        fontWeight: "600",
                        color: "#475569"
                      }}
                    >
                      {col.label}
                      {col.key !== "activityWeight" && <ColumnResizer onMouseDown={e => handleMouseDown(e, col.key)} />}
                    </div>
                  ))}
                  <div className="border-b border-gray-300" style={{ minWidth: ganttMinWidth, background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)" }}>
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
                <div className="flex items-center sticky left-0 z-20" style={{ minHeight: 38 }}>
                  
                  {/* Project columns with colored background */}
                  <div className="flex items-center sticky left-0 z-15" style={{ background: "linear-gradient(90deg, #1e40af, #2563eb 80%)", borderRadius: "6px 0 0 6px" }}>
                    <div className="text-white font-bold flex items-center" style={{ width: `${columnWidths.code + columnWidths.description - 20}px`, paddingLeft: "16px", minHeight: 38, fontSize: "0.85rem" }}>
                      {projectData.projectName}
                    </div>
                    
                    {showManHours && (
                      <>
                        <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.manHours}px`, minHeight: 38 }}>{projectSummary.totalManHours}</div>
                        <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.activityWeight}px`, minHeight: 38 }}>{projectSummary.totalWeight.toFixed(1)}%</div>
                        <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.startDate}px`, minHeight: 38 }}>
                          {projectSummary.earliestStart ? format(projectSummary.earliestStart, "MMM dd") : "-"}
                        </div>
                        <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.finishDate}px`, minHeight: 38 }}>
                          {projectSummary.latestFinish ? format(projectSummary.latestFinish, "MMM dd") : "-"}
                        </div>
                        <div className="text-center text-white text-xs flex items-center justify-center" style={{ width: `${columnWidths.progress}px`, minHeight: 38 }}>
                          {projectSummary.progress.toFixed(1)}%
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Project Gantt Timeline - White background */}
                  <div className="relative p-2 flex items-center bg-white" style={{ minWidth: ganttMinWidth, minHeight: 38 }}>
                    <div className="relative w-full h-8">
                      {projectSummary.earliestStart && projectSummary.latestFinish && (
                        <div className="absolute top-1 h-6 bg-gray-200" style={getTaskPos({ startDate: projectSummary.earliestStart, finishDate: projectSummary.latestFinish })}>
                          <div className="h-6 bg-blue-700 transition-all duration-300" 
                               style={{ width: `${Math.max(0, Math.min(100, projectSummary.progress))}%`, opacity: projectSummary.progress > 0 ? 1 : 0.15 }}
                               title={`${projectData.projectName}: ${projectSummary.progress.toFixed(1)}%`} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Blue line after Project row */}
                <div className="h-px bg-blue-300" style={{ width: `${headerCols.reduce((acc, col) => acc + columnWidths[col.key], 0) + ganttMinWidth}px` }} />
              </div>

              {/* WBS Content - Only render top-level WBS */}
              {wbsList.filter(wbs => wbs.level === 0).map((wbs) => {
                const flattenedIndex = flattenedWbs.findIndex(w => w.wbsId === wbs.wbsId);
                return renderWbsRow(wbs, flattenedIndex);
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