import type { AdminHomeState, HomeContent, HomeLayout, HomeVersionRow } from '@serag/shared'

/**
 * Data composable for the admin home CMS editor.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminCms() {
  async function getHome(): Promise<AdminHomeState> {
    return adminFetch<AdminHomeState>('/admin/content/home')
  }

  async function saveDraft(input: {
    sections: HomeContent
    layout: HomeLayout
    english?: HomeContent | null
  }): Promise<AdminHomeState> {
    return adminFetch<AdminHomeState>('/admin/content/home/draft', {
      method: 'PUT',
      body: input,
    })
  }

  async function publish(label?: string): Promise<AdminHomeState> {
    return adminFetch<AdminHomeState>('/admin/content/home/publish', {
      method: 'POST',
      body: label ? { label } : {},
    })
  }

  async function discard(): Promise<AdminHomeState> {
    return adminFetch<AdminHomeState>('/admin/content/home/discard', {
      method: 'POST',
    })
  }

  async function versions(): Promise<{ items: HomeVersionRow[] }> {
    return adminFetch<{ items: HomeVersionRow[] }>('/admin/content/home/versions')
  }

  async function restore(versionId: string): Promise<AdminHomeState> {
    return adminFetch<AdminHomeState>(
      `/admin/content/home/versions/${encodeURIComponent(versionId)}/restore`,
      { method: 'POST' },
    )
  }

  async function uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return adminFetch<{ url: string }>('/admin/content/images', {
      method: 'POST',
      body: formData,
    })
  }

  /** A Facebook reel link → its plain embeddable address and a saved copy of its picture. */
  async function previewReel(url: string): Promise<{ url: string; image: string | null; title: string | null }> {
    return adminFetch<{ url: string; image: string | null; title: string | null }>(
      '/admin/content/reels/preview',
      { method: 'POST', body: { url } },
    )
  }

  return {
    getHome,
    saveDraft,
    publish,
    discard,
    versions,
    restore,
    uploadImage,
    previewReel,
  }
}
