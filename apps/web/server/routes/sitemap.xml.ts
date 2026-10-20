import { setHeader } from 'h3'
import {
  SITEMAP_CHUNK_SIZE,
  chunkEntries,
  renderSitemapIndex,
  renderUrlset,
} from '../utils/sitemap'
import { fetchSitemapEntries } from '../utils/sitemap-source'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')
  const entries = await fetchSitemapEntries()

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  // Too many entries to fit in one file: serve an index pointing at the /sitemap-<n>.xml chunks.
  if (entries.length > SITEMAP_CHUNK_SIZE) {
    const chunks = chunkEntries(entries)
    return renderSitemapIndex(
      chunks.map((_, index) => `${siteUrl}/sitemap-${index + 1}.xml`),
    )
  }

  return renderUrlset(entries, siteUrl)
})
