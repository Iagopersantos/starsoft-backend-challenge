import { Injectable } from '@nestjs/common';
import { SalesRepository } from './sales.repository';
import { EventService } from '../../shared/services/event.service';
import { Sale } from '../../database/entities/sale.entity';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly eventService: EventService,
  ) {}

  async createSale(createSaleDto: CreateSaleDto): Promise<Sale> {
    // Lógica para criar uma nova venda
    const sale = await this.salesRepository.createSale(createSaleDto);

    // Publicar evento de venda criada
    await this.eventService.publishSaleCreated({
      saleId: sale.id,
      reservationId: createSaleDto.reservationId,
      seatId: createSaleDto.seatId,
      userId: createSaleDto.userId,
      amountPaid: createSaleDto.amount,
      paymentMethod: createSaleDto.paymentMethod || 'defaultPaymentMethod',
    });

    return sale;
  }
}