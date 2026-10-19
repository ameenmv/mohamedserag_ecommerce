import { Controller, Get, Query } from '@nestjs/common'
import {
  searchQuerySchema,
  type SearchQueryOutput,
  type SearchResponse,
} from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { SearchService } from './search.service.js'

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /api/search?q=&limit=
   * Live search endpoint for header search dropdown (PRD US-2.1).
   * Returns matching products and suggested categories.
   */
  @Get()
  @Public()
  async search(
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQueryOutput,
  ): Promise<SearchResponse> {
    return this.searchService.search(query.q, query.limit)
  }
}
