import { setHeader } from 'h3'
import { buildRobotsTxt } from '../utils/robots'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return buildRobotsTxt({
    siteUrl: String(config.public.siteUrl),
    indexable: String(config.public.siteIndexable) === 'true',
  })
})
