export interface OrgAnalytics {
  totalManagers: number;
  activeManagers: number;
  totalEmployees: number;
  activeEmployees: number;
  exitedEmployees: number;
  monthTotals: {
    P: number;
    A: number;
    L: number;
    SL: number;
    H: number;
    percentage: number;
  };
  managerStats: Array<{
    id: string;
    name: string;
    status: string;
    employeeCount: number;
    percentage: number;
  }>;
}
