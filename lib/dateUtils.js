export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addWeeks = (date, weeks) => addDays(date, weeks * 7);

export const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const differenceInDays = (dateLeft, dateRight) => {
  const diffTime = dateLeft.getTime() - dateRight.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const format = (date, formatStr) => {
  if (!date || isNaN(date.getTime())) return "";

  const options = {
    "MMM dd": { month: "short", day: "2-digit" },
    "MMM yyyy": { month: "short", year: "numeric" },
    "yyyy-MM-dd": undefined, // For input[type="date"]
  };

  if (formatStr === "yyyy-MM-dd") {
    return date.toISOString().split("T")[0];
  }

  return date.toLocaleDateString("en-US", options[formatStr] || { month: "short", day: "2-digit" });
};

export const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const endOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};
