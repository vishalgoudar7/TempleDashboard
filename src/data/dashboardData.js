export const dashboardData = {
  monthlyRevenue: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    data: [620000, 658000, 704000, 689000, 752000, 806000, 791000, 873000, 928000, 995000, 1068000, 1145000],
  },
  ordersByStatus: [
    { name: "Completed", value: 7680 },
    { name: "Pending", value: 1325 },
    { name: "Processing", value: 2410 },
    { name: "Cancelled", value: 495 },
  ],
  monthlyOrders: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    data: [980, 1035, 1108, 1086, 1174, 1249, 1221, 1318, 1392, 1468, 1561, 1654],
  },
  yearlyRevenue: {
    labels: [2022, 2023, 2024, 2025, 2026],
    data: [7420000, 9260000, 11380000, 13850000, 16720000],
  },
  dailyOrders: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    data: [172, 181, 176, 189, 214, 238, 226],
  },
};
