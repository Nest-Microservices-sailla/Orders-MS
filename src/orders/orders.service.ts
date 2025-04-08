import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/pagination-order-dto';
import { firstValueFrom } from 'rxjs';
import { ChangeOrderStatusDto } from './dto';
import { PRODUCTS_SERVICE } from 'src/config';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersService')

  // Inyectamos en product services
  constructor(
    @Inject(PRODUCTS_SERVICE) private readonly productClient: ClientProxy,
  ) {
    super()
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log(`Postgres Database connected successfully`)
  }

  async create(createOrderDto: CreateOrderDto) {

    try {

      // Confirmar Ids de products
      const productsIds = createOrderDto.items.map(item => item.productId)

      const products: any[] = await firstValueFrom(this.productClient.send({ cmd: 'validateProduct' }, productsIds))

      // Calculos de valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {

        const price = products.find(product => product.id === orderItem.productId).price

        return acc + orderItem.quantity * price

      }, 0)

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity
      }, 0)

      // Transaccion de base de datos
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: products.find(product => product.id === item.productId).price
              }))
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              productId: true,
              quantity: true,
              price: true,
            }
          }
        }
      })

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find(product => product.id === orderItem.productId).name,
        }))

      }

    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Ckeck logs',
      })
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

    const order = await this.order.findFirst(
      {
        where: { id },
        include: {
          OrderItem: {
            select: {
              productId: true,
              quantity: true,
              price: true,
            }
          }
        }
      }
    )
    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Order not found',
      })
    }
    
    const productIds = order.OrderItem.map((orderItem) => orderItem.productId);
    const products: any[] = await firstValueFrom(
      this.productClient.send({ cmd: 'validateProduct' }, productIds),
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: products.find((product) => product.id === orderItem.productId)
          .name,
      })),
    };

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
