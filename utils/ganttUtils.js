// Date utilities
export const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export const addWeeks = (date, weeks) => addDays(date, weeks * 7);

export const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const differenceInDays = (date1, date2) => Math.floor((date1.getTime() - date2.getTime()) / (24 * 60 * 60 * 1000));

export const format = (date, formatStr) => {
  const month = date.toLocaleDateString('en', { month: 'short' });
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  
  if (formatStr === "MMM dd") return `${month} ${day}`;
  if (formatStr === "MMM yyyy") return `${month} ${year}`;
  return `${month} ${day}`;
};

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

// Function to convert JSON date strings to Date objects
export const convertDatesToObjects = (data) => {
  const convertWbs = (wbs) => ({
    ...wbs,
    activities: wbs.activities.map(activity => ({
      ...activity,
      startDate: new Date(activity.startDate),
      finishDate: new Date(activity.finishDate)
    })),
    children: wbs.children ? wbs.children.map(convertWbs) : undefined
  });

  return {
    ...data,
    wbs: data.wbs.map(convertWbs)
  };
};

// Flatten all WBS including children for calculations
export const flattenWbs = (wbsList) => {
  const flattened = [];
  wbsList.forEach(wbs => {
    flattened.push(wbs);
    if (wbs.children) {
      flattened.push(...wbs.children);
    }
  });
  return flattened;
};

// Get all activities from flattened WBS
export const getAllActivities = (flattenedWbs) => 
  flattenedWbs.flatMap(wbs => wbs.activities.map(act => ({ ...act, wbsId: wbs.wbsId })));

// Calculate total man hours
export const calculateTotalManHours = (allActivities) => 
  allActivities.reduce((sum, t) => sum + (Number(t.manHours) || 0), 0);

// Calculate overall progress
export const calculateOverallProgress = (allActivities, totalManHours) => {
  if (totalManHours === 0) return 0;
  return allActivities.reduce((sum, t) => {
    const weight = (Number(t.manHours) || 0) / totalManHours;
    const progress = Math.max(0, Math.min(100, Number(t.progress) || 0));
    return sum + weight * progress;
  }, 0);
};

// Calculate timeline data
export const calculateChartData = (allActivities, viewMode) => {
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
};

// Calculate WBS summaries
export const calculateWbsSummaries = (flattenedWbs, totalManHours) => {
  return flattenedWbs.map(wbs => {
    // For parent WBS, include children's activities in calculations
    let allWbsActivities = [...wbs.activities];
    if (wbs.children) {
      wbs.children.forEach(child => {
        allWbsActivities.push(...child.activities);
      });
    }
    
    if (allWbsActivities.length === 0) return { totalManHours: 0, totalWeight: 0, earliestStart: null, latestFinish: null, progress: 0 };
    
    const totalWbsManHours = allWbsActivities.reduce((sum, act) => sum + (Number(act.manHours) || 0), 0);
    // WBS weight is proportional to total project hours
    const totalWeight = totalManHours > 0 ? (totalWbsManHours / totalManHours) * 100 : 0;
    const validDates = allWbsActivities.filter(act => act.startDate && act.finishDate);
    const earliestStart = validDates.length > 0 ? new Date(Math.min(...validDates.map(act => act.startDate))) : null;
    const latestFinish = validDates.length > 0 ? new Date(Math.max(...validDates.map(act => act.finishDate))) : null;
    
    // WBS progress is weighted average of all activities within this WBS (including children)
    const progress = totalWbsManHours > 0 
      ? allWbsActivities.reduce((sum, act) => {
          const activityWeight = (Number(act.manHours) || 0) / totalWbsManHours;
          return sum + activityWeight * (Number(act.progress) || 0);
        }, 0) 
      : 0;
    
    return { totalManHours: totalWbsManHours, totalWeight, earliestStart, latestFinish, progress };
  });
};

