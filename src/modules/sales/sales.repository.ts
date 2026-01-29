import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Sale } from '../../database/entities/sale.entity';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesRepository extends Repository<Sale> {
  constructor(private readonly dataSource: DataSource) {
    super(Sale, dataSource.createEntityManager());
  }

  async createSale(createSaleDto: CreateSaleDto): Promise<Sale> {
    const sale = this.create(createSaleDto);
    return this.save(sale);
  }
}
