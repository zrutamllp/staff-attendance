"use client";

import type { AttendanceGridRow } from "@/types/views";
import type { AttendanceStatus } from "@/types/session";

import { useCallback, useRef, useState } from "react";
import {
  applyGridStatusUpdate,
  saveAttendanceStatus,
  storedFromPickerCode,
} from "@/features/attendance/lib/attendance-client";

export function useOptimisticAttendance() {
  const [grid, setGrid] = useState<AttendanceGridRow[]>([]);
  const [pendingKeys, setPendingKeys] = useState(new Set());
  const gridRef = useRef([]);

  const syncGrid = useCallback((nextGrid) => {
    gridRef.current = nextGrid;
    setGrid(nextGrid);
  }, []);

  const setInitialGrid = useCallback(
    (nextGrid) => {
      syncGrid(nextGrid);
    },
    [syncGrid]
  );

  const applyStatus = useCallback(
    async (
      employeeId: string,
      date: string,
      pickerCode: AttendanceStatus,
      actor?: { id: string; name: string }
    ) => {
      const newStored = storedFromPickerCode(pickerCode);
      const previousGrid = gridRef.current;
      let nextGrid = applyGridStatusUpdate(previousGrid, employeeId, date, newStored);

      if (actor) {
        nextGrid = nextGrid.map((row) => {
          if (row.employee.id !== employeeId) return row;
          return {
            ...row,
            days: row.days.map((d) =>
              d.date === date
                ? {
                    ...d,
                    lastChangedBy: actor.id,
                    lastChangedByName: actor.name,
                  }
                : d
            ),
          };
        });
      }

      syncGrid(nextGrid);

      const key = `${employeeId}:${date}`;
      setPendingKeys((prev) => new Set(prev).add(key));

      try {
        await saveAttendanceStatus(employeeId, date, newStored);
      } catch (error) {
        syncGrid(previousGrid);
        throw error;
      } finally {
        setPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [syncGrid]
  );

  const isPending = useCallback(
    (employeeId, date) => pendingKeys.has(`${employeeId}:${date}`),
    [pendingKeys]
  );

  return {
    grid,
    setInitialGrid,
    applyStatus,
    isPending,
  };
}