// Calculate project summary
export const calculateProjectSummary = (allActivities, wbsList, flattenedWbs, wbsSummaries) => {
  const totalProjectManHours = allActivities.reduce((sum, act) => sum + (Number(act.manHours) || 0), 0);
  const validDates = allActivities.filter(act => act.startDate && act.finishDate);
  const earliestStart = validDates.length > 0 ? new Date(Math.min(...validDates.map(act => act.startDate))) : null;
  const latestFinish = validDates.length > 0 ? new Date(Math.max(...validDates.map(act => act.finishDate))) : null;
  
  // Project progress is weighted average of top-level WBS only (level 0)
  const topLevelWbs = wbsList.filter(wbs => wbs.level === 0);
  const projectProgress = totalProjectManHours > 0 
    ? topLevelWbs.reduce((sum, wbs) => {
        const wbsIndex = flattenedWbs.findIndex(w => w.wbsId === wbs.wbsId);
        if (wbsIndex >= 0) {
          const wbsWeight = wbsSummaries[wbsIndex].totalManHours / totalProjectManHours;
          return sum + wbsWeight * wbsSummaries[wbsIndex].progress;
        }
        return sum;
      }, 0)
    : 0;
  
  return { totalManHours: totalProjectManHours, totalWeight: 100, earliestStart, latestFinish, progress: projectProgress };
};

// Get task position for Gantt chart
export const getTaskPosition = (task, chartData) => {
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

// Add new task to WBS
export const addNewTaskToWbs = (projectData, wbsId) => {
  const wbs = projectData.wbs.find(w => w.wbsId === wbsId) || 
             projectData.wbs.flatMap(w => w.children || []).find(w => w.wbsId === wbsId);
  const taskCode = `${wbsId.split("-")[0].toUpperCase()}-${String(wbs.activities.length + 1).padStart(3, "0")}`;
  
  return {
    ...projectData,
    wbs: projectData.wbs.map(w => w.wbsId === wbsId ? {
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
    } : {
      ...w,
      children: w.children ? w.children.map(child => child.wbsId === wbsId ? {
        ...child,
        activities: [...child.activities, {
          id: Date.now().toString(),
          code: taskCode,
          description: "",
          manHours: 0,
          startDate: new Date(),
          finishDate: addDays(new Date(), 7),
          progress: 0
        }]
      } : child) : undefined
    })
  };
};

// Update task in WBS
export const updateTaskInWbs = (projectData, wbsId, id, field, value) => {
  return {
    ...projectData,
    wbs: projectData.wbs.map(wbs => wbs.wbsId === wbsId ? {
      ...wbs,
      activities: wbs.activities.map(task => task.id === id ? {
        ...task,
        [field]: field === "progress" ? Math.max(0, Math.min(100, Number(value) || 0)) :
                field === "manHours" ? Math.max(0, Number(value) || 0) :
                ["startDate", "finishDate"].includes(field) ? (value ? new Date(value) : null) : value
      } : task)
    } : {
      ...wbs,
      children: wbs.children ? wbs.children.map(child => child.wbsId === wbsId ? {
        ...child,
        activities: child.activities.map(task => task.id === id ? {
          ...task,
          [field]: field === "progress" ? Math.max(0, Math.min(100, Number(value) || 0)) :
                  field === "manHours" ? Math.max(0, Number(value) || 0) :
                  ["startDate", "finishDate"].includes(field) ? (value ? new Date(value) : null) : value
        } : task)
      } : child) : undefined
    })
  };
};

// Delete task from WBS
export const deleteTaskFromWbs = (projectData, wbsId, taskId) => {
  return {
    ...projectData,
    wbs: projectData.wbs.map(wbs => wbs.wbsId === wbsId ? {
      ...wbs,
      activities: wbs.activities.filter(task => task.id !== taskId)
    } : {
      ...wbs,
      children: wbs.children ? wbs.children.map(child => child.wbsId === wbsId ? {
        ...child,
        activities: child.activities.filter(task => task.id !== taskId)
      } : child) : undefined
    })
  };
};