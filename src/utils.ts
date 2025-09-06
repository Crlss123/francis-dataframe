export const getDateRange = (startDate: string, endDate: string): string[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dateArray: string[] = [];

  while (start <= end) {
    dateArray.push(start.toISOString().split('T')[0]);
    start.setDate(start.getDate() + 1);
  }

  return dateArray;
};

