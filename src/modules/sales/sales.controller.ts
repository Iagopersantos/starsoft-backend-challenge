import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { SalesService } from './sales.service';

@ApiTags('Sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma nova venda' })
  @ApiResponse({ status: 201, description: 'Venda criada com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou erro na criação da venda.',
  })
  async createSale(@Body() createSaleDto: any) {
    return this.salesService.createSale(createSaleDto);
  }
}
