'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/prism/atoms';
import { SearchInput } from '@/components/prism/molecules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataTableProps<T> {
  /** Row data */
  data: T[];
  /** TanStack column definitions */
  columns: ColumnDef<T, unknown>[];
  /** Show a search / global filter input above the table */
  searchable?: boolean;
  /** Enable pagination controls (default true) */
  pagination?: boolean;
  /** Rows per page – used as initial page size (default 25) */
  pageSize?: number;
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Page-size options
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTable<T>({
  data,
  columns,
  searchable = false,
  pagination = true,
  pageSize = 25,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable<T>({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pagination
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          initialState: { pagination: { pageSize } },
        }
      : {}),
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const currentPageSize = table.getState().pagination.pageSize;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const startRow = pageIndex * currentPageSize + 1;
  const endRow = Math.min((pageIndex + 1) * currentPageSize, totalRows);

  return (
    <div className={cn('w-full', className)}>
      {/* ---- Toolbar ---- */}
      {searchable && (
        <div className="mb-3">
          <SearchInput
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder="Search table..."
            className="max-w-sm"
          />
        </div>
      )}

      {/* ---- Table ---- */}
      <div className="overflow-x-auto rounded-card border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.06] bg-transparent">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50',
                        canSort && 'cursor-pointer select-none',
                      )}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-white/30">
                            {sortDir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : sortDir === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-limestone-100 bg-white">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-white/30"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer',
                    'hover:bg-white/[0.04]',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-white/60">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Pagination ---- */}
      {pagination && totalRows > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-white/50">
          {/* Left – page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Rows per page</span>
            <select
              value={currentPageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-8 rounded-md border border-white/[0.10] bg-white/[0.07] backdrop-blur-xl px-2 text-xs text-white/60 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Center – row range */}
          <span className="text-xs tabular-nums text-white/50">
            {startRow}–{endRow} of {totalRows}
          </span>

          {/* Right – prev / next */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs tabular-nums">
              Page {pageIndex + 1} of {pageCount}
            </span>
            <Button
              variant="ghost"
              size="xs"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

DataTable.displayName = 'DataTable';
