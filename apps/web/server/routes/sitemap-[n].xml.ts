import { getRouterParam, setHeader } from 'h3'
import { chunkEntries, renderUrlset } from '../utils/sitemap'
import { fetchSitemapEntries } from '../utils/sitemap-source'

export default defineEventHandler(async (event) => {
  const chunkParam = getRouterParam(event, 'n')
  const chunkNumber = Number(chunkParam)
  if (!chunkParam || !Number.isInteger(chunkNumber) || chunkNumber < 1) {
    throw createError({ statusCode: 404, statusMessage: 'Sitemap chunk not found' })
  }

  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')
  const entries = await fetchSitemapEntries()

  const chunk = chunkEntries(entries)[chunkNumber - 1]
  if (!chunk) {
    throw createError({ statusCode: 404, statusMessage: 'Sitemap chunk not found' })
  }

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return renderUrlset(chunk, siteUrl)
})
