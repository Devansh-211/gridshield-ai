import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

export interface TableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  selectedRowId?: string | number | null;
  onSelectRow?: (row: TData) => void;
  emptyMessage?: string;
  getRowId?: (row: TData) => string;
  className?: string;
}

export function Table<TData>({
  data,
  columns,
  selectedRowId,
  onSelectRow,
  emptyMessage = 'No records found.',
  getRowId,
  className = '',
}: TableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId,
  });

  return (
    <div className={`w-full h-full overflow-auto bg-panel select-none ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        {/* Sticky Header */}
        <thead className="bg-panel-alt text-text-muted sticky top-0 z-10 border-b border-border font-ui">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="h-7 min-h-[28px]">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();

                return (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`px-2 py-1 text-xs font-semibold text-text-muted border-r border-border/40 last:border-r-0 ${
                      canSort ? 'cursor-pointer hover:text-text-main hover:bg-inset/50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-1 justify-between">
                      <span className="truncate">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </span>
                      {canSort && (
                        <span className="text-[10px] text-text-subtle font-mono">
                          {isSorted === 'asc' ? '▲' : isSorted === 'desc' ? '▼' : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-border/40 font-ui text-text-main">
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => {
              const isSelected =
                selectedRowId !== undefined &&
                selectedRowId !== null &&
                String(row.id) === String(selectedRowId);

              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectRow && onSelectRow(row.original)}
                  className={`h-7 min-h-[28px] transition-colors ${
                    onSelectRow ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-accent-tint text-text-main border-l-2 border-l-accent font-medium'
                      : 'hover:bg-panel-alt'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2 py-1 border-r border-border/30 last:border-r-0 truncate"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="h-16 text-center text-text-subtle text-xs"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
