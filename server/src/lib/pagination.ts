export function paginate(query: Record<string, string | string[]>) {
  const page  = Math.max(1, parseInt((query.page  as string) ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt((query.limit as string) ?? '25', 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}
