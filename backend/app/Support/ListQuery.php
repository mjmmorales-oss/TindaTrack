<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class ListQuery
{
    /**
     * Applies search, filters, sorting, and pagination to an Eloquent builder.
     *
     * @param  array  $allowedFilters  Key-value where key is request param name and value is DB column or callable
     * @param  array  $allowedSorts  List of sortable column names
     */
    public static function paginate(
        Builder $query,
        Request $request,
        array $searchColumns = [],
        array $allowedFilters = [],
        array $allowedSorts = [],
        string $defaultSort = '-created_at',
        int $defaultPerPage = 15
    ): LengthAwarePaginator {
        // 1. Search
        $q = trim((string) $request->input('q', ''));
        if ($q !== '' && ! empty($searchColumns)) {
            $query->where(function (Builder $sub) use ($q, $searchColumns) {
                foreach ($searchColumns as $col) {
                    $sub->orWhere($col, 'like', "%{$q}%");
                }
            });
        }

        // 2. Filters
        foreach ($allowedFilters as $param => $columnOrHandler) {
            if ($request->has($param) && $request->input($param) !== null && $request->input($param) !== '') {
                $val = $request->input($param);
                if (is_callable($columnOrHandler)) {
                    $columnOrHandler($query, $val);
                } else {
                    $query->where($columnOrHandler, $val);
                }
            }
        }

        // 3. Sort
        $sort = (string) $request->input('sort', $defaultSort);
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        if (! empty($allowedSorts) && in_array($column, $allowedSorts, true)) {
            $query->orderBy($column, $direction);
        } else {
            $defDir = str_starts_with($defaultSort, '-') ? 'desc' : 'asc';
            $defCol = ltrim($defaultSort, '-');
            $query->orderBy($defCol, $defDir);
        }

        // 4. Pagination (per_page clamped 1..100)
        $perPage = (int) $request->input('per_page', $defaultPerPage);
        $perPage = max(1, min(100, $perPage));

        return $query->paginate($perPage);
    }
}
