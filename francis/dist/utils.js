"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateRange = void 0;
const getDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray = [];
    while (start <= end) {
        dateArray.push(start.toISOString().split('T')[0]);
        start.setDate(start.getDate() + 1);
    }
    return dateArray;
};
exports.getDateRange = getDateRange;
//# sourceMappingURL=utils.js.map