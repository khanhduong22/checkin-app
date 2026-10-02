import React, { useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface TanStackTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
}

export function TanStackTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = "Không có dữ liệu hiển thị.",
  className,
}: TanStackTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        className={cn(
                          "px-4 py-3.5 whitespace-nowrap",
                          canSort && "cursor-pointer select-none hover:text-slate-200"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1.5">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {canSort && (
                            <span className="text-slate-500">
                              {sortDirection === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5 text-amber-400" />
                              ) : sortDirection === "desc" ? (
                                <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="transition-colors hover:bg-slate-800/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 align-middle">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-44 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="h-8 w-8 text-slate-600" />
                      <p className="text-sm font-medium">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-400">
          <div>
            Trang{" "}
            <span className="font-semibold text-slate-200">
              {table.getState().pagination.pageIndex + 1}
            </span>{" "}
            /{" "}
            <span className="font-semibold text-slate-200">
              {table.getPageCount()}
            </span>{" "}
            (Tổng {data.length} mục)
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
