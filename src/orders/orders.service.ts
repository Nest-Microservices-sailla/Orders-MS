import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/pagination-order-dto';
import { last } from 'rxjs';
import { ChangeOrderStatusDto } from './dto';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersService')

  async onModuleInit() {
    await this.$connect()
    this.logger.log(`Postgres Database connected successfully`)
  }

  async create(createOrderDto: CreateOrderDto) {

    const data = await this.order.create({ data: createOrderDto })
    return {
      message: 'success',
      data
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {

    const { page = 1, limit = 10 } = orderPaginationDto

    const totalOrders = await this.order.count({
      where: {
        status: orderPaginationDto.status
      }
    })

    const lastPage = Math.ceil(totalOrders / limit)

    return {
      data: await this.order.findMany({
        where: {
          status: orderPaginationDto.status
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      meta: {
        total_orders: totalOrders,
        page: page,
        last_Page: lastPage
      }
    }
  }

  async findOne(id: string) {

    const order = await this.order.findFirst({ where: { id } })
    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Order not found',
      })
    }
    return order
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {

    const { id, status } = changeOrderStatusDto

    const order = await this.findOne(id)

    if (order.status === status) {
      return order
    }
    
    return this.order.update({
      where: { id },
      data: { status }
    })
  }

}
