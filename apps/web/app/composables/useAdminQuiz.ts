import type { AdminQuizRow, AdminQuizState, QuizDefinition } from '@serag/shared'

/**
 * Data composable for the admin quiz list and editor.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminQuiz() {
  function list(): Promise<{ items: AdminQuizRow[] }> {
    return adminFetch<{ items: AdminQuizRow[] }>('/admin/quiz')
  }

  function get(categoryId: string): Promise<AdminQuizState> {
    return adminFetch<AdminQuizState>(`/admin/quiz/${encodeURIComponent(categoryId)}`)
  }

  function save(categoryId: string, definition: QuizDefinition): Promise<AdminQuizState> {
    return adminFetch<AdminQuizState>(`/admin/quiz/${encodeURIComponent(categoryId)}`, {
      method: 'PUT',
      body: definition,
    })
  }

  async function remove(categoryId: string): Promise<void> {
    await adminFetch(`/admin/quiz/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
    })
  }

  return {
    list,
    get,
    save,
    remove,
  }
}
